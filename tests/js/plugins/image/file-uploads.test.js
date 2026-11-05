import { Slice } from '@tiptap/pm/model'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerActionArguments, registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, doc, makeEditor, p } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/image/index'

install({ registerExtension, registerActionArguments })

const uploadLabels = {
    uploading: 'Uploading :name… :percent%',
    upload_failed: 'The upload failed.',
    too_many_files: 'Only the first :count files were added.',
    not_accepted: 'This type of file can\'t be added here.',
    too_large: 'The file is larger than :size.',
    place_lost: 'The file was saved, but the place it was going in the text was deleted.',
}

const imageOptions = { widths: ['100'], defaultWidth: '100', defaultAlignment: 'center', altRequired: true, uploads: { accept: ['image/png'], maxSize: 1 }, labels: {}, uploadLabels }
const attachmentOptions = { uploads: { accept: ['application/pdf'], maxSize: 10240 }, labels: {}, uploadLabels }

let editor
let sent
let stored

beforeEach(() => {
    sent = []
    stored = 0
    window.FilamentNotification = class {
        title(value) { this.t = value; return this }
        body(value) { this.b = value; return this }
        danger() { return this }
        send() { sent.push({ title: this.t, body: this.b }) }
    }
})

afterEach(() => {
    editor?.destroy()
    delete window.FilamentNotification
})

const deferred = () => {
    let resolve
    const promise = new Promise((done) => { resolve = done })

    return { promise, resolve }
}

const makeContext = ({ answer, upload } = {}) => ({
    upload: vi.fn(upload ?? (async (file, { onProgress } = {}) => {
        onProgress?.(42)

        return `key-${file.name}`
    })),
    callPlugin: vi.fn(async (plugin, request, payload) => {
        if (request !== 'store') {
            return { urls: {} }
        }

        if (answer) {
            return answer(plugin, payload)
        }

        stored++

        return plugin === 'webwizardsusa/image'
            ? { disk: 'media', path: `editor-images/${stored}.png`, name: 'x.png', size: 10, mime: 'image/png', url: `https://files.test/${stored}.png` }
            : { disk: 'media', path: `editor-attachments/${stored}.pdf`, name: 'Q3.pdf', size: 2048, mime: 'application/pdf' }
    }),
    runAction: vi.fn(),
})

const withAccept = (options, accept) => (accept ? { ...options, uploads: { ...options.uploads, accept } } : options)

const make = (context, { withAttachments = true, content = doc(p('ab')), imageAccept = null, attachmentAccept = null } = {}) => {
    editor = makeEditor(content, [
        ...defaultPluginIds,
        { id: 'webwizardsusa/image', options: withAccept(imageOptions, imageAccept) },
        ...(withAttachments ? [{ id: 'webwizardsusa/attachment', options: withAccept(attachmentOptions, attachmentAccept) }] : []),
    ], context)
    editor.commands.setTextSelection(2)

    return context
}

const png = (name = 'a.png', bytes = 10) => new File(['x'.repeat(bytes)], name, { type: 'image/png' })
const pdf = (name = 'Q3.pdf') => new File(['%PDF'], name, { type: 'application/pdf' })

const paste = (files, types = ['Files']) => {
    const event = { clipboardData: { files, types, getData: () => '' }, preventDefault: vi.fn() }

    return { handled: editor.view.someProp('handlePaste', (handler) => handler(editor.view, event, Slice.empty)) ?? false, event }
}

const drop = (files, moved = false) => {
    const event = { dataTransfer: { files }, clientX: 0, clientY: 0, preventDefault: vi.fn() }

    return editor.view.someProp('handleDrop', (handler) => handler(editor.view, event, Slice.empty, moved)) ?? false
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const settleAll = async () => { for (let i = 0; i < 10; i++) { await settle() } }
const types = () => editor.getJSON().content.map(({ type }) => type)

describe('routing', () => {
    it('sends an image to the image plugin and opens its modal', async () => {
        const context = make(makeContext())

        expect(paste([png()]).handled).toBe(true)
        await settleAll()

        expect(context.callPlugin).toHaveBeenCalledWith('webwizardsusa/image', 'store', { key: 'key-a.png' })
        const image = editor.getJSON().content.find(({ type }) => type === 'image')
        expect(image.attrs).toMatchObject({ disk: 'media', path: 'editor-images/1.png', alt: '' })
        expect(editor.state.selection.node?.type.name).toBe('image')
        expect(context.runAction).toHaveBeenCalledWith('image')
        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://files.test/1.png')
    })

    it('sends a PDF to the attachment plugin', async () => {
        const context = make(makeContext())

        drop([pdf()])
        await settleAll()

        expect(context.callPlugin).toHaveBeenCalledWith('webwizardsusa/attachment', 'store', { key: 'key-Q3.pdf' })
        expect(editor.getJSON().content.find(({ type }) => type === 'attachment').attrs).toEqual({ disk: 'media', path: 'editor-attachments/1.pdf', name: 'Q3.pdf', size: 2048, mime: 'application/pdf' })
        expect(context.runAction).not.toHaveBeenCalled()
    })

    it('uploads a mixed drop in order, one after another, without opening a modal for several images', async () => {
        let active = 0
        let most = 0
        const context = make(makeContext({
            upload: async (file) => {
                active++
                most = Math.max(most, active)
                await settle()
                active--

                return `key-${file.name}`
            },
        }))

        drop([png('a.png'), pdf(), png('b.png')])
        await settleAll()

        expect(most).toBe(1)
        expect(context.upload.mock.calls.map(([file]) => file.name)).toEqual(['a.png', 'Q3.pdf', 'b.png'])
        expect(types().filter((type) => type !== 'paragraph')).toEqual(['image', 'attachment', 'image'])
        expect(context.runAction).not.toHaveBeenCalled()
        expect(editor.view.dom.querySelectorAll('.rep-image-badge')).toHaveLength(2)
    })

    it('refuses an unaccepted type or a file over the size, with a notice, without uploading', async () => {
        const context = make(makeContext())

        drop([new File(['x'], 'run.exe', { type: 'application/x-msdownload' }), png('big.png', 2000)])
        await settleAll()

        expect(context.upload).not.toHaveBeenCalled()
        expect(sent.map(({ title }) => title)).toEqual(['run.exe', 'big.png'])
        expect(sent[1].body).toBe('The file is larger than 1 KB.')
    })

    it('knows the other names browsers give a type', async () => {
        const context = make(makeContext(), { imageAccept: ['image/jpeg'], attachmentAccept: ['application/zip', 'text/csv'] })

        drop([
            new File(['PK'], 'site.zip', { type: 'application/x-zip-compressed' }),
            new File(['PK'], 'old.zip', { type: 'application/x-zip' }),
            new File(['a,b'], 'a.csv', { type: 'text/x-csv' }),
            new File(['a,b'], 'b.csv', { type: 'application/csv' }),
            new File(['x'], 'cat.jpg', { type: 'image/jpg' }),
            new File(['x'], 'dog.jpg', { type: 'image/pjpeg' }),
        ])
        await settleAll()

        expect(context.callPlugin.mock.calls.filter(([, request]) => request === 'store').map(([plugin, , { key }]) => [plugin, key])).toEqual([
            ['webwizardsusa/attachment', 'key-site.zip'],
            ['webwizardsusa/attachment', 'key-old.zip'],
            ['webwizardsusa/attachment', 'key-a.csv'],
            ['webwizardsusa/attachment', 'key-b.csv'],
            ['webwizardsusa/image', 'key-cat.jpg'],
            ['webwizardsusa/image', 'key-dog.jpg'],
        ])
        expect(sent).toEqual([])
    })

    it('takes a type/* wildcard as accepting every type of that kind', async () => {
        const context = make(makeContext(), { imageAccept: ['image/*'] })

        drop([new File(['x'], 'cat.webp', { type: 'image/webp' })])
        await settleAll()

        expect(context.callPlugin).toHaveBeenCalledWith('webwizardsusa/image', 'store', { key: 'key-cat.webp' })
        expect(sent).toEqual([])
    })

    it('never sends an SVG to the image plugin through a wildcard', async () => {
        const context = make(makeContext(), { imageAccept: ['image/*'], withAttachments: false })

        drop([new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })])
        await settleAll()

        expect(context.upload).not.toHaveBeenCalled()
    })

    it('sends an SVG to the image plugin when it accepts image/svg+xml by name', async () => {
        const context = make(makeContext(), { imageAccept: ['image/*', 'image/svg+xml'] })

        drop([new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })])
        await settleAll()

        expect(context.callPlugin).toHaveBeenCalledWith('webwizardsusa/image', 'store', { key: 'key-logo.svg' })
    })

    it('sends a file the browser has no type for to the attachment plugin, which decides', async () => {
        const context = make(makeContext())

        drop([new File(['x'], 'notes', { type: '' })])
        await settleAll()

        expect(context.callPlugin).toHaveBeenCalledWith('webwizardsusa/attachment', 'store', { key: 'key-notes' })
        expect(sent).toEqual([])
    })

    it('refuses a file with no type when the field has no attachment plugin', async () => {
        const context = make(makeContext(), { withAttachments: false })

        drop([new File(['x'], 'notes', { type: '' })])
        await settleAll()

        expect(context.upload).not.toHaveBeenCalled()
        expect(sent).toHaveLength(1)
    })

    it('refuses a PDF when the field has no attachment plugin', async () => {
        const context = make(makeContext(), { withAttachments: false })

        drop([pdf()])
        await settleAll()

        expect(context.upload).not.toHaveBeenCalled()
        expect(sent).toHaveLength(1)
    })

    it('adds the first 10 files and says the rest were skipped', async () => {
        const context = make(makeContext())

        drop(Array.from({ length: 12 }, (_, index) => pdf(`${index}.pdf`)))
        await settleAll()

        expect(context.upload).toHaveBeenCalledTimes(10)
        expect(sent.map(({ body }) => body)).toContain('Only the first 10 files were added.')
    })
})

describe('holding the form', () => {
    it('keeps the form from saving until every file is stored and in the document', async () => {
        const log = []
        const context = make({
            ...makeContext(),
            processing: vi.fn((batch) => {
                log.push('started')

                return batch.finally(() => log.push(`finished with ${types().filter((type) => type === 'attachment').length} files in`))
            }),
        })

        drop([pdf('a.pdf'), pdf('b.pdf')])
        await settleAll()

        expect(context.processing).toHaveBeenCalledTimes(1)
        expect(log).toEqual(['started', 'finished with 2 files in'])
    })
})

describe('what is left alone', () => {
    it('leaves a paste with HTML to the normal paste', () => {
        const context = make(makeContext())

        expect(paste([png()], ['text/html', 'Files']).handled).toBe(false)
        expect(context.upload).not.toHaveBeenCalled()
    })

    it('leaves a drag within the editor alone', () => {
        const context = make(makeContext())

        expect(drop([png()], true)).toBe(false)
        expect(context.upload).not.toHaveBeenCalled()
    })

    it('leaves a non-editable editor alone', () => {
        const context = make(makeContext())
        editor.setEditable(false)

        expect(paste([png()]).handled).toBe(false)
        expect(drop([png()])).toBe(false)
        expect(context.upload).not.toHaveBeenCalled()
    })

    it('leaves a paste without files alone', () => {
        make(makeContext())

        expect(paste([], ['text/plain']).handled).toBe(false)
    })
})

describe('the placeholder', () => {
    it('shows progress, is not in the HTML, and goes when the file is in', async () => {
        const upload = deferred()
        make(makeContext({
            upload: (file, { onProgress }) => {
                onProgress(42)

                return upload.promise
            },
        }))

        drop([pdf()])
        await settle()

        expect(editor.view.dom.querySelector('.rep-upload-placeholder').textContent).toBe('Uploading Q3.pdf… 42%')
        expect(editor.getHTML()).not.toContain('Uploading')

        upload.resolve('key-1')
        await settleAll()

        expect(editor.view.dom.querySelector('.rep-upload-placeholder')).toBeNull()
        expect(types()).toContain('attachment')
    })

    it('puts the file where its placeholder moved to', async () => {
        const upload = deferred()
        make(makeContext({ upload: () => upload.promise }), { content: doc(p('ab'), p('cd')) })
        editor.commands.setTextSelection(6)

        paste([pdf()])
        await settle()

        editor.commands.insertContentAt(0, { type: 'paragraph', content: [{ type: 'text', text: 'typed first' }] })
        upload.resolve('key-1')
        await settleAll()

        expect(editor.getJSON().content.map(({ type, content }) => (type === 'paragraph' ? content?.[0]?.text : type)))
            .toEqual(['typed first', 'ab', 'c', 'attachment', 'd'])
    })

    it('removes the placeholder and gives a notice when the upload fails', async () => {
        make(makeContext({ upload: async () => { throw new Error('offline') } }))

        drop([pdf()])
        await settleAll()

        expect(editor.view.dom.querySelector('.rep-upload-placeholder')).toBeNull()
        expect(types()).not.toContain('attachment')
        expect(sent).toEqual([{ title: 'Q3.pdf', body: 'The upload failed.' }])
    })

    it('gives the server\'s reason when it refuses the file', async () => {
        make(makeContext({ answer: () => ({ error: 'This type of file can\'t be added here.' }) }))

        drop([pdf()])
        await settleAll()

        expect(types()).not.toContain('attachment')
        expect(sent).toEqual([{ title: 'Q3.pdf', body: 'This type of file can\'t be added here.' }])
    })

    it('treats an empty answer as a failed upload', async () => {
        make(makeContext({ answer: () => ({}) }))

        drop([pdf()])
        await settleAll()

        expect(sent).toEqual([{ title: 'Q3.pdf', body: 'The upload failed.' }])
    })

    it('leaves the caret where the user put it', async () => {
        const upload = deferred()
        make(makeContext({ upload: () => upload.promise }), { content: doc(p('ab'), p('cd')) })

        drop([pdf()])
        await settle()
        editor.commands.setTextSelection(7)
        upload.resolve('key-1')
        await settleAll()

        expect(types()).toContain('attachment')
        expect(editor.state.selection.empty).toBe(true)
        expect(editor.state.selection.$from.parent.textContent).toBe('cd')
    })

    it('says so when the content around the placeholder is gone', async () => {
        const upload = deferred()
        make(makeContext({ upload: () => upload.promise }))

        drop([pdf()])
        await settle()
        editor.commands.clearContent()
        upload.resolve('key-1')
        await settleAll()

        expect(types()).not.toContain('attachment')
        expect(sent).toEqual([{ title: 'Q3.pdf', body: 'The file was saved, but the place it was going in the text was deleted.' }])
    })

    it('stops uploading when the editor is destroyed mid-batch', async () => {
        const upload = deferred()
        const context = make(makeContext({ upload: () => upload.promise }))

        drop([pdf('a.pdf'), pdf('b.pdf')])
        await settle()
        editor.destroy()
        upload.resolve('key-1')
        await settleAll()

        expect(context.upload).toHaveBeenCalledTimes(1)
    })
})

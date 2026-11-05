import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerActionArguments, registerExtension, resolveActionArguments } from '../../../../resources/js/registry'
import { defaultPluginIds, doc, makeEditor, p } from '../../support/make-editor'
import { formatFileSize } from '../../../../resources/js/plugins/image/attachment'
import install from '../../../../resources/js/plugins/image/index'

install({ registerExtension, registerActionArguments })

let editor
let answer = { urls: {} }
const context = { callPlugin: vi.fn(() => Promise.resolve(answer)) }
const options = { uploads: { accept: ['application/pdf'], maxSize: 10240 }, labels: { open: 'Open', loading: 'Loading…', missing: 'File missing' } }

const make = (content) => {
    editor = makeEditor(content, [...defaultPluginIds, { id: 'webwizardsusa/attachment', options }], context)
}

const card = (attrs = {}) => ({ type: 'attachment', attrs: { disk: 'media', path: 'editor-attachments/a.pdf', name: 'a.pdf', size: 2048, mime: 'application/pdf', ...attrs } })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
    editor?.destroy()
    context.callPlugin.mockClear()
    answer = { urls: {} }
})

it('formats sizes as PHP does', () => {
    expect([0, 1023, 1024, 1536, 10137, 10240, 482133, 1048576, 12582912, 1073741824].map(formatFileSize))
        .toEqual(['0 B', '1023 B', '1 KB', '1.5 KB', '9.9 KB', '10 KB', '471 KB', '1 MB', '12 MB', '1 GB'])
})

describe('the attachment node', () => {
    it('inserts and updates an attachment, keeping only valid attributes', () => {
        make(doc(p('a')))
        editor.commands.setTextSelection(2)

        expect(editor.commands.insertAttachment({ disk: 'media', path: 'editor-attachments/a.pdf', name: ' a/b.pdf ', size: '12 KB', mime: 'text/html; x', href: 'https://evil.test' })).toBe(true)

        const node = editor.getJSON().content.find(({ type }) => type === 'attachment')
        expect(node.attrs).toEqual({ disk: 'media', path: 'editor-attachments/a.pdf', name: 'ab.pdf', size: null, mime: null })

        editor.commands.setNodeSelection(3)
        expect(editor.commands.updateAttachment({ name: 'Renamed.pdf' })).toBe(true)
        expect(editor.getJSON().content.find(({ type }) => type === 'attachment').attrs.name).toBe('Renamed.pdf')
    })

    it('updates only a selected attachment', () => {
        make(doc(p('a')))

        expect(editor.commands.updateAttachment({ name: 'x' })).toBe(false)
    })

    it('writes no href, even after its URL is shown', async () => {
        answer = { urls: { 'editor-attachments/a.pdf': 'https://files.test/a.pdf' } }
        make(doc(card()))

        await flush()

        expect(editor.getHTML()).not.toContain('href')
    })
})

describe('the attachment card in the editor', () => {
    it('shows the name, the size and an Open link once its URL arrives', async () => {
        answer = { urls: { 'editor-attachments/a.pdf': 'https://files.test/a.pdf' } }
        make(doc(card()))

        expect(editor.view.dom.querySelector('.rep-attachment').textContent).toContain('Loading…')

        await flush()

        const view = editor.view.dom.querySelector('.rep-attachment')
        expect(context.callPlugin).toHaveBeenCalledWith('webwizardsusa/attachment', 'urls', { paths: ['editor-attachments/a.pdf'] })
        expect(view.textContent).toContain('a.pdf')
        expect(view.textContent).toContain('2 KB')
        expect(view.dataset.mime).toBe('application/pdf')
        expect(view.querySelector('a.rep-attachment-open').getAttribute('href')).toBe('https://files.test/a.pdf')
        expect(view.querySelector('a.rep-attachment-open').textContent).toBe('Open')
    })

    it('shows File missing when the field has no URL', async () => {
        make(doc(card()))

        await flush()

        expect(editor.view.dom.querySelector('.rep-attachment').textContent).toContain('File missing')
        expect(editor.view.dom.querySelector('a.rep-attachment-open')).toBeNull()
    })

    it('has its upload route in the editor storage', () => {
        make(doc(p('a')))

        expect(editor.storage.attachment.uploadRoute).toEqual({ plugin: 'webwizardsusa/attachment', kind: 'attachment', accept: ['application/pdf'], maxSize: 10240 })
    })
})

it('passes the selected attachment to the modal for editing', () => {
    make(doc(p('a'), card()))
    editor.commands.setNodeSelection(3)

    expect(resolveActionArguments('attachment', editor)).toEqual({ editing: true, disk: 'media', path: 'editor-attachments/a.pdf', name: 'a.pdf', size: 2048, mime: 'application/pdf' })

    editor.commands.setTextSelection(1)
    expect(resolveActionArguments('attachment', editor)).toEqual({})
})

it('deletes a selected attachment with Backspace', () => {
    make(doc(p('a'), card()))
    editor.commands.setNodeSelection(3)

    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }))

    expect(editor.getJSON().content.some(({ type }) => type === 'attachment')).toBe(false)
})

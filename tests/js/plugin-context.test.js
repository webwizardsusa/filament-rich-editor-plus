import { describe, expect, it, vi } from 'vitest'
import { createPluginContext } from '../../resources/js/plugin-context'
import { registerActionArguments } from '../../resources/js/registry'

const setUp = ({ upload } = {}) => {
    const form = document.createElement('form')
    const root = document.createElement('div')
    form.append(root)
    document.body.append(form)

    const events = []
    ;['form-processing-started', 'form-processing-finished'].forEach((name) => form.addEventListener(name, (event) => events.push([name, event.detail])))

    const wire = {
        callSchemaComponentMethod: vi.fn(() => Promise.resolve({ ok: true })),
        upload: vi.fn(upload ?? ((name, file, finish, error, progress) => {
            progress({ detail: { progress: 42 } })
            finish()
        })),
    }
    const mountAction = vi.fn()
    const editor = { id: 'editor' }

    const context = createPluginContext({
        wire,
        key: 'form.content',
        statePath: 'data.content',
        root,
        uploadingMessage: 'Uploading file…',
        getEditor: () => editor,
        mountAction,
    })

    return { context, wire, events, mountAction, editor }
}

describe('the plugin context', () => {
    it('calls the field for plugin requests', async () => {
        const { context, wire } = setUp()

        await expect(context.callPlugin('webwizardsusa/image', 'urls', { paths: ['a'] })).resolves.toEqual({ ok: true })
        expect(wire.callSchemaComponentMethod).toHaveBeenCalledWith('form.content', 'answerPluginRequestForJs', { plugin: 'webwizardsusa/image', request: 'urls', payload: { paths: ['a'] } })
    })

    it('uploads to the field\'s attachments, reports progress, and resolves the key', async () => {
        const { context, wire, events } = setUp()
        const onProgress = vi.fn()
        const file = new File(['x'], 'a.png', { type: 'image/png' })

        const key = await context.upload(file, { onProgress })

        expect(key).toMatch(/^[A-Za-z0-9-]{1,64}$/)
        expect(wire.upload.mock.calls[0][0]).toBe(`componentFileAttachments.data.content.${key}`)
        expect(wire.upload.mock.calls[0][1]).toBe(file)
        expect(onProgress).toHaveBeenCalledWith(42)
        expect(events).toEqual([
            ['form-processing-started', { message: 'Uploading file…' }],
            ['form-processing-finished', null],
        ])
    })

    it('rejects when the upload fails, and still finishes processing', async () => {
        const { context, events } = setUp({ upload: (name, file, finish, error) => error() })

        await expect(context.upload(new File(['x'], 'a.png'))).rejects.toThrow()
        expect(events.map(([name]) => name)).toEqual(['form-processing-started', 'form-processing-finished'])
    })

    it('rejects when the upload is cancelled', async () => {
        const { context } = setUp({ upload: (name, file, finish, error, progress, cancelled) => cancelled() })

        await expect(context.upload(new File(['x'], 'a.png'))).rejects.toThrow()
    })

    it('holds the form until a promise settles, and gives back its result', async () => {
        const { context, events } = setUp()
        let resolve
        const work = new Promise((done) => { resolve = done })

        const held = context.processing(work)
        await Promise.resolve()

        expect(events).toEqual([['form-processing-started', { message: 'Uploading file…' }]])

        resolve('done')

        await expect(held).resolves.toBe('done')
        expect(events.map(([name]) => name)).toEqual(['form-processing-started', 'form-processing-finished'])
    })

    it('finishes processing when the held promise rejects', async () => {
        const { context, events } = setUp()

        await expect(context.processing(Promise.reject(new Error('nope')))).rejects.toThrow('nope')
        expect(events.map(([name]) => name)).toEqual(['form-processing-started', 'form-processing-finished'])
    })

    it('runs an action with the arguments registered for it', () => {
        registerActionArguments('test-context-action', (editor) => ({ from: editor.id }))
        const { context, mountAction } = setUp()

        context.runAction('test-context-action')

        expect(mountAction).toHaveBeenCalledWith('test-context-action', { from: 'editor' })
    })
})

it('sends its own message when given one', async () => {
    const { context, events } = setUp()

    await context.processing(Promise.resolve(), 'Converting Markdown…')

    expect(events).toEqual([
        ['form-processing-started', { message: 'Converting Markdown…' }],
        ['form-processing-finished', null],
    ])
})

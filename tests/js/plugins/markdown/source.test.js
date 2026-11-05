import { closeHistory } from '@tiptap/pm/history'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, doc, makeEditor, p } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/markdown/index'

install({ registerExtension, registerActionArguments: () => {} })

let editor
const answers = []

const context = {
    callPlugin: vi.fn((plugin, request, payload) => Promise.resolve(answers.shift()?.(payload) ?? {})),
    processing: vi.fn((promise) => promise),
}

const labels = { done: 'Done', source: 'Markdown source', converting: 'Converting Markdown…', convertFailed: 'Could not convert.' }
const make = (content) => makeEditor(content, [...defaultPluginIds, { id: 'hollyit/markdown', options: { paste: false, source: true, labels } }], context)
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const paragraphDoc = (text) => ({ document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } })
const textarea = () => editor.view.dom.parentElement.querySelector('textarea.rep-markdown-source')

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
    editor?.destroy()
    answers.length = 0
    vi.clearAllMocks()
    vi.useRealTimers()
})

const enter = async () => {
    editor.commands.toggleMarkdownSource()
    await flush()
}

const type = (value) => {
    textarea().value = value
    textarea().dispatchEvent(new Event('input'))
}

describe('the Markdown source view', () => {
    it('shows the Markdown in place of the editor, read-only behind it', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }))

        await enter()

        expect(context.callPlugin).toHaveBeenCalledWith('hollyit/markdown', 'toMarkdown', { document: editor.getJSON() })
        expect(textarea().value).toBe('hello\n')
        expect(editor.view.dom.hidden).toBe(true)
        expect(editor.isEditable).toBe(false)
        expect(editor.storage.markdownSource.isActive).toBe(true)
    })

    it('converts typing after a pause and keeps the state current', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }), () => paragraphDoc('changed'))
        await enter()
        const updates = vi.fn()
        editor.on('update', updates)
        type('changed')
        await vi.advanceTimersByTimeAsync(399)
        expect(context.callPlugin).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(1)
        await flush()

        expect(context.callPlugin).toHaveBeenLastCalledWith('hollyit/markdown', 'toDocument', { markdown: 'changed' })
        expect(editor.getText()).toBe('changed')
        expect(updates).toHaveBeenCalled()
    })

    it('holds the form from the first keystroke until the conversion lands', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }), () => paragraphDoc('typed'))

        await enter()
        context.processing.mockClear()
        type('typed')

        expect(context.processing).toHaveBeenCalledTimes(1)
        const held = context.processing.mock.calls[0][0]
        let settled = false
        held.then(() => (settled = true))

        await vi.advanceTimersByTimeAsync(400)
        await flush()

        expect(settled).toBe(true)
    })

    it('ignores answers older than the latest request', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }))
        await enter()

        let releaseOld
        context.callPlugin.mockImplementationOnce(() => new Promise((resolve) => (releaseOld = () => resolve(paragraphDoc('old')))))
        type('old')
        await vi.advanceTimersByTimeAsync(400)

        answers.push(() => paragraphDoc('new'))
        type('new')
        await vi.advanceTimersByTimeAsync(400)
        await flush()
        releaseOld()
        await flush()

        expect(editor.getText()).toBe('new')
    })

    it('returns to the editor, and Undo walks back to before the switch', async () => {
        editor = make(doc(p('before')))
        editor.commands.insertContentAt(1, 'x')
        editor.view.dispatch(closeHistory(editor.state.tr))
        answers.push(() => ({ markdown: 'xbefore\n' }), () => paragraphDoc('after'))

        await enter()
        type('after')
        editor.commands.toggleMarkdownSource()
        await vi.advanceTimersByTimeAsync(0)
        await flush()

        expect(textarea()).toBeNull()
        expect(editor.view.dom.hidden).toBe(false)
        expect(editor.isEditable).toBe(true)
        expect(editor.storage.markdownSource.isActive).toBe(false)
        expect(editor.getText()).toBe('after')

        editor.commands.undo()
        expect(editor.getText()).toBe('xbefore')
        editor.commands.undo()
        expect(editor.getText()).toBe('before')
    })

    it('makes no change when leaving without edits', async () => {
        editor = make(doc(p('same')))
        answers.push(() => ({ markdown: 'same\n' }))

        await enter()
        editor.commands.toggleMarkdownSource()
        await flush()

        expect(context.callPlugin).toHaveBeenCalledTimes(1)
        expect(editor.can().undo()).toBe(false)
    })

    it('stays in the editor when the Markdown cannot be produced', async () => {
        editor = make(doc(p('x')))
        answers.push(() => ({ error: 'nope' }))

        await enter()

        expect(textarea()).toBeNull()
        expect(editor.isEditable).toBe(true)
    })

    it('does not open on a read-only editor', async () => {
        editor = make(doc(p('x')))
        editor.setEditable(false)

        await enter()

        expect(context.callPlugin).not.toHaveBeenCalled()
    })

    it('leaves the source view from the Done button', async () => {
        editor = make(doc(p('same')))
        answers.push(() => ({ markdown: 'same\n' }))
        await enter()

        editor.view.dom.parentElement.querySelector('.rep-markdown-source-bar button').click()
        await flush()

        expect(textarea()).toBeNull()
        expect(editor.view.dom.parentElement.querySelector('.rep-markdown-source-bar')).toBeNull()
        expect(editor.isEditable).toBe(true)
    })

    it('stays in the source view, keeping the Markdown, when the final conversion fails', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }), () => ({ error: 'bad' }))
        await enter()
        type('broken')

        editor.commands.toggleMarkdownSource()
        await flush()
        await flush()

        expect(textarea().value).toBe('broken')
        expect(textarea().readOnly).toBe(false)
        expect(editor.isEditable).toBe(false)
        expect(editor.getText()).toBe('hello')
    })

    it('ignores a second toggle while leaving', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }), () => paragraphDoc('typed'))
        await enter()
        type('typed')

        editor.commands.toggleMarkdownSource()
        editor.commands.toggleMarkdownSource()
        await flush()
        await flush()

        expect(context.callPlugin).toHaveBeenCalledTimes(2)
        expect(textarea()).toBeNull()
    })

    it('refreshes the textarea when the document changes from outside', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }), () => ({ markdown: 'outside\n' }))
        await enter()

        editor.view.dispatch(editor.state.tr.insertText('outside', 1, 6))
        await flush()

        expect(textarea().value).toBe('outside\n')
        expect(context.callPlugin).toHaveBeenLastCalledWith('hollyit/markdown', 'toMarkdown', { document: editor.getJSON() })
    })

    it('drops a slow refresh that was asked for before the user typed', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }))
        await enter()

        let releaseRefresh
        context.callPlugin.mockImplementationOnce(() => new Promise((resolve) => (releaseRefresh = () => resolve({ markdown: 'outside\n' }))))
        editor.view.dispatch(editor.state.tr.insertText('outside', 1, 6))
        await flush()

        answers.push(() => paragraphDoc('mine'))
        type('mine')
        await vi.advanceTimersByTimeAsync(400)
        await flush()
        releaseRefresh()
        await flush()

        expect(textarea().value).toBe('mine')
        expect(editor.getText()).toBe('mine')
    })

    it('leaves the textarea alone on an outside change while typing is pending', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }))
        await enter()
        type('mine')

        editor.view.dispatch(editor.state.tr.insertText('outside', 1, 6))
        await flush()

        expect(textarea().value).toBe('mine')
        expect(context.callPlugin).toHaveBeenCalledTimes(1)
    })

    it('finishes the hold exactly once when leaving during a pending pause', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }), () => paragraphDoc('typed'))
        await enter()
        context.processing.mockClear()
        type('typed')
        const held = context.processing.mock.calls[0][0]
        const finished = vi.fn()
        held.then(finished)

        editor.commands.toggleMarkdownSource()
        await flush()
        await flush()

        expect(context.processing).toHaveBeenCalledTimes(1)
        expect(finished).toHaveBeenCalledTimes(1)
        expect(editor.getText()).toBe('typed')
    })

    it('releases the hold when destroyed mid-session', async () => {
        editor = make(doc(p('hello')))
        answers.push(() => ({ markdown: 'hello\n' }))
        await enter()
        context.processing.mockClear()
        type('typed')
        const finished = vi.fn()
        context.processing.mock.calls[0][0].then(finished)

        editor.destroy()
        await flush()

        expect(finished).toHaveBeenCalledTimes(1)
        expect(document.querySelector('.rep-markdown-source-bar')).toBeNull()
    })
})

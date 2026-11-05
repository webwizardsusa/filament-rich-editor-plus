import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, doc, makeEditor, p } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/markdown/index'

install({ registerExtension, registerActionArguments: () => {} })

let editor
let resolveRequest
let rejectRequest

const context = {
    callPlugin: vi.fn(() => new Promise((resolve, reject) => {
        resolveRequest = resolve
        rejectRequest = reject
    })),
    processing: vi.fn((promise) => promise),
}

const labels = { converting: 'Converting Markdown…', pasteFailed: 'Pasted as plain text.' }
const make = (content, options = {}) => makeEditor(content, [...defaultPluginIds, { id: 'hollyit/markdown', options: { paste: true, source: false, labels, ...options } }], context)

const paste = (text, { html = '', types = ['text/plain'] } = {}) => {
    const event = {
        clipboardData: {
            getData: (type) => (type === 'text/plain' ? text : type === 'text/html' ? html : ''),
            types: html ? [...types, 'text/html'] : types,
            files: [],
        },
        preventDefault: vi.fn(),
    }
    let handled = false
    editor.view.someProp('handlePaste', (handler) => {
        handled = handler(editor.view, event, null) || handled

        return handled
    })

    return handled
}

const heading = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] }] }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
    editor?.destroy()
    vi.clearAllMocks()
})

describe('pasting Markdown', () => {
    it('converts it on the server and puts the result where it was pasted', async () => {
        editor = make(doc(p('before'), p('after')))
        editor.commands.setTextSelection(editor.state.doc.child(0).nodeSize)

        expect(paste('## Title')).toBe(true)
        expect(context.callPlugin).toHaveBeenCalledWith('hollyit/markdown', 'toDocument', { markdown: '## Title' })
        expect(context.processing).toHaveBeenCalledWith(expect.any(Promise), 'Converting Markdown…')

        resolveRequest({ document: heading })
        await flush()

        expect(editor.getJSON().content.map((node) => node.type)).toContain('heading')
        expect(editor.getText()).toContain('Title')
    })

    it('leaves HTML, prose, code blocks and Shift pastes alone', () => {
        editor = make(doc(p('x')))

        expect(paste('# Title', { html: '<h1>Title</h1>' })).toBe(false)
        expect(paste('Just prose.')).toBe(false)

        editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, shiftKey: true })))
        expect(paste('# Title')).toBe(false)

        editor.commands.setContent({ type: 'doc', content: [{ type: 'codeBlock', content: [{ type: 'text', text: 'code' }] }] })
        editor.commands.setTextSelection(2)
        expect(paste('# Title')).toBe(false)

        expect(context.callPlugin).not.toHaveBeenCalled()
    })

    it('converts HTML from a code editor', () => {
        editor = make(doc(p('x')))

        expect(paste('# Title', { html: '<div>code</div>', types: ['text/plain', 'vscode-editor-data'] })).toBe(true)
    })

    it('follows edits made while converting', async () => {
        editor = make(doc(p('ab')))
        editor.commands.setTextSelection(2)

        paste('**x**')
        editor.commands.insertContentAt(1, 'zz')

        resolveRequest({ document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'bold' }] }] }] } })
        await flush()

        expect(editor.getText()).toBe('zzaxb')
    })

    it('pastes plain text when conversion fails', async () => {
        editor = make(doc({ type: 'paragraph' }))
        editor.commands.setTextSelection(1)

        paste('# Title')
        rejectRequest(new Error('offline'))
        await flush()

        expect(editor.getText()).toBe('# Title')
    })

    it('does nothing when turned off', () => {
        editor = make(doc(p('x')), { paste: false })

        expect(paste('# Title')).toBe(false)
    })
})

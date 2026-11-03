import { afterEach, expect, it } from 'vitest'
import { defaultPluginIds, doc, makeEditor } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const codeBlock = { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'x' }] }

it('adds an empty paragraph after a final code block', () => {
    editor = makeEditor(doc(codeBlock), [...defaultPluginIds, 'core/trailing-node'])
    editor.commands.insertContentAt(2, 'y')

    expect(editor.getJSON().content.at(-1)).toEqual({ type: 'paragraph' })
})

it('adds nothing without the plugin', () => {
    editor = makeEditor(doc(codeBlock))
    editor.commands.insertContentAt(2, 'y')

    expect(editor.getJSON().content.at(-1).type).toBe('codeBlock')
})

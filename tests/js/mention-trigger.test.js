import { PluginKey } from '@tiptap/pm/state'
import { Suggestion } from '@tiptap/suggestion'
import { afterEach, expect, it } from 'vitest'
import { makeEditor } from './support/make-editor'

const key = new PluginKey('triggerProbe')
const allowedPrefixes = [' ', '(', '[', '{', '"', "'"]

let editor

afterEach(() => editor?.destroy())

function probe(char) {
    editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] })
    editor.registerPlugin(Suggestion({ pluginKey: key, editor, char, allowedPrefixes }))
    editor.commands.setTextSelection(1)
}

const state = () => key.getState(editor.state)

it('matches a two-character trigger and reads the query after it', () => {
    probe('[[')

    editor.commands.insertContent('[[ada')

    expect(state().active).toBe(true)
    expect(state().query).toBe('ada')
    expect(state().range).toEqual({ from: 1, to: 6 })
})

it('matches a two-character trigger after other text', () => {
    probe('[[')

    editor.commands.insertContent('see [[ada')

    expect(state().active).toBe(true)
    expect(state().query).toBe('ada')
})

it('does not match half of a two-character trigger', () => {
    probe('[[')

    editor.commands.insertContent('[ada')

    expect(state().active).toBe(false)
})

it('leaves an email address alone', () => {
    probe('@')

    editor.commands.insertContent('ada@example.com')

    expect(state().active).toBe(false)
})

it('opens after an opening bracket', () => {
    probe('@')

    editor.commands.insertContent('(@ada')

    expect(state().active).toBe(true)
})

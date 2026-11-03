import { afterEach, expect, it } from 'vitest'
import { defaultPluginIds, makeEditor } from './support/make-editor'

const pluginIds = [...defaultPluginIds, 'core/link', 'core/code', 'core/subscript', 'core/superscript']

let editor

afterEach(() => editor?.destroy())

const marksOfFirstText = () => editor.getJSON().content[0].content[0].marks

it('keeps inline code free of other marks', () => {
    editor = makeEditor('<p><code><strong>x</strong></code></p>', pluginIds)
    expect(marksOfFirstText()).toEqual([{ type: 'code' }])

    editor.destroy()
    editor = makeEditor('<p><code><a href="https://example.com">x</a></code></p>', pluginIds)
    expect(marksOfFirstText()).toEqual([{ type: 'code' }])
})

it('replaces subscript with superscript on the same text', () => {
    editor = makeEditor('<p><sub>x</sub></p>', pluginIds)
    editor.commands.setTextSelection({ from: 1, to: 2 })

    editor.commands.toggleSuperscript()
    expect(marksOfFirstText()).toEqual([{ type: 'superscript' }])
})

it('replaces superscript with subscript on the same text', () => {
    editor = makeEditor('<p><sup>x</sup></p>', pluginIds)
    editor.commands.setTextSelection({ from: 1, to: 2 })

    editor.commands.toggleSubscript()
    expect(marksOfFirstText()).toEqual([{ type: 'subscript' }])
})

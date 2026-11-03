import { afterEach, describe, expect, it } from 'vitest'
import { colourPluginIds } from './support/colour-plugins'
import { defaultPluginIds, doc, makeEditor, p } from './support/make-editor'
import { typeStylePluginIds } from './support/type-style-plugins'

let editor

afterEach(() => editor?.destroy())

const pluginIds = [...defaultPluginIds, ...colourPluginIds, ...typeStylePluginIds]

const styled = (text, attrs) => ({
    type: 'text',
    text,
    marks: [{ type: 'textStyle', attrs: { color: null, backgroundColor: null, fontFamily: null, fontSize: null, lineHeight: null, ...attrs } }],
})

const selectAll = () => editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 })

describe.each([
    ['setFontFamily', 'unsetFontFamily', 'serif', 'has-serif-font-family'],
    ['setFontSize', 'unsetFontSize', 'large', 'has-large-font-size'],
    ['setLineHeight', 'unsetLineHeight', 'loose', 'has-loose-line-height'],
])('%s', (set, unset, value, className) => {
    it('styles the selection with a class and clears it', () => {
        editor = makeEditor(doc(p('a')), pluginIds)
        selectAll()

        expect(editor.commands[set](value)).toBe(true)
        expect(editor.getHTML()).toBe(`<p><span class="${className}">a</span></p>`)

        selectAll()
        expect(editor.commands[unset]()).toBe(true)
        expect(editor.getHTML()).toBe('<p>a</p>')
    })

    it('refuses a value outside the palette', () => {
        editor = makeEditor(doc(p('a')), pluginIds)
        selectAll()

        expect(editor.commands[set]('nope')).toBe(false)
    })

    it('cannot style a code block', () => {
        editor = makeEditor(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }), pluginIds)
        editor.commands.setTextSelection({ from: 1, to: 2 })

        expect(editor.can()[set](value)).toBe(false)
    })
})

it('keeps the span while a colour remains', () => {
    editor = makeEditor(doc({ type: 'paragraph', content: [styled('a', { color: 'red', fontSize: 'large' })] }), pluginIds)
    selectAll()
    editor.commands.unsetFontSize()

    expect(editor.getHTML()).toBe('<p><span class="has-red-color">a</span></p>')
})

it('puts every style on one span in plugin order', () => {
    editor = makeEditor(doc(p('a')), pluginIds)
    selectAll()
    editor.commands.setLineHeight('loose')
    editor.commands.setTextColor('red')
    editor.commands.setFontSize('large')
    editor.commands.setFontFamily('serif')

    expect(editor.getHTML()).toBe('<p><span class="has-red-color has-serif-font-family has-large-font-size has-loose-line-height">a</span></p>')
})

it('works on a field with only one of the plugins', () => {
    editor = makeEditor('<p><span class="has-red-color has-large-font-size">a</span></p>', [...defaultPluginIds, ...typeStylePluginIds.slice(2, 4)])

    expect(editor.getJSON().content[0].content[0].marks).toEqual([{ type: 'textStyle', attrs: { fontSize: 'large' } }])
    expect(editor.getHTML()).toBe('<p><span class="has-large-font-size">a</span></p>')
})

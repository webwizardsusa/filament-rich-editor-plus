import { afterEach, describe, expect, it } from 'vitest'
import { isToolActive } from '../../resources/js/toolbar/tool-menus'
import { colourPluginIds } from './support/colour-plugins'
import { defaultPluginIds, doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const pluginIds = [...defaultPluginIds, 'core/italic', ...colourPluginIds]

const coloured = (text, attrs) => ({
    type: 'text',
    text,
    marks: [{ type: 'textStyle', attrs: { color: null, backgroundColor: null, ...attrs } }],
})

const selectAll = () => editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 })

describe('colour commands', () => {
    it('colours the selection with a class', () => {
        editor = makeEditor(doc(p('ab')), pluginIds)
        editor.commands.setTextSelection({ from: 1, to: 2 })

        expect(editor.commands.setTextColor('red')).toBe(true)
        expect(editor.getHTML()).toBe('<p><span class="has-red-color">a</span>b</p>')
    })

    it('puts both colours on one span', () => {
        editor = makeEditor(doc(p('a')), pluginIds)
        selectAll()
        editor.commands.setTextColor('red')
        editor.commands.setBackgroundColor('yellow')

        expect(editor.getHTML()).toBe('<p><span class="has-red-color has-yellow-background-color">a</span></p>')
    })

    it('removes the span when its last colour is cleared', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [coloured('a', { color: 'red' })] }), pluginIds)
        selectAll()

        expect(editor.commands.unsetTextColor()).toBe(true)
        expect(editor.getHTML()).toBe('<p>a</p>')
    })

    it('keeps the span while the other colour remains', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [coloured('a', { color: 'red', backgroundColor: 'yellow' })] }), pluginIds)
        selectAll()
        editor.commands.unsetTextColor()

        expect(editor.getHTML()).toBe('<p><span class="has-yellow-background-color">a</span></p>')
    })

    it('refuses a colour outside the palette', () => {
        editor = makeEditor(doc(p('a')), pluginIds)
        selectAll()

        expect(editor.commands.setTextColor('teal')).toBe(false)
        expect(editor.getHTML()).toBe('<p>a</p>')
    })

    it('colours text typed after a colour is chosen at the cursor', () => {
        editor = makeEditor(doc(p('ab')), pluginIds)
        editor.commands.setTextSelection(2)
        editor.commands.setTextColor('blue')
        editor.commands.insertContent('x')

        expect(editor.getHTML()).toBe('<p>a<span class="has-blue-color">x</span>b</p>')
    })

    it('stops colouring typed text when the colour is cleared at the cursor', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [coloured('ab', { color: 'red' })] }), pluginIds)
        editor.commands.setTextSelection(2)
        editor.commands.unsetTextColor()
        editor.commands.insertContent('x')

        expect(editor.getHTML()).toBe('<p><span class="has-red-color">a</span>x<span class="has-red-color">b</span></p>')
    })

    it('clears a colour over mentions and hard breaks without leaving empty spans', () => {
        editor = makeEditor(
            '<p>hi <span data-id="1" data-label="Ann" data-char="@" data-type="mention" class="rep-mention">@Ann</span> there<br>x</p>',
            pluginIds,
        )
        selectAll()
        editor.commands.setTextColor('red')

        expect(JSON.stringify(editor.getJSON())).toContain('textStyle')

        expect(editor.commands.unsetTextColor()).toBe(true)
        expect(editor.getHTML()).not.toContain('<span>')
        expect(editor.getHTML()).not.toContain('<span class="has-red')
        expect(JSON.stringify(editor.getJSON())).not.toContain('textStyle')
    })

    it('clears over a selection straddling coloured and plain text', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [{ type: 'text', text: 'ab' }, coloured('cd', { color: 'red' }), { type: 'text', text: 'ef' }] }), pluginIds)
        editor.commands.setTextSelection({ from: 2, to: 4 })
        editor.commands.unsetTextColor()

        expect(editor.getHTML()).toBe('<p>abc<span class="has-red-color">d</span>ef</p>')
    })

    it('keeps the colour outside a selection that ends inside coloured text', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [{ type: 'text', text: 'ab' }, coloured('cd', { color: 'red' })] }), pluginIds)
        editor.commands.setTextSelection({ from: 2, to: 4 })
        editor.commands.unsetTextColor()

        expect(editor.getHTML()).toBe('<p>abc<span class="has-red-color">d</span></p>')
    })

    it('sets a digit-only palette name', () => {
        editor = makeEditor(doc(p('a')), [
            ...defaultPluginIds,
            { id: 'core/text-color', options: { colors: ['500'] } },
            { id: 'core/global-attributes', options: { name: 'globalAttributes:core/text-color', attributes: [{ name: 'color', kind: 'class', key: 'class', types: ['textStyle'], values: ['500'], pattern: null, keepOnSplit: true, classes: { 500: 'has-500-color' } }] } },
        ])
        selectAll()

        expect(editor.commands.setTextColor('500')).toBe(true)
        expect(editor.getHTML()).toBe('<p><span class="has-500-color">a</span></p>')
    })

    it('cannot colour a code block', () => {
        editor = makeEditor(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }), pluginIds)
        editor.commands.setTextSelection({ from: 1, to: 2 })

        expect(editor.can().setTextColor('red')).toBe(false)
        expect(editor.can().unsetBackgroundColor()).toBe(false)
    })
})

describe('the text style span', () => {
    it('turns a span with only unknown classes or styles into a plain span', () => {
        editor = makeEditor('<p><span class="has-teal-color">a</span><span style="font-weight: 300">b</span></p>', pluginIds)

        expect(editor.getJSON().content[0].content[0].marks).toEqual([{ type: 'textStyle', attrs: { color: null, backgroundColor: null } }])
        expect(editor.getHTML()).toBe('<p><span>ab</span></p>')
    })

    it('leaves plain spans and mentions alone', () => {
        editor = makeEditor('<p><span>a</span><span data-id="1" data-label="Ann" data-char="@" data-type="mention" class="rep-mention">@Ann</span></p>', pluginIds)
        const content = editor.getJSON().content[0].content

        expect(content[0].marks).toBeUndefined()
        expect(content[1].type).toBe('mention')
        expect(content[1].marks).toBeUndefined()
    })
})

describe('the menu items active state', () => {
    it('ticks the colour inside coloured text and nothing outside it', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [{ type: 'text', text: 'a' }, coloured('b', { color: 'red' })] }), pluginIds)

        editor.commands.setTextSelection(1)
        expect(isToolActive(editor, { name: null, attributes: { color: 'red' } })).toBe(false)

        editor.commands.setTextSelection({ from: 2, to: 3 })
        expect(isToolActive(editor, { name: null, attributes: { color: 'red' } })).toBe(true)
        expect(isToolActive(editor, { name: null, attributes: { color: 'blue' } })).toBe(false)
    })
})

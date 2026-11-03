import { afterEach, describe, expect, it } from 'vitest'
import { normalize, styleValue } from '../../resources/js/extensions/core/global-attributes'
import { defaultPluginIds, doc, makeEditor } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const textAlign = {
    name: 'textAlign',
    kind: 'style',
    key: 'text-align',
    types: ['paragraph', 'heading'],
    values: ['left', 'center', 'right', 'justify'],
    pattern: null,
    keepOnSplit: true,
}

const color = { name: 'color', kind: 'style', key: 'color', types: ['paragraph'], values: null, pattern: '[a-z]+|#[0-9a-fA-F]{3,6}', keepOnSplit: true }

const anchor = { name: 'anchor', kind: 'html', key: 'id', types: ['heading'], values: null, pattern: '[A-Za-z][A-Za-z0-9_-]*', keepOnSplit: false }

const withAttributes = (...attributes) => [
    ...defaultPluginIds,
    { id: 'core/global-attributes', options: { name: 'globalAttributes:test', attributes } },
]

describe('styleValue', () => {
    it('reads a property from raw style text, the last declaration winning', () => {
        expect(styleValue('color: red; TEXT-ALIGN : Center ;', 'text-align')).toBe('Center')
        expect(styleValue('text-align: left; text-align: right', 'text-align')).toBe('right')
        expect(styleValue('color: #F00', 'color')).toBe('#F00')
        expect(styleValue('color red', 'color')).toBeNull()
        expect(styleValue('', 'color')).toBeNull()
    })
})

describe('normalize', () => {
    it('keeps listed values in their listed spelling', () => {
        const attribute = { ...textAlign, values: ['Center', 'left'] }

        expect(normalize(attribute, 'center')).toBe('Center')
        expect(normalize(attribute, ' LEFT ')).toBe('left')
        expect(normalize(attribute, 'middle')).toBeNull()
    })

    it('anchors patterns', () => {
        expect(normalize(anchor, 'intro')).toBe('intro')
        expect(normalize(anchor, 'intro section')).toBeNull()
        expect(normalize(anchor, '1intro')).toBeNull()
    })

    it.each([null, undefined, 1, 1.5, true, ['red'], '', '   ', 'red; background: url(x)'])('treats %j as invalid for a style', (value) => {
        expect(normalize(color, value)).toBeNull()
    })

    it('allows a semicolon in an html attribute value', () => {
        expect(normalize({ ...anchor, pattern: '.+' }, 'a; b')).toBe('a; b')
    })
})

describe('the generated extension', () => {
    it('parses and renders a style attribute', () => {
        editor = makeEditor('<p style="text-align: CENTER">a</p><h2 style="text-align: right">b</h2>', withAttributes(textAlign))

        expect(editor.getJSON().content.map((node) => node.attrs.textAlign)).toEqual(['center', 'right'])
        expect(editor.getHTML()).toBe('<p style="text-align: center;">a</p><h2 style="text-align: right;">b</h2>')
    })

    it('drops invalid values when parsing', () => {
        editor = makeEditor('<p style="text-align: middle">a</p><p style="text-align: center; text-align: right">b</p>', withAttributes(textAlign))

        expect(editor.getJSON().content.map((node) => node.attrs.textAlign)).toEqual([null, 'right'])
    })

    it('keeps the raw style value in the document rather than the browser its rewrite', () => {
        editor = makeEditor('<p style="color: #F00">a</p>', withAttributes(color))

        expect(editor.getJSON().content[0].attrs.color).toBe('#F00')
        // ProseMirror writes `style` through `style.cssText`, so the DOM normalizes what it renders.
        expect(editor.getHTML()).toBe('<p style="color: rgb(255, 0, 0);">a</p>')
    })

    it.each(['red; background: url(x)', 'url(x)', 'red"><script>', ['red'], 12])('renders nothing for the invalid value %j', (value) => {
        editor = makeEditor(doc({ type: 'paragraph', attrs: { color: value }, content: [{ type: 'text', text: 'a' }] }), withAttributes(color))

        expect(editor.getHTML()).toBe('<p>a</p>')
    })

    it('parses and renders an html attribute', () => {
        editor = makeEditor('<h2 id="intro">a</h2><h2 id="not valid">b</h2>', withAttributes(anchor))

        expect(editor.getJSON().content.map((node) => node.attrs.anchor)).toEqual(['intro', null])
        expect(editor.getHTML()).toBe('<h2 id="intro">a</h2><h2>b</h2>')
    })

    it('throws when the editor is built with a pattern JavaScript cannot compile', () => {
        const broken = { ...color, pattern: '[a-z\\_]+' }

        expect(() => makeEditor('<p>a</p>', withAttributes(broken))).toThrow()
    })

    it('passes keepOnSplit through', () => {
        editor = makeEditor('<p>a</p>', withAttributes(textAlign, anchor))

        const extension = editor.extensionManager.extensions.find(({ name }) => name === 'globalAttributes:test')
        const declared = extension.config.addGlobalAttributes.call({ options: {} })

        expect(declared.map(({ attributes }) => Object.values(attributes)[0].keepOnSplit)).toEqual([true, false])
    })
})

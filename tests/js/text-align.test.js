import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { createFixedToolbar } from '../../resources/js/toolbar/fixed-toolbar'
import { fixedToolbarMarkup, makeToolbarRoot } from './support/toolbar-markup'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isToolActive } from '../../resources/js/toolbar/tool-menus'
import { switchBlock } from '../../resources/js/blocks/block-types'
import { blockTypes, named } from './support/block-types'
import { defaultPluginIds, doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const options = { alignments: ['left', 'center', 'right', 'justify'], types: ['paragraph', 'heading'], defaultAlignment: 'left' }

// What PHP sends for TextAlignPlugin::make(): its own extension, then its global attribute.
const pluginIds = (pluginOptions = options) => [
    ...defaultPluginIds,
    { id: 'core/text-align', options: pluginOptions },
    {
        id: 'core/global-attributes',
        options: {
            name: 'globalAttributes:core/text-align',
            attributes: [{
                name: 'textAlign',
                kind: 'style',
                key: 'text-align',
                types: pluginOptions.types,
                values: pluginOptions.alignments.filter((alignment) => alignment !== pluginOptions.defaultAlignment),
                pattern: null,
                keepOnSplit: true,
            }],
        },
    },
]

const heading = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
const alignments = () => editor.getJSON().content.map((node) => node.attrs?.textAlign ?? null)

describe('setTextAlign', () => {
    it('aligns the paragraph or heading at the cursor', () => {
        editor = makeEditor(doc(p('a'), heading('b')), pluginIds())
        editor.commands.setTextSelection(2)

        expect(editor.commands.setTextAlign('center')).toBe(true)

        editor.commands.setTextSelection(5)
        editor.commands.setTextAlign('right')

        expect(alignments()).toEqual(['center', 'right'])
    })

    it('aligns every selected block', () => {
        editor = makeEditor(doc(p('a'), heading('b'), p('c')), pluginIds())
        editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 })

        editor.commands.setTextAlign('justify')

        expect(alignments()).toEqual(['justify', 'justify', 'justify'])
    })

    it('clears the attribute for the default alignment', () => {
        editor = makeEditor(doc({ type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'a' }] }), pluginIds())
        editor.commands.setTextSelection(2)

        expect(editor.commands.setTextAlign('left')).toBe(true)
        expect(alignments()).toEqual([null])
    })

    it('refuses an alignment the field does not offer', () => {
        editor = makeEditor(doc(p('a')), pluginIds({ ...options, alignments: ['left', 'center'] }))
        editor.commands.setTextSelection(2)

        expect(editor.commands.setTextAlign('right')).toBe(false)
        expect(alignments()).toEqual([null])
    })

    it('does nothing in a code block, and says so', () => {
        editor = makeEditor(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }), pluginIds())
        editor.commands.setTextSelection(2)

        expect(editor.can().setTextAlign('center')).toBe(false)
        expect(editor.can().unsetTextAlign()).toBe(false)
    })

    it('aligns only the paragraph of a selection that also covers a code block', () => {
        editor = makeEditor(doc(p('a'), { type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }), pluginIds())
        editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 })

        expect(editor.commands.setTextAlign('center')).toBe(true)
        expect(editor.getJSON().content[0].attrs.textAlign).toBe('center')
        expect(editor.getJSON().content[1].attrs.textAlign).toBeUndefined()
    })

    it('leaves types it was not given alone', () => {
        editor = makeEditor(doc(heading('a')), pluginIds({ ...options, types: ['paragraph'] }))
        editor.commands.setTextSelection(2)

        expect(editor.can().setTextAlign('center')).toBe(false)
    })
})

describe('unsetTextAlign', () => {
    it('clears the alignment of the selected blocks', () => {
        editor = makeEditor(doc({ type: 'paragraph', attrs: { textAlign: 'right' }, content: [{ type: 'text', text: 'a' }] }), pluginIds())
        editor.commands.setTextSelection(2)

        expect(editor.commands.unsetTextAlign()).toBe(true)
        expect(alignments()).toEqual([null])
    })
})

describe('shortcuts', () => {
    const press = (key) => {
        const event = new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })

        editor.view.dom.dispatchEvent(event)

        return event
    }

    it.each([['e', 'center'], ['r', 'right'], ['j', 'justify']])('Mod-Shift-%s aligns %s', (key, alignment) => {
        editor = makeEditor(doc(p('a')), pluginIds())
        editor.commands.setTextSelection(2)

        expect(press(key).defaultPrevented).toBe(true)
        expect(alignments()).toEqual([alignment])
    })

    it('Mod-Shift-l clears the alignment', () => {
        editor = makeEditor(doc({ type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'a' }] }), pluginIds())
        editor.commands.setTextSelection(2)

        press('l')

        expect(alignments()).toEqual([null])
    })

    it('claims the key in a code block, where nothing can be aligned', () => {
        editor = makeEditor(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }), pluginIds())
        editor.commands.setTextSelection(2)
        const before = JSON.stringify(editor.getJSON())

        expect(press('r').defaultPrevented).toBe(true)
        expect(JSON.stringify(editor.getJSON())).toBe(before)
    })

    it('binds no key for an alignment the field does not offer', () => {
        editor = makeEditor(doc(p('a')), pluginIds({ ...options, alignments: ['left', 'center'] }))
        editor.commands.setTextSelection(2)

        expect(press('j').defaultPrevented).toBe(false)
    })
})

describe('with the block switcher', () => {
    it('keeps the alignment when a paragraph becomes a heading', () => {
        editor = makeEditor(doc(p('hello')), pluginIds())
        editor.commands.setTextSelection(2)
        editor.commands.setTextAlign('center')
        editor.commands.focus('end')

        switchBlock(editor, named('heading2'), blockTypes)

        expect(editor.getJSON().content[0]).toMatchObject({ type: 'heading', attrs: { textAlign: 'center' } })
    })
})

describe('the menu items active state', () => {
    const defaultItem = { name: null, attributes: { textAlign: null } }
    const centreItem = { name: null, attributes: { textAlign: 'center' } }

    it('ticks the default for an unaligned block and the alignment for an aligned one', () => {
        editor = makeEditor(doc(p('a'), { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'b' }] }), pluginIds())

        editor.commands.setTextSelection(2)
        expect(isToolActive(editor, defaultItem)).toBe(true)
        expect(isToolActive(editor, centreItem)).toBe(false)

        editor.commands.setTextSelection(5)
        expect(isToolActive(editor, defaultItem)).toBe(false)
        expect(isToolActive(editor, centreItem)).toBe(true)
    })

    it('ticks neither for a selection with mixed alignments', () => {
        editor = makeEditor(doc(p('a'), { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'b' }] }), pluginIds())
        editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 })

        expect(isToolActive(editor, defaultItem)).toBe(false)
        expect(isToolActive(editor, centreItem)).toBe(false)
    })
})

describe('one menu shared by a floating and a fixed toolbar', () => {
    const names = ['left', 'center', 'right', 'justify']
    const textAlignTools = {
        textAlign: {
            command: null,
            action: null,
            arguments: [],
            checksAvailability: false,
            hidesInListItem: false,
            active: null,
            menu: names.map((name) => ({
                name,
                label: name[0].toUpperCase() + name.slice(1),
                icon: null,
                shortcut: null,
                command: name === 'left' ? 'unsetTextAlign' : 'setTextAlign',
                arguments: name === 'left' ? [] : [name],
                active: { name: null, attributes: { textAlign: name === 'left' ? null : name } },
            })),
        },
    }
    const buttonMarkup =
        '<button data-rep-tool="textAlign" aria-haspopup="menu" aria-expanded="false" aria-label="Text align" data-rep-generic-label="Text align" data-rep-label="Text align: :item"><svg data-icon="generic"></svg></button>'
    const menuMarkup = `<div class="rep-menu" role="menu" aria-label="Text align" data-rep-tool-menu="textAlign" hidden>${names
        .map((name) => `<button type="button" role="menuitemradio" aria-checked="false" data-rep-menu-item="${name}"><svg data-icon="${name}"></svg><span class="rep-menu-item-label">${name}</span></button>`)
        .join('')}</div>`

    let root
    let controls
    let fixed

    const floatingButton = () => root.querySelector('[data-rep-block-toolbar] [data-rep-tool="textAlign"]')
    const fixedButton = () => root.querySelector('[data-rep-fixed-toolbar] [data-rep-tool="textAlign"]')

    // The floating toolbar syncs when it is shown at the cursor.
    const syncFloating = () => controls.sync(root.querySelector('[data-rep-block-toolbar]'))

    const setUp = (content) => {
        root = makeToolbarRoot()
        root.insertAdjacentHTML('afterbegin', fixedToolbarMarkup)
        root.insertAdjacentHTML('beforeend', menuMarkup)
        root.querySelector('[data-rep-block-toolbar] [data-rep-block-tools]').insertAdjacentHTML('beforeend', buttonMarkup)
        root.querySelector('[data-rep-fixed-toolbar] [data-rep-block-tools-for="*"]').insertAdjacentHTML('beforeend', buttonMarkup)

        editor = makeEditor(content, pluginIds())
        controls = createBlockControls({ editor, root, blockTypes, tools: textAlignTools })
        fixed = createFixedToolbar({
            editor,
            toolbar: root.querySelector('[data-rep-fixed-toolbar]'),
            tools: textAlignTools,
            blockControls: controls,
            mountAction: vi.fn(),
        })
    }

    afterEach(() => {
        fixed?.destroy()
        controls?.destroy()
        root?.remove()
    })

    it('centres from the fixed toolbar and shows it on both buttons', () => {
        setUp(doc(p('a')))
        editor.commands.setTextSelection(2)

        fixedButton().click()
        root.querySelector('[data-rep-tool-menu="textAlign"] [data-rep-menu-item="center"]').click()

        expect(alignments()).toEqual(['center'])
        syncFloating()

        for (const button of [floatingButton(), fixedButton()]) {
            expect(button.getAttribute('aria-label')).toBe('Text align: Center')
            expect(button.querySelector('svg').dataset.icon).toBe('center')
        }
    })

    it('disables both buttons in a code block', () => {
        setUp(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }))
        editor.commands.setTextSelection(2)
        syncFloating()

        expect(floatingButton().getAttribute('aria-disabled')).toBe('true')
        expect(fixedButton().getAttribute('aria-disabled')).toBe('true')
    })
})

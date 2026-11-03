import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { isToolActive } from '../../resources/js/toolbar/tool-menus'
import { bindToolbar, syncToolbar } from '../../resources/js/toolbar/tools'
import { blockTypes } from './support/block-types'
import { doc, makeEditor, p } from './support/make-editor'
import { makeToolbarRoot } from './support/toolbar-markup'

let editor
let root
let toolbar
let controls

const heading = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] })

const tools = {
    level: {
        command: null,
        action: null,
        arguments: [],
        checksAvailability: false,
        hidesInListItem: false,
        active: null,
        menu: [
            { name: 'two', label: 'Two', icon: null, shortcut: 'Mod-Alt-2', command: 'setHeading', arguments: [{ level: 2 }], active: { name: 'heading', attributes: { level: 2 } } },
            { name: 'three', label: 'Three', icon: null, shortcut: null, command: 'setHeading', arguments: [{ level: 3 }], active: { name: null, attributes: { level: 3 } } },
        ],
    },
}

const menuMarkup = `
    <div class="rep-menu" role="menu" aria-label="Level" data-rep-tool-menu="level" hidden>
        <button type="button" role="menuitemradio" aria-checked="false" data-rep-menu-item="two"><svg data-icon="two"></svg><span class="rep-menu-item-label">Two</span><span class="rep-menu-item-shortcut" data-rep-shortcut="Mod-Alt-2"></span></button>
        <button type="button" role="menuitemradio" aria-checked="false" data-rep-menu-item="three"><svg data-icon="three"></svg><span class="rep-menu-item-label">Three</span></button>
    </div>
`

const button = () => toolbar.querySelector('[data-rep-tool="level"]')
const menu = () => root.querySelector('[data-rep-tool-menu="level"]')
const item = (name) => menu().querySelector(`[data-rep-menu-item="${name}"]`)

const setUp = (content) => {
    editor = makeEditor(content)
    root = makeToolbarRoot()
    root.insertAdjacentHTML('beforeend', menuMarkup)
    toolbar = root.querySelector('[data-rep-block-toolbar="*"]')
    toolbar.querySelector('[data-rep-block-tools]').insertAdjacentHTML(
        'beforeend',
        '<button data-rep-tool="level" aria-haspopup="menu" aria-expanded="false" aria-label="Level" data-rep-generic-label="Level" data-rep-label="Level: :item"><svg data-icon="generic"></svg></button>',
    )
    controls = createBlockControls({ editor, root, blockTypes, tools })
    bindToolbar(editor, toolbar, tools, () => {})
    controls.bind(toolbar)
}

const sync = () => {
    syncToolbar(editor, toolbar, tools)
    controls.sync(toolbar)
}

afterEach(() => {
    controls?.destroy()
    editor?.destroy()
    root?.remove()
})

describe('isToolActive', () => {
    beforeEach(() => setUp(doc(heading(3, 'a'))))

    it('checks a name and attributes, or attributes alone', () => {
        editor.commands.setTextSelection(2)

        expect(isToolActive(editor, { name: 'heading', attributes: { level: 3 } })).toBe(true)
        expect(isToolActive(editor, { name: null, attributes: { level: 3 } })).toBe(true)
        expect(isToolActive(editor, { name: null, attributes: { level: 2 } })).toBe(false)
        expect(isToolActive(editor, null)).toBe(false)
        expect(isToolActive(editor, { name: 'heading', attributes: [] })).toBe(true)
    })
})

describe('a menu tool', () => {
    beforeEach(() => setUp(doc(p('para'), heading(3, 'title'))))

    it('opens its menu from the button', () => {
        button().click()

        expect(menu().hidden).toBe(false)
        expect(button().getAttribute('aria-expanded')).toBe('true')
        expect(controls.floatingElements).toContain(menu())
    })

    it('runs the chosen item, closes the menu and refocuses the editor', async () => {
        editor.commands.setTextSelection(2)
        button().click()
        item('two').click()

        expect(menu().hidden).toBe(true)
        expect(editor.state.doc.firstChild.type.name).toBe('heading')
        expect(editor.state.doc.firstChild.attrs.level).toBe(2)
        await vi.waitFor(() => expect(editor.view.hasFocus()).toBe(true))
    })

    it('runs an item chosen from the keyboard', () => {
        editor.commands.setTextSelection(2)
        button().click()
        item('three').focus()
        item('three').dispatchEvent(new MouseEvent('click', { bubbles: true }))

        expect(editor.state.doc.firstChild.attrs.level).toBe(3)
    })

    it('follows the cursor: icon, label and the ticked item', () => {
        editor.commands.setTextSelection(8)
        sync()

        expect(button().querySelector('svg').dataset.icon).toBe('three')
        expect(button().getAttribute('aria-label')).toBe('Level: Three')
        expect(item('three').getAttribute('aria-checked')).toBe('true')
        expect(item('two').getAttribute('aria-checked')).toBe('false')

        editor.commands.setTextSelection(2)
        sync()

        expect(button().querySelector('svg').dataset.icon).toBe('generic')
        expect(button().getAttribute('aria-label')).toBe('Level')
        expect(item('three').getAttribute('aria-checked')).toBe('false')
    })

    it('ticks nothing for a selection with mixed values', () => {
        editor.commands.setContent(doc(heading(2, 'a'), heading(3, 'b')))
        editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 })
        sync()

        expect(item('two').getAttribute('aria-checked')).toBe('false')
        expect(item('three').getAttribute('aria-checked')).toBe('false')
        expect(button().getAttribute('aria-label')).toBe('Level')
    })

    it('disables items and the button where nothing can run', () => {
        editor.commands.setContent(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }))
        editor.commands.setTextSelection(2)
        const can = editor.can()

        sync()

        const expected = !can.setHeading({ level: 2 }) && !can.setHeading({ level: 3 })

        expect(button().getAttribute('aria-disabled')).toBe(expected ? 'true' : 'false')
        expect(item('two').getAttribute('aria-disabled')).toBe(can.setHeading({ level: 2 }) ? 'false' : 'true')
    })

    it('does not run a disabled item', () => {
        editor.commands.setTextSelection(2)
        sync()
        item('two').setAttribute('aria-disabled', 'true')
        button().click()
        item('two').click()

        expect(editor.state.doc.firstChild.type.name).toBe('paragraph')
    })

    it('puts a label with replacement patterns in the button verbatim', () => {
        tools.level.menu[0].label = 'Two $& $1'
        setUp(doc(heading(2, 'a')))
        editor.commands.setTextSelection(2)
        sync()

        expect(button().getAttribute('aria-label')).toBe('Level: Two $& $1')
        tools.level.menu[0].label = 'Two'
    })

    it('closes with Escape and with the other menus', () => {
        button().click()
        menu().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

        expect(menu().hidden).toBe(true)

        button().click()
        controls.closeMenus()

        expect(menu().hidden).toBe(true)
    })

    it('fills in the shortcut hint', () => {
        expect(item('two').querySelector('[data-rep-shortcut]').textContent).not.toBe('')
    })

    it('leaves a field without menu tools alone', () => {
        const plain = createBlockControls({ editor, root: makeToolbarRoot(), blockTypes })

        expect(plain.floatingElements.some((element) => element.matches('[data-rep-tool-menu]'))).toBe(false)
        plain.destroy()
    })
})

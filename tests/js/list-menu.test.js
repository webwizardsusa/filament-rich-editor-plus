import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { bindToolbar, syncToolbar } from '../../resources/js/toolbar/tools'
import { blockTypes } from './support/block-types'
import { doc, makeEditor, p } from './support/make-editor'
import { makeToolbarRoot } from './support/toolbar-markup'

let editor
let root
let toolbar
let controls

const tools = { levelUp: { command: 'increaseBlockLevel', arguments: [], hidesInListItem: true } }

const item = (...content) => ({ type: 'listItem', content })
const bullets = (...items) => ({ type: 'bulletList', content: items })
const numbers = (...items) => ({ type: 'orderedList', attrs: { start: 1, type: null }, content: items })
const quote = (...content) => ({ type: 'blockquote', content })
const table = (...content) => ({
    type: 'table',
    content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null }, content }] }],
})

const listGroup = () => toolbar.querySelector('[data-rep-list-tools]')
const listButton = () => toolbar.querySelector('[data-rep-control="list"]')
const menu = () => root.querySelector('[data-rep-list-menu]')
const action = (name) => menu().querySelector(`[data-rep-list-action="${name}"]`)
const listType = (name) => menu().querySelector(`[data-rep-list-type="${name}"]`)
const levelTool = () => toolbar.querySelector('[data-rep-tool="levelUp"]')

const sync = () => {
    syncToolbar(editor, toolbar, tools)
    controls.sync(toolbar)
}

const placeCursor = (text) => {
    editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text === text) {
            editor.commands.setTextSelection(pos + 1)
        }
    })
    sync()
}

const open = (content, text) => {
    editor = makeEditor(content)
    controls = createBlockControls({ editor, root, blockTypes })
    controls.bind(toolbar)
    placeCursor(text)
}

const selectList = () => {
    let position

    editor.state.doc.descendants((node, pos) => {
        if (position === undefined && node.type.name.endsWith('List')) {
            position = pos
        }
    })

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)))
    sync()
}

const pick = (element) => {
    listButton().click()
    element.click()
    sync()
}

beforeEach(() => {
    root = makeToolbarRoot()
    toolbar = root.querySelector('[data-rep-block-toolbar]')
})

afterEach(() => {
    controls.destroy()
    editor.destroy()
    document.body.innerHTML = ''
})

it('shows in a list item', () => {
    open(doc(bullets(item(p('a')))), 'a')

    expect(listGroup().hidden).toBe(false)
})

it('stays hidden in a paragraph', () => {
    open(doc(p('a')), 'a')

    expect(listGroup().hidden).toBe(true)
})

it('shows in a list inside a quote', () => {
    open(doc(quote(bullets(item(p('a'))))), 'a')

    expect(listGroup().hidden).toBe(false)
})

it('shows in a list inside a table cell', () => {
    open(doc(table(bullets(item(p('a'))))), 'a')

    expect(listGroup().hidden).toBe(false)
})

it('stays hidden in a quote inside a list', () => {
    open(doc(bullets(item(quote(p('a'))))), 'a')

    expect(listGroup().hidden).toBe(true)
})

it('stays hidden on a list selected as a node', () => {
    open(doc(quote(bullets(item(p('a'))))), 'a')
    selectList()

    expect(listGroup().hidden).toBe(true)
})

it('follows the cursor out of a list', () => {
    open(doc(bullets(item(p('a'))), p('b')), 'a')

    placeCursor('b')

    expect(listGroup().hidden).toBe(true)
})

it('shows the icon and name of the current list type', () => {
    open(doc(numbers(item(p('a')))), 'a')

    expect(listButton().querySelector('[data-rep-list-icon] svg').dataset.icon).toBe('ordered')
    expect(listButton().getAttribute('aria-label')).toBe('List options: Numbered list')
})

it('updates the icon when the cursor moves to a list of another type', () => {
    open(doc(bullets(item(p('a'))), numbers(item(p('b')))), 'a')

    placeCursor('b')

    expect(listButton().querySelector('[data-rep-list-icon] svg').dataset.icon).toBe('ordered')
})

it('names the innermost list', () => {
    open(doc(bullets(item(p('a'), numbers(item(p('b')))))), 'b')

    expect(listButton().getAttribute('aria-label')).toBe('List options: Numbered list')
})

it('ticks the current type in the menu', () => {
    open(doc(bullets(item(p('a')))), 'a')

    expect(listType('bulletList').getAttribute('aria-checked')).toBe('true')
    expect(listType('orderedList').getAttribute('aria-checked')).toBe('false')
})

it('opens the menu from the button', () => {
    open(doc(bullets(item(p('a')))), 'a')

    listButton().click()

    expect(menu().hidden).toBe(false)
})

it('indents from the menu', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'b')

    pick(action('increaseBlockLevel'))

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a'), bullets(item(p('b')))))))
})

it('outdents from the menu', () => {
    open(doc(bullets(item(p('a'), bullets(item(p('b')))))), 'b')

    pick(action('decreaseBlockLevel'))

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')), item(p('b')))))
})

it('greys out indent where it cannot run, and ignores a click on it', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'a')

    expect(action('increaseBlockLevel').getAttribute('aria-disabled')).toBe('true')
    expect(action('decreaseBlockLevel').getAttribute('aria-disabled')).toBe('false')

    const before = editor.getJSON()

    pick(action('increaseBlockLevel'))

    expect(editor.getJSON()).toEqual(before)
})

it('switches the list type', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'b')

    pick(listType('orderedList'))

    expect(editor.getJSON()).toEqual(doc(numbers(item(p('a')), item(p('b')))))
    expect(editor.state.selection.$from.parent.textContent).toBe('b')
})

it('switches only the innermost list', () => {
    open(doc(bullets(item(p('a'), bullets(item(p('b')))))), 'b')

    pick(listType('orderedList'))

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a'), numbers(item(p('b')))))))
})

it('keeps a switched list inside its quote', () => {
    open(doc(quote(bullets(item(p('a'))))), 'a')

    pick(listType('orderedList'))

    expect(editor.getJSON()).toEqual(doc(quote(numbers(item(p('a'))))))
})

it('does nothing when the current type is picked', () => {
    open(doc(bullets(item(p('a')))), 'a')

    pick(listType('bulletList'))

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')))))
})

it('undoes a switch in one step', () => {
    open(doc(bullets(item(p('a')))), 'a')
    pick(listType('orderedList'))

    editor.commands.undo()

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')))))
})

it('refuses to set a list type outside a list', () => {
    open(doc(p('a')), 'a')

    expect(editor.can().setListType('orderedList')).toBe(false)
})

it('hides level tools and their section in a list item', () => {
    open(doc(bullets(item(p('a')))), 'a')

    expect(levelTool().hidden).toBe(true)
    expect(toolbar.querySelector('[data-rep-block-tools]').hidden).toBe(true)
})

it('keeps a section that still has a visible tool', () => {
    toolbar.querySelector('[data-rep-block-tools]').insertAdjacentHTML('beforeend', '<button data-rep-tool="other"></button>')
    open(doc(bullets(item(p('a')))), 'a')

    expect(toolbar.querySelector('[data-rep-block-tools]').hidden).toBe(false)
})

it('brings level tools back in a quote paragraph', () => {
    open(doc(bullets(item(p('a'))), quote(p('b'))), 'a')

    placeCursor('b')

    expect(levelTool().hidden).toBe(false)
    expect(toolbar.querySelector('[data-rep-block-tools]').hidden).toBe(false)
})

it('brings level tools back on a selected list', () => {
    open(doc(quote(bullets(item(p('a'))))), 'a')

    selectList()

    expect(levelTool().hidden).toBe(false)
})

it('keeps level tools in a quote inside a list', () => {
    open(doc(bullets(item(quote(p('a'))))), 'a')

    expect(levelTool().hidden).toBe(false)
})

it('skips a hidden list button with the arrow keys', () => {
    open(doc(p('a')), 'a')
    bindToolbar(editor, toolbar, tools, () => {})
    toolbar.hidden = false

    const bold = toolbar.querySelector('[data-rep-tool="bold"]')
    bold.focus()

    bold.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

    expect(document.activeElement).toBe(levelTool())
})

it('closes the list menu when asked', () => {
    open(doc(bullets(item(p('a')))), 'a')
    listButton().click()

    controls.closeMenus()

    expect(menu().hidden).toBe(true)
})

it('works on an editor with no list menu', () => {
    root.querySelector('[data-rep-list-menu]').remove()

    expect(() => open(doc(p('a')), 'a')).not.toThrow()
})

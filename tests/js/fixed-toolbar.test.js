import { afterEach, expect, it, vi } from 'vitest'
import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { createFixedToolbar, createFixedToolbarKeymap } from '../../resources/js/toolbar/fixed-toolbar'
import { setTabStop } from '../../resources/js/toolbar/tools'
import { blockTypes } from './support/block-types'
import { doc, makeEditor, p } from './support/make-editor'
import { fixedToolbarMarkup, makeToolbarRoot } from './support/toolbar-markup'

const tools = {
    bold: { command: 'toggleBold', arguments: [], active: { name: 'bold', attributes: [] }, checksAvailability: false, hidesInListItem: false },
    addRowAfter: { command: 'addRowAfter', arguments: [], active: null, checksAvailability: false, hidesInListItem: false },
    levelUp: { command: 'increaseBlockLevel', arguments: [], active: null, checksAvailability: false, hidesInListItem: true },
}

const table = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [p('cell')] }] }] }

// p('a') takes positions 0–3, so the cell's text starts at 7: table 3, row 4, cell 5, paragraph 6.
const inTable = 7

let editor
let root
let toolbar
let controls
let fixed

const group = (node) => toolbar.querySelector(`[data-rep-block-tools-for="${node}"]`)
const section = () => toolbar.querySelector('[data-rep-block-tools]')

const pressAltF10 = () => {
    const event = new KeyboardEvent('keydown', { key: 'F10', altKey: true })

    return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event))
}

function setUp(content) {
    root = makeToolbarRoot()
    root.querySelector('[data-rep-block-toolbar]').remove()
    root.insertAdjacentHTML('afterbegin', fixedToolbarMarkup)
    toolbar = root.querySelector('[data-rep-fixed-toolbar]')

    editor = makeEditor(content)
    controls = createBlockControls({ editor, root, blockTypes })
    fixed = createFixedToolbar({ editor, toolbar, tools, blockControls: controls, mountAction: vi.fn() })
}

afterEach(() => {
    fixed.destroy()
    controls.destroy()
    editor.destroy()
    document.body.innerHTML = ''
})

it('hides the table tools and the empty section outside a table', () => {
    setUp(doc(p('abc')))
    editor.commands.setTextSelection(1)

    expect(group('*').hidden).toBe(false)
    expect(group('table').hidden).toBe(true)
    expect(section().hidden).toBe(true)
})

it('shows the table tools while the cursor is in a table', () => {
    setUp(doc(p('a'), table))
    editor.commands.setTextSelection(inTable)

    expect(group('table').hidden).toBe(false)
    expect(group('bulletList').hidden).toBe(true)
    expect(section().hidden).toBe(false)
})

it('hides the table tools again after leaving the table', () => {
    setUp(doc(p('a'), table))
    editor.commands.setTextSelection(inTable)

    editor.commands.setTextSelection(1)

    expect(group('table').hidden).toBe(true)
    expect(section().hidden).toBe(true)
})

it('keeps formatting and the list button in place, disabled, in a code block', () => {
    setUp(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'code' }] }))
    editor.commands.setTextSelection(2)

    expect(toolbar.querySelector('[data-rep-inline-tools]').hidden).toBe(false)
    expect(toolbar.querySelector('[data-rep-tool="bold"]').getAttribute('aria-disabled')).toBe('true')
    expect(toolbar.querySelector('[data-rep-list-tools]').hidden).toBe(false)
    expect(toolbar.querySelector('[data-rep-control="list"]').getAttribute('aria-disabled')).toBe('true')
})

it('gives the toolbar one tab stop, on its first button', () => {
    setUp(doc(p('abc')))

    expect([...toolbar.querySelectorAll('[tabindex="0"]')]).toEqual([toolbar.querySelector('[data-rep-control="switcher"]')])
})

it('moves the tab stop off a group that hides', () => {
    setUp(doc(p('a'), table))
    editor.commands.setTextSelection(inTable)
    setTabStop(toolbar, toolbar.querySelector('[data-rep-tool="addRowAfter"]'))

    editor.commands.setTextSelection(1)

    expect(toolbar.querySelector('[data-rep-control="switcher"]').getAttribute('tabindex')).toBe('0')
})

it('focuses the toolbar with Alt+F10', () => {
    setUp(doc(p('abc')))
    editor.registerPlugin(createFixedToolbarKeymap(fixed, root))
    editor.commands.focus(1)

    expect(pressAltF10()).toBe(true)
    expect(document.activeElement).toBe(toolbar.querySelector('[data-rep-control="switcher"]'))
})

it('leaves focus alone on Alt+F10 while a suggestion menu is open', () => {
    setUp(doc(p('abc')))
    editor.registerPlugin(createFixedToolbarKeymap(fixed, root))
    root.setAttribute('data-rep-suggesting', '')

    expect(pressAltF10()).toBe(true)
    expect(toolbar.contains(document.activeElement)).toBe(false)
})

it('stops following the selection once destroyed', () => {
    setUp(doc(p('a'), table))
    fixed.destroy()

    editor.commands.setTextSelection(inTable)

    expect(group('table').hidden).toBe(true)
})

it('keeps a list tool disabled, not hidden, after a click syncs the toolbar', () => {
    setUp(doc({ type: 'bulletList', content: [{ type: 'listItem', content: [p('item')] }] }))
    editor.commands.setTextSelection(3)

    toolbar.querySelector('[data-rep-tool="bold"]').click()

    const levelUp = group('bulletList').querySelector('[data-rep-tool="levelUp"]')

    expect(levelUp.hidden).toBe(false)
    expect(levelUp.getAttribute('aria-disabled')).toBe('true')
})

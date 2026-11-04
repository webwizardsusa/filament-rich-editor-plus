import { afterEach, beforeEach, expect, it } from 'vitest'
import { findReplaceKey } from '../../resources/js/find-replace/plugin'
import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { focusToolbar, syncToolbar } from '../../resources/js/toolbar/tools'
import { blockTypes } from './support/block-types'
import { blockSummary, doc, makeEditor, p } from './support/make-editor'
import { fixedToolbarMarkup, makeToolbarRoot } from './support/toolbar-markup'

let editor
let root
let toolbar
let controls

const control = (name) => toolbar.querySelector(`[data-rep-control="${name}"]`)

function setUp(content) {
    editor = makeEditor(content)
    controls = createBlockControls({ editor, root, blockTypes })
    controls.bind(toolbar)
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

it('shows the current block type on the switcher', () => {
    setUp(doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi' }] }))
    editor.commands.setTextSelection(1)

    controls.sync(toolbar)

    expect(control('switcher').querySelector('[data-rep-switcher-label]').textContent).toBe('Heading 2')
    expect(control('switcher').querySelector('[data-rep-switcher-icon] svg')).not.toBeNull()
    expect(control('switcher').getAttribute('aria-disabled')).toBe('false')
})

it('disables the switcher on a block that cannot switch, but still names it', () => {
    setUp(doc({ type: 'horizontalRule' }, p('after')))
    editor.commands.setNodeSelection(0)

    controls.sync(toolbar)

    expect(control('switcher').querySelector('[data-rep-switcher-label]').textContent).toBe('Divider')
    expect(control('switcher').getAttribute('aria-disabled')).toBe('true')
})

it('uses a generic name for a node with no block type', () => {
    setUp(doc(p('x')))
    controls.destroy()
    controls = createBlockControls({ editor, root, blockTypes: [] })
    controls.bind(toolbar)
    editor.commands.setTextSelection(1)

    controls.sync(toolbar)

    expect(control('switcher').querySelector('[data-rep-switcher-label]').textContent).toBe('Block')
    expect(control('switcher').getAttribute('aria-disabled')).toBe('true')
})

it('disables moving at the ends of the document', () => {
    setUp(doc(p('a'), p('b')))
    editor.commands.setTextSelection(1)

    controls.sync(toolbar)

    expect(control('moveUp').getAttribute('aria-disabled')).toBe('true')
    expect(control('moveUp').hasAttribute('disabled')).toBe(false)
    expect(control('moveDown').getAttribute('aria-disabled')).toBe('false')
})

it('hides formatting where marks are not allowed', () => {
    setUp(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'x' }] }, p('y')))

    editor.commands.setTextSelection(1)
    controls.sync(toolbar)
    expect(toolbar.querySelector('[data-rep-inline-tools]').hidden).toBe(true)

    editor.commands.setTextSelection(4)
    controls.sync(toolbar)
    expect(toolbar.querySelector('[data-rep-inline-tools]').hidden).toBe(false)
})

it('hides formatting on a selected divider', () => {
    setUp(doc({ type: 'horizontalRule' }, p('after')))
    editor.commands.setNodeSelection(0)

    controls.sync(toolbar)

    expect(toolbar.querySelector('[data-rep-inline-tools]').hidden).toBe(true)
})

it('disables block controls for a selection across blocks, but keeps formatting', () => {
    setUp(doc(p('abc'), { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'def' }] }, p('ghi')))
    editor.commands.setTextSelection({ from: 2, to: 7 })

    controls.sync(toolbar)

    for (const name of ['switcher', 'moveUp', 'moveDown']) {
        expect(control(name).getAttribute('aria-disabled')).toBe('true')
    }

    expect(toolbar.querySelector('[data-rep-drag-handle]').getAttribute('aria-disabled')).toBe('true')
    expect(toolbar.querySelector('[data-rep-inline-tools]').hidden).toBe(false)
})

it('keeps the more menu available across blocks while one of its items can run', () => {
    setUp(doc(p('abc'), p('def')))
    editor.commands.setTextSelection({ from: 2, to: 7 })

    controls.sync(toolbar)

    const item = (action) => root.querySelector(`[data-rep-more-action="${action}"]`)

    expect(control('more').getAttribute('aria-disabled')).toBe('false')
    expect(item('openFindReplace').getAttribute('aria-disabled')).toBe('false')
    expect(item('duplicateBlock').getAttribute('aria-disabled')).toBe('true')
    expect(item('deleteBlock').getAttribute('aria-disabled')).toBe('true')
})

it('disables the more menu when none of its items can run', () => {
    root.querySelector('[data-rep-more-action="openFindReplace"]').remove()
    setUp(doc(p('abc'), p('def')))
    editor.commands.setTextSelection({ from: 2, to: 7 })

    controls.sync(toolbar)

    expect(control('more').getAttribute('aria-disabled')).toBe('true')
})

it('runs an overflow item from the more menu', () => {
    setUp(doc(p('abc'), p('def')))
    editor.commands.setTextSelection({ from: 2, to: 7 })
    controls.sync(toolbar)

    control('more').click()

    expect(root.querySelector('[data-rep-more-menu]').hidden).toBe(false)

    root.querySelector('[data-rep-more-action="openFindReplace"]').click()

    expect(findReplaceKey.getState(editor.state).isOpen).toBe(true)
})

it('treats an overflow item whose command is missing as unavailable', () => {
    root.querySelector('[data-rep-more-menu]').insertAdjacentHTML('beforeend', '<button data-rep-more-action="nope"></button>')
    setUp(doc(p('abc')))

    controls.sync(toolbar)

    expect(root.querySelector('[data-rep-more-action="nope"]').getAttribute('aria-disabled')).toBe('true')
})

it('moves the block and announces it, without taking focus', () => {
    setUp(doc(p('a'), p('b')))
    editor.commands.setTextSelection(4)
    controls.sync(toolbar)

    toolbar.hidden = false
    control('moveUp').focus()
    control('moveUp').click()

    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:a'])
    expect(root.querySelector('[data-rep-live]').textContent).toBe('Moved up')
    expect(document.activeElement).toBe(control('moveUp'))
})

it('ignores a click on a disabled control', () => {
    setUp(doc(p('a'), p('b')))
    editor.commands.setTextSelection(1)
    controls.sync(toolbar)

    control('moveUp').click()

    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b'])
})

it('ticks the current type in the switcher and switches on selection', () => {
    setUp(doc(p('a')))
    editor.commands.setTextSelection(1)
    controls.sync(toolbar)

    control('switcher').click()

    const menu = root.querySelector('[data-rep-switcher-menu]')
    const paragraph = menu.querySelector('[data-rep-block-type="paragraph"]')

    expect(menu.hidden).toBe(false)
    expect(paragraph.getAttribute('aria-checked')).toBe('true')

    menu.querySelector('[data-rep-block-type="heading2"]').click()

    expect(blockSummary(editor)).toEqual(['heading:a'])
    expect(menu.hidden).toBe(true)
})

it('runs duplicate and delete from the more menu', () => {
    setUp(doc(p('a'), p('b')))
    editor.commands.setTextSelection(1)
    controls.sync(toolbar)

    control('more').click()
    root.querySelector('[data-rep-more-action="duplicateBlock"]').click()
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:a', 'paragraph:b'])

    controls.sync(toolbar)
    control('more').click()
    root.querySelector('[data-rep-more-action="deleteBlock"]').click()
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b'])
})

it('gives focus back to the editor at once, so the toolbar never sees focus go missing', () => {
    setUp(doc(p('a'), p('b')))
    editor.commands.setTextSelection(1)
    controls.sync(toolbar)

    control('switcher').click()
    root.querySelector('[data-rep-switcher-menu] [data-rep-block-type="heading2"]').click()
    expect(document.activeElement).toBe(editor.view.dom)

    control('more').click()
    root.querySelector('[data-rep-more-action="duplicateBlock"]').click()
    expect(document.activeElement).toBe(editor.view.dom)
})

it('marks only formatting buttons as toggles, not the controls', () => {
    setUp(doc(p('a')))

    syncToolbar(editor, toolbar, { bold: { active: { name: 'bold' } } })

    expect(toolbar.querySelector('[data-rep-tool="bold"]').getAttribute('aria-pressed')).toBe('false')

    for (const name of ['switcher', 'moveUp', 'moveDown', 'more']) {
        expect(control(name).hasAttribute('aria-pressed')).toBe(false)
    }
})

it('stops running controls once destroyed', () => {
    setUp(doc(p('a'), p('b')))
    editor.commands.setTextSelection(4)
    controls.sync(toolbar)

    controls.destroy()
    control('moveUp').click()

    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b'])
})

it('leaves one tab stop even when the last one sat in hidden formatting', () => {
    setUp(doc(p('a')))
    toolbar.hidden = false

    const bold = toolbar.querySelector('[data-rep-tool="bold"]')

    bold.setAttribute('tabindex', '0')
    toolbar.querySelector('[data-rep-inline-tools]').hidden = true

    focusToolbar(toolbar)

    expect(bold.getAttribute('tabindex')).toBe('-1')
    expect(toolbar.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
})

it('closes open menus when asked', () => {
    setUp(doc(p('a')))
    editor.commands.setTextSelection(1)
    controls.sync(toolbar)
    control('more').click()

    controls.closeMenus()

    expect(root.querySelector('[data-rep-more-menu]').hidden).toBe(true)
})

it('keeps the list button showing but disabled outside a list when told not to hide', () => {
    setUp(doc(p('abc')))
    editor.commands.setTextSelection(1)

    controls.sync(toolbar, { hideUnavailable: false })

    expect(toolbar.querySelector('[data-rep-list-tools]').hidden).toBe(false)
    expect(control('list').getAttribute('aria-disabled')).toBe('true')
})

it('restores the generic list button name and icon after leaving a list when told not to hide', () => {
    root.insertAdjacentHTML('afterbegin', fixedToolbarMarkup)
    toolbar = root.querySelector('[data-rep-fixed-toolbar]')
    toolbar.querySelector('[data-rep-control="list"]').dataset.repGenericLabel = 'List options'
    toolbar.querySelector('[data-rep-list-icon]').innerHTML = '<svg data-icon="generic"></svg>'
    setUp(doc({ type: 'bulletList', content: [{ type: 'listItem', content: [p('item')] }] }, p('after')))
    const sync = () => controls.sync(toolbar, { hideUnavailable: false })

    editor.commands.setTextSelection(3)
    sync()

    expect(control('list').getAttribute('aria-label')).toBe('List options: Bulleted list')
    expect(control('list').querySelector('svg').dataset.icon).toBe('bullet')

    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    sync()

    expect(control('list').getAttribute('aria-label')).toBe('List options')
    expect(control('list').querySelector('svg').dataset.icon).toBe('generic')
    expect(control('list').dataset.repCurrent).toBeUndefined()
})

it('keeps formatting showing in a code block when told not to hide', () => {
    setUp(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'code' }] }))
    editor.commands.setTextSelection(2)

    controls.sync(toolbar, { hideUnavailable: false })

    expect(toolbar.querySelector('[data-rep-inline-tools]').hidden).toBe(false)
})

it('hides every formatting section in a code block by default', () => {
    toolbar.querySelector('[data-rep-inline-tools]').insertAdjacentHTML('afterend', '<span data-rep-inline-tools><button data-rep-tool="italic"></button></span>')
    setUp(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'code' }] }))
    editor.commands.setTextSelection(2)

    controls.sync(toolbar)

    expect([...toolbar.querySelectorAll('[data-rep-inline-tools]')].map((section) => section.hidden)).toEqual([true, true])
})

it('locks the block controls and more items while read-only, except those marked available', () => {
    root.querySelector('[data-rep-more-menu]').insertAdjacentHTML('beforeend', '<button data-rep-more-action="focus" data-rep-read-only-ok></button>')
    setUp(doc(p('abc'), p('def')))
    editor.commands.setTextSelection(2)
    editor.setEditable(false)

    controls.sync(toolbar)

    expect(control('switcher').getAttribute('aria-disabled')).toBe('true')
    expect(control('moveDown').getAttribute('aria-disabled')).toBe('true')
    expect(root.querySelector('[data-rep-more-action="deleteBlock"]').getAttribute('aria-disabled')).toBe('true')
    expect(root.querySelector('[data-rep-more-action="focus"]').getAttribute('aria-disabled')).toBe('false')

    control('more').click()
    root.querySelector('[data-rep-more-action="deleteBlock"]').click()

    expect(editor.getText()).toContain('abc')
})

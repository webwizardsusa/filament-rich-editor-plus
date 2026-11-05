import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { createFixedToolbar } from '../../resources/js/toolbar/fixed-toolbar'
import { fitToolbar } from '../../resources/js/toolbar/overflow'
import { bindToolbar, focusButton, syncToolbar } from '../../resources/js/toolbar/tools'
import { blockTypes } from './support/block-types'
import { doc, makeEditor, p } from './support/make-editor'

let editor
let root
let toolbar
let controls

const divider = '<span class="rep-toolbar-divider"></span>'

/**
 * A floating toolbar laid out as `ToolbarRenderer` writes it: the pinned controls, a divider per group, and a group
 * divider between the tool groups inside a section.
 */
const toolbarMarkup = ({ more = '<button data-rep-control="more" aria-label="More options"></button>' } = {}) => `
    <div data-rep-block-toolbar="*" role="toolbar">
        <button data-rep-drag-handle></button>
        <button data-rep-control="switcher" data-rep-generic-label="Block" data-rep-multiple-label=":count blocks"><span data-rep-switcher-icon></span><span data-rep-switcher-label></span></button>
        ${divider}<button data-rep-control="moveUp" aria-label="Move up"></button>
        <span class="rep-toolbar-group" data-rep-inline-tools>${divider}
            <button data-rep-tool="bold" aria-label="Bold" aria-pressed="false"><svg data-icon="bold"></svg></button>
            <button data-rep-tool="quote" aria-label="Quote" aria-pressed="false"><svg data-icon="quote"></svg></button>
            <span class="rep-toolbar-divider rep-toolbar-group-divider"></span>
            <button data-rep-tool="link" aria-label="Link" aria-pressed="false"><svg data-icon="link"></svg></button>
            <button data-rep-tool="heading" aria-label="Heading: None" aria-haspopup="menu" aria-expanded="false" data-rep-generic-label="Heading"><svg data-icon="heading"></svg></button>
        </span>
        ${more ? divider + more : ''}
    </div>
`

const menusMarkup = `
    <div data-rep-switcher-menu hidden></div>
    <div data-rep-more-menu hidden>
        <button data-rep-more-action="selectParentBlock"></button>
        <button data-rep-more-action="duplicateBlock"></button>
        <button data-rep-more-action="deleteBlock"></button>
    </div>
    <div data-rep-tool-menu="heading" hidden>
        <button role="menuitemradio" aria-checked="false" data-rep-menu-item="h2"><svg data-icon="h2"></svg><span class="rep-menu-item-label">Heading 2</span></button>
    </div>
`

const tools = {
    bold: { command: 'toggleBold', active: { name: 'bold' } },
    quote: { command: 'toggleBlockquote', active: { name: 'blockquote' } },
    link: { action: 'link' },
    heading: {
        menu: [{ name: 'h2', command: 'toggleHeading', arguments: [{ level: 2 }], active: { name: 'heading', attributes: { level: 2 } } }],
    },
}

/**
 * jsdom lays nothing out, so a toolbar "fits" when no more than `limit` buttons and dividers show.
 */
const shownItems = (element) =>
    [...element.querySelectorAll('button, .rep-toolbar-divider')].filter((item) => !item.closest('[hidden], [data-rep-overflowed]'))

const fitsIn = (limit) => (element) => shownItems(element).length <= limit

const button = (selector) => toolbar.querySelector(selector)
const overflowed = () => [...toolbar.querySelectorAll('button[data-rep-overflowed]')]
const moreMenu = () => root.querySelector('[data-rep-more-menu]')
const overflowItems = () => [...moreMenu().querySelectorAll('[data-rep-overflow-item]')]
const label = (item) => item.querySelector('.rep-menu-item-label').textContent

function mount(markup = toolbarMarkup()) {
    root = document.createElement('div')
    root.innerHTML = markup + menusMarkup
    document.body.append(root)
    toolbar = root.querySelector('[role="toolbar"]')
}

afterEach(() => {
    controls?.destroy()
    controls = null

    if (editor && !editor.isDestroyed) {
        editor.destroy()
    }

    document.body.innerHTML = ''
})

describe('fitting a toolbar onto one row', () => {
    beforeEach(() => mount())

    it('leaves every button in place when they all fit', () => {
        fitToolbar(toolbar, { fits: fitsIn(100) })

        expect(overflowed()).toEqual([])
    })

    it('moves buttons off the end of the toolbar until it fits', () => {
        fitToolbar(toolbar, { fits: fitsIn(8) })

        expect(overflowed().map((element) => element.dataset.repTool)).toEqual(['quote', 'link', 'heading'])
        expect(shownItems(toolbar).length).toBeLessThanOrEqual(8)
    })

    it('never moves the drag handle, the block switcher or the more button', () => {
        fitToolbar(toolbar, { fits: fitsIn(1) })

        const shownButtons = shownItems(toolbar).filter((item) => item.tagName === 'BUTTON')

        expect(shownButtons).toEqual([
            button('[data-rep-drag-handle]'),
            button('[data-rep-control="switcher"]'),
            button('[data-rep-control="more"]'),
        ])
    })

    it('leaves no divider at the start, at the end or next to another', () => {
        fitToolbar(toolbar, { fits: fitsIn(1) })

        const kinds = shownItems(toolbar).map((item) => (item.matches('.rep-toolbar-divider') ? 'divider' : 'button'))

        expect(kinds).toEqual(['button', 'button', 'divider', 'button'])
    })

    it('puts buttons back when there is room again', () => {
        fitToolbar(toolbar, { fits: fitsIn(5) })
        fitToolbar(toolbar, { fits: fitsIn(100) })

        expect(overflowed()).toEqual([])
        expect(toolbar.querySelectorAll('[data-rep-overflowed]')).toHaveLength(0)
    })

    it('ignores buttons that are already hidden', () => {
        button('[data-rep-tool="heading"]').hidden = true

        fitToolbar(toolbar, { fits: fitsIn(9) })

        expect(overflowed().map((element) => element.dataset.repTool)).toEqual(['link'])
    })

    it('marks the toolbar as fitted, so it only stops wrapping once the browser manages it', () => {
        expect(toolbar.hasAttribute('data-rep-fitted')).toBe(false)

        fitToolbar(toolbar, { fits: fitsIn(100) })

        expect(toolbar.hasAttribute('data-rep-fitted')).toBe(true)
    })

    it('shows a more button that is only for overflow while something has moved', () => {
        mount(toolbarMarkup({ more: '<button data-rep-control="more" data-rep-overflow-only aria-label="More options" hidden></button>' }))
        const more = button('[data-rep-control="more"]')

        fitToolbar(toolbar, { fits: fitsIn(100) })
        expect(more.hidden).toBe(true)

        fitToolbar(toolbar, { fits: fitsIn(8) })
        expect(more.hidden).toBe(false)

        fitToolbar(toolbar, { fits: fitsIn(100) })
        expect(more.hidden).toBe(true)
    })

    it('skips moved buttons with the arrow keys', () => {
        editor = makeEditor(doc(p('abc')))
        bindToolbar(editor, toolbar, tools, () => {})
        fitToolbar(toolbar, { fits: fitsIn(8) })

        focusButton(toolbar, button('[data-rep-tool="bold"]'))
        toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

        expect(document.activeElement).toBe(button('[data-rep-control="more"]'))
    })
})

describe('the more menu', () => {
    let mountAction

    function setUp(markup) {
        mount(markup)
        editor = makeEditor(doc(p('abc')))
        mountAction = vi.fn()
        controls = createBlockControls({ editor, root, blockTypes, tools, fits: fitsIn(5) })
        bindToolbar(editor, toolbar, tools, mountAction)
        controls.bind(toolbar)
        editor.commands.setTextSelection({ from: 1, to: 3 })
        controls.sync(toolbar)
        controls.fit(toolbar)
    }

    const openMore = () => button('[data-rep-control="more"]').click()

    it('lists the moved buttons first, in toolbar order, with their names and icons', () => {
        setUp()

        openMore()

        expect(overflowItems().map(label)).toEqual(['Move up', 'Bold', 'Quote', 'Link', 'Heading'])
        expect(overflowItems()[1].querySelector('svg').dataset.icon).toBe('bold')
        expect(moreMenu().firstElementChild.contains(overflowItems()[0])).toBe(true)
        expect(moreMenu().querySelector('[data-rep-overflow-separator]').hidden).toBe(false)
    })

    it('shows whether a moved toggle is on', () => {
        setUp()
        editor.commands.toggleBold()
        syncToolbar(editor, toolbar, tools)
        controls.sync(toolbar)

        openMore()

        const bold = overflowItems().find((item) => label(item) === 'Bold')

        expect(bold.getAttribute('role')).toBe('menuitemcheckbox')
        expect(bold.getAttribute('aria-checked')).toBe('true')
    })

    it('starts on the first item, not on a moved toggle that is on', () => {
        setUp()
        editor.commands.toggleBold()
        syncToolbar(editor, toolbar, tools)

        openMore()

        expect(document.activeElement).toBe(overflowItems()[0])
    })

    it('runs a moved toggle', () => {
        setUp()
        openMore()

        overflowItems().find((item) => label(item) === 'Bold').click()

        expect(editor.isActive('bold')).toBe(true)
        expect(moreMenu().hidden).toBe(true)
    })

    it('opens the modal of a moved action', () => {
        setUp()
        openMore()

        overflowItems().find((item) => label(item) === 'Link').click()

        expect(mountAction).toHaveBeenCalledWith('link', expect.any(Object))
    })

    it("opens a moved menu tool's own menu from the more button", () => {
        setUp()
        openMore()

        overflowItems().find((item) => label(item) === 'Heading').click()

        const headingMenu = root.querySelector('[data-rep-tool-menu="heading"]')

        expect(headingMenu.hidden).toBe(false)
        expect(button('[data-rep-control="more"]').getAttribute('aria-expanded')).toBe('true')
    })

    it('keeps a moved button that is disabled disabled', () => {
        setUp()
        button('[data-rep-tool="quote"]').setAttribute('aria-disabled', 'true')

        openMore()
        const quote = overflowItems().find((item) => label(item) === 'Quote')
        quote.click()

        expect(quote.getAttribute('aria-disabled')).toBe('true')
        expect(editor.isActive('blockquote')).toBe(false)
    })

    it('lists nothing extra when nothing has moved', () => {
        setUp()
        controls.destroy()
        controls = createBlockControls({ editor, root, blockTypes, tools, fits: fitsIn(100) })
        controls.bind(toolbar)
        controls.fit(toolbar)

        openMore()

        expect(overflowItems()).toEqual([])
        expect(moreMenu().querySelector('[data-rep-overflow-separator]').hidden).toBe(true)
    })

    it('has only the moved buttons behind a more button that is only for overflow', () => {
        setUp(toolbarMarkup({ more: '<button data-rep-control="more" data-rep-overflow-only aria-label="More options" hidden></button>' }))

        openMore()

        const shown = [...moreMenu().querySelectorAll('button')].filter((item) => !item.hidden)

        expect(shown.length).toBeGreaterThan(0)
        expect(shown.every((item) => item.hasAttribute('data-rep-overflow-item'))).toBe(true)
        expect(moreMenu().querySelector('[data-rep-overflow-separator]').hidden).toBe(true)
    })

    it('enables the more button while a moved button can be used', () => {
        setUp()
        moreMenu()
            .querySelectorAll('[data-rep-more-action]')
            .forEach((item) => item.remove())
        controls.sync(toolbar)
        controls.fit(toolbar)

        expect(button('[data-rep-control="more"]').getAttribute('aria-disabled')).toBe('false')
    })
})

describe('the fixed toolbar', () => {
    it('keeps its tab stop on a button that is still showing', () => {
        mount()
        editor = makeEditor(doc(p('abc')))
        controls = createBlockControls({ editor, root, blockTypes, tools, fits: fitsIn(6) })
        button('[data-rep-tool="heading"]').setAttribute('tabindex', '0')

        const fixed = createFixedToolbar({ editor, toolbar, tools, blockControls: controls, mountAction: () => {} })

        expect(overflowed().length).toBeGreaterThan(0)
        expect(toolbar.querySelector('[tabindex="0"]').hasAttribute('data-rep-overflowed')).toBe(false)

        fixed.destroy()
    })
})

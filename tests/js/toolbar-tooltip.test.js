import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createToolbarTooltip, formatShortcut, toAriaKeyShortcut } from '../../resources/js/toolbar/tooltip'

let tooltip
let toolbar

beforeEach(() => {
    vi.useFakeTimers()

    const root = document.createElement('div')

    toolbar = document.createElement('div')
    toolbar.innerHTML = `
        <button class="rep-tool" aria-label="Bold" data-rep-shortcut="Mod-b"></button>
        <button class="rep-tool" aria-label="Link"></button>
        <button class="rep-tool" aria-hidden="true" data-rep-tooltip="Drag"></button>
        <button class="rep-tool" aria-label="More" aria-expanded="true"></button>
    `
    root.append(toolbar)
    document.body.append(root)

    tooltip = createToolbarTooltip({ root, toolbars: [toolbar], isMac: false })
})

afterEach(() => {
    tooltip.destroy()
    vi.useRealTimers()
    document.body.innerHTML = ''
})

const buttons = () => [...toolbar.querySelectorAll('button')]

const hover = (button) => button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))

const leave = (button) => button.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body }))

it.each([
    ['Mod-b', false, 'Ctrl+B'],
    ['Mod-b', true, '⌘B'],
    ['Mod-Shift-s', false, 'Ctrl+Shift+S'],
    ['Mod-Shift-s', true, '⌘⇧S'],
    ['Alt-Shift-ArrowUp', false, 'Alt+Shift+↑'],
    ['Alt-Shift-ArrowUp', true, '⌥⇧↑'],
    ['Mod--', false, 'Ctrl+-'],
])('formats %s for display', (shortcut, isMac, expected) => {
    expect(formatShortcut(shortcut, isMac)).toBe(expected)
})

it.each([
    ['Mod-Shift-s', false, 'Control+Shift+S'],
    ['Mod-b', true, 'Meta+B'],
    ['Alt-Shift-ArrowDown', false, 'Alt+Shift+ArrowDown'],
])('formats %s for aria-keyshortcuts', (shortcut, isMac, expected) => {
    expect(toAriaKeyShortcut(shortcut, isMac)).toBe(expected)
})

it('sets aria-keyshortcuts on buttons with a shortcut', () => {
    expect(buttons()[0].getAttribute('aria-keyshortcuts')).toBe('Control+B')
    expect(buttons()[1].hasAttribute('aria-keyshortcuts')).toBe(false)
})

it('shows the label and shortcut after hovering for a moment', () => {
    hover(buttons()[0])

    expect(tooltip.element.hidden).toBe(true)

    vi.advanceTimersByTime(400)

    expect(tooltip.element.hidden).toBe(false)
    expect(tooltip.element.textContent).toBe('BoldCtrl+B')
})

it('leaves out the key hint for a button with no shortcut', () => {
    hover(buttons()[1])
    vi.advanceTimersByTime(400)

    expect(tooltip.element.querySelector('kbd').hidden).toBe(true)
    expect(tooltip.element.textContent).toBe('Link')
})

it('uses the tooltip text of a button hidden from assistive technology', () => {
    hover(buttons()[2])
    vi.advanceTimersByTime(400)

    expect(tooltip.element.textContent).toBe('Drag')
})

it('moves straight to the next button while a tooltip is up', () => {
    hover(buttons()[0])
    vi.advanceTimersByTime(400)
    hover(buttons()[1])

    expect(tooltip.element.textContent).toBe('Link')
})

it('hides when the pointer leaves the toolbar buttons', () => {
    hover(buttons()[0])
    vi.advanceTimersByTime(400)
    leave(buttons()[0])

    expect(tooltip.element.hidden).toBe(true)
})

it('does not show when the pointer leaves before the delay', () => {
    hover(buttons()[0])
    leave(buttons()[0])
    vi.advanceTimersByTime(400)

    expect(tooltip.element.hidden).toBe(true)
})

it('hides when a button is pressed', () => {
    hover(buttons()[0])
    vi.advanceTimersByTime(400)
    buttons()[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))

    expect(tooltip.element.hidden).toBe(true)
})

it('stays out of the way of an open menu', () => {
    hover(buttons()[3])
    vi.advanceTimersByTime(400)

    expect(tooltip.element.hidden).toBe(true)
})

it('shows straight away for keyboard focus', () => {
    buttons()[0].focus()

    expect(tooltip.element.hidden).toBe(false)
    expect(tooltip.element.textContent).toBe('BoldCtrl+B')
})

it('is hidden from assistive technology', () => {
    expect(tooltip.element.getAttribute('aria-hidden')).toBe('true')
})

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { bindToolbar, ensureTabStop, focusToolbar, syncToolbar } from '../../resources/js/toolbar/tools'
import { doc, makeEditor, p } from './support/make-editor'

const tools = {
    bold: { command: 'toggleBold', arguments: [], active: { name: 'bold', attributes: [] }, checksAvailability: false, hidesInListItem: false },
    levelUp: { command: 'increaseBlockLevel', arguments: [], active: null, checksAvailability: false, hidesInListItem: true },
}

const codeBlock = { type: 'codeBlock', content: [{ type: 'text', text: 'code' }] }
const bulletList = { type: 'bulletList', content: [{ type: 'listItem', content: [p('item')] }] }

let editor
let toolbar

const button = (name) => toolbar.querySelector(`[data-rep-tool="${name}"]`)

beforeEach(() => {
    toolbar = document.createElement('div')
    toolbar.innerHTML = `
        <span data-rep-inline-tools><button data-rep-tool="bold" tabindex="-1"></button></span>
        <span data-rep-block-tools><button data-rep-tool="levelUp" tabindex="-1"></button></span>
        <button data-rep-control="more" tabindex="-1"></button>
        <span hidden><button data-rep-tool="hiddenTool" tabindex="-1"></button></span>
    `
    document.body.append(toolbar)
})

afterEach(() => {
    editor.destroy()
    document.body.innerHTML = ''
})

it('disables formatting tools where marks are not allowed, instead of hiding them', () => {
    editor = makeEditor(doc(codeBlock, p('abc')))
    editor.commands.setTextSelection(2)

    syncToolbar(editor, toolbar, tools, { hideUnavailable: false })

    expect(button('bold').getAttribute('aria-disabled')).toBe('true')
    expect(button('bold').hidden).toBe(false)
})

it('enables formatting tools again where marks are allowed', () => {
    editor = makeEditor(doc(codeBlock, p('abc')))
    editor.commands.setTextSelection(2)
    syncToolbar(editor, toolbar, tools, { hideUnavailable: false })

    editor.commands.setTextSelection(8)
    syncToolbar(editor, toolbar, tools, { hideUnavailable: false })

    expect(button('bold').getAttribute('aria-disabled')).toBe('false')
})

it('disables a tool that hides in a list item, instead of hiding it or its section', () => {
    editor = makeEditor(doc(bulletList))
    editor.commands.setTextSelection(3)

    syncToolbar(editor, toolbar, tools, { hideUnavailable: false })

    expect(button('levelUp').getAttribute('aria-disabled')).toBe('true')
    expect(button('levelUp').hidden).toBe(false)
    expect(toolbar.querySelector('[data-rep-block-tools]').hidden).toBe(false)
})

it('still hides a tool in a list item by default, as the floating toolbar does', () => {
    editor = makeEditor(doc(bulletList))
    editor.commands.setTextSelection(3)

    syncToolbar(editor, toolbar, tools)

    expect(button('levelUp').hidden).toBe(true)
    expect(toolbar.querySelector('[data-rep-block-tools]').hidden).toBe(true)
})

it('ignores a click on a disabled tool', () => {
    editor = makeEditor(doc(p('abc')))
    bindToolbar(editor, toolbar, tools, vi.fn())
    editor.commands.setTextSelection({ from: 1, to: 3 })

    button('bold').setAttribute('aria-disabled', 'true')
    button('bold').click()

    expect(editor.isActive('bold')).toBe(false)

    button('bold').setAttribute('aria-disabled', 'false')
    button('bold').click()

    expect(editor.isActive('bold')).toBe(true)
})

it('leaves buttons in hidden groups out of keyboard navigation', () => {
    editor = makeEditor(doc(p('abc')))
    bindToolbar(editor, toolbar, tools, vi.fn())

    focusToolbar(toolbar)
    toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))

    expect(document.activeElement).toBe(toolbar.querySelector('[data-rep-control="more"]'))
})

it('gives a toolbar one tab stop on its first visible button, and moves it off a hidden one', () => {
    editor = makeEditor(doc(p('abc')))

    ensureTabStop(toolbar)

    expect(button('bold').getAttribute('tabindex')).toBe('0')

    toolbar.querySelector('[data-rep-inline-tools]').hidden = true
    ensureTabStop(toolbar)

    expect(button('bold').getAttribute('tabindex')).toBe('-1')
    expect(button('levelUp').getAttribute('tabindex')).toBe('0')
})

it('keeps disabling instead of hiding after a click when told not to hide', () => {
    editor = makeEditor(doc(bulletList))
    bindToolbar(editor, toolbar, tools, vi.fn(), { hideUnavailable: false })
    editor.commands.setTextSelection(3)

    button('bold').click()

    expect(button('levelUp').hidden).toBe(false)
    expect(button('levelUp').getAttribute('aria-disabled')).toBe('true')
    expect(toolbar.querySelector('[data-rep-block-tools]').hidden).toBe(false)
})

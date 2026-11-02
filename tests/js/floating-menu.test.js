import { afterEach, expect, it, vi } from 'vitest'
import { FloatingMenu } from '../../resources/js/toolbar/floating-menu'

let menu

afterEach(() => {
    menu?.destroy()
    document.body.innerHTML = ''
})

function makeMenu(onSelect = vi.fn(), onClose = vi.fn()) {
    const element = document.createElement('div')
    const reference = document.createElement('button')

    element.hidden = true
    element.innerHTML = '<button data-item>one</button><button data-item>two</button><button data-item>three</button>'
    document.body.append(reference, element)

    menu = new FloatingMenu(element, { itemSelector: '[data-item]', onSelect, onClose })

    return { element, reference, onSelect, onClose, items: [...element.querySelectorAll('[data-item]')] }
}

const press = (element, key) =>
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

it('opens and focuses the first item', () => {
    const { element, reference, items } = makeMenu()

    menu.open(reference)

    expect(element.hidden).toBe(false)
    expect(reference.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(items[0])
})

it('focuses the checked item when there is one', () => {
    const { reference, items } = makeMenu()

    items[1].setAttribute('aria-checked', 'true')
    menu.open(reference)

    expect(document.activeElement).toBe(items[1])
})

it('moves with the arrow keys and wraps round', () => {
    const { element, reference, items } = makeMenu()

    menu.open(reference)

    press(element, 'ArrowUp')
    expect(document.activeElement).toBe(items[2])

    press(element, 'ArrowDown')
    expect(document.activeElement).toBe(items[0])

    press(element, 'End')
    expect(document.activeElement).toBe(items[2])

    press(element, 'Home')
    expect(document.activeElement).toBe(items[0])
})

it('closes on Escape and returns focus to the button', () => {
    const { element, reference, onClose } = makeMenu()

    reference.focus()
    menu.open(reference)
    press(element, 'Escape')

    expect(element.hidden).toBe(true)
    expect(reference.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(reference)
    expect(onClose).toHaveBeenCalled()
})

it('selects an item on click and closes', () => {
    const { element, reference, items, onSelect } = makeMenu()

    menu.open(reference)
    items[1].click()

    expect(onSelect).toHaveBeenCalledWith(items[1])
    expect(element.hidden).toBe(true)
})

it('closes when you click elsewhere', () => {
    const { element, reference } = makeMenu()

    menu.open(reference)
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))

    expect(element.hidden).toBe(true)
})

it('closes when the button is pressed again', () => {
    const { element, reference } = makeMenu()

    menu.open(reference)
    menu.open(reference)

    expect(element.hidden).toBe(true)
})

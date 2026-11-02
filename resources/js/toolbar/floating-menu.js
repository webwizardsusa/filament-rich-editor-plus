import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'

/**
 * A popup menu for a toolbar button, following the APG menu button pattern: arrow keys, Home/End, Escape back to the
 * button. Items are server-rendered; this only shows, positions and navigates them.
 */
export class FloatingMenu {
    constructor(element, { itemSelector, onSelect, onClose }) {
        this.element = element
        this.itemSelector = itemSelector
        this.onSelect = onSelect
        this.onClose = onClose
        this.reference = null
        this.cleanup = null

        this.handleKeydown = (event) => this.onKeydown(event)
        this.handleClick = (event) => this.onClick(event)
        this.handleMousedown = (event) => event.preventDefault()
        this.handleOutsidePointer = (event) => {
            if (!this.element.contains(event.target) && !this.reference?.contains(event.target)) {
                this.close({ restoreFocus: false })
            }
        }

        element.addEventListener('keydown', this.handleKeydown)
        element.addEventListener('click', this.handleClick)
        element.addEventListener('mousedown', this.handleMousedown)
    }

    get isOpen() {
        return this.reference !== null
    }

    get items() {
        return [...this.element.querySelectorAll(this.itemSelector)].filter((item) => !item.hidden)
    }

    open(reference) {
        if (this.isOpen) {
            this.close()

            return
        }

        this.reference = reference
        this.element.hidden = false
        reference.setAttribute('aria-expanded', 'true')

        this.cleanup = autoUpdate(reference, this.element, () => {
            computePosition(reference, this.element, {
                strategy: 'fixed',
                placement: 'bottom-start',
                middleware: [offset(4), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
                Object.assign(this.element.style, { left: `${x}px`, top: `${y}px` })
            })
        })

        document.addEventListener('pointerdown', this.handleOutsidePointer)

        const { items } = this

        ;(items.find((item) => item.getAttribute('aria-checked') === 'true') ?? items[0])?.focus()
    }

    close({ restoreFocus = true } = {}) {
        if (!this.isOpen) {
            return
        }

        const { reference } = this

        this.reference = null
        this.cleanup()
        this.element.hidden = true
        reference.setAttribute('aria-expanded', 'false')
        document.removeEventListener('pointerdown', this.handleOutsidePointer)

        if (restoreFocus) {
            reference.focus()
        }

        this.onClose?.()
    }

    onClick(event) {
        const item = event.target.closest(this.itemSelector)

        if (!item) {
            return
        }

        this.close({ restoreFocus: false })
        this.onSelect(item)
    }

    onKeydown(event) {
        const { items } = this
        const index = items.indexOf(document.activeElement)

        if (event.key === 'Tab') {
            this.close({ restoreFocus: false })

            return
        }

        const target = {
            ArrowDown: items[(index + 1) % items.length],
            ArrowUp: items[(index - 1 + items.length) % items.length],
            Home: items[0],
            End: items[items.length - 1],
        }[event.key]

        if (target) {
            event.preventDefault()
            target.focus()

            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            this.close()
        }
    }

    destroy() {
        this.close({ restoreFocus: false })
        this.element.removeEventListener('keydown', this.handleKeydown)
        this.element.removeEventListener('click', this.handleClick)
        this.element.removeEventListener('mousedown', this.handleMousedown)
    }
}

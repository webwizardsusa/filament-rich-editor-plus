import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { announce } from '../live-region'

// Floating UI measures asynchronously, so it can still ask for the position just after the menu has closed.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }

/**
 * The list behind the slash and mention menus: positions it at the cursor, tracks the highlighted row and handles the
 * keyboard. Focus stays in the editor, with `aria-activedescendant` pointing at the highlighted row.
 */
export function createSuggestionList({ editor, root, element, renderItems, optionFor }) {
    let current = null
    let items = []
    let highlighted = 0
    let isBusy = false
    let stopPositioning = null

    const setHighlight = (index) => {
        highlighted = index

        items.forEach((item, itemIndex) => {
            optionFor(item)?.setAttribute('aria-selected', itemIndex === index ? 'true' : 'false')
        })

        const option = optionFor(items[index])

        if (option) {
            editor.view.dom.setAttribute('aria-activedescendant', option.id)
            option.scrollIntoView({ block: 'nearest' })
        }
    }

    const hide = () => {
        stopPositioning?.()
        stopPositioning = null
        element.hidden = true
        editor.view.dom.removeAttribute('aria-activedescendant')
    }

    const reveal = () => {
        element.hidden = false

        if (stopPositioning) {
            return
        }

        const reference = { getBoundingClientRect: () => current?.clientRect?.() ?? emptyRect }

        stopPositioning = autoUpdate(reference, element, () => {
            computePosition(reference, element, {
                strategy: 'fixed',
                placement: 'bottom-start',
                middleware: [offset(4), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
                Object.assign(element.style, { left: `${x}px`, top: `${y}px` })
            })
        })
    }

    const onMousedown = (event) => event.preventDefault()

    element.addEventListener('mousedown', onMousedown)

    return {
        get isOpen() {
            return !element.hidden
        },

        select(item) {
            current?.command(item)
        },

        setBusy(busy) {
            isBusy = busy
        },

        start(props) {
            current = props
            root.setAttribute('data-rep-suggesting', '')
            editor.view.dom.setAttribute('aria-controls', element.id)
            editor.view.dom.setAttribute('aria-autocomplete', 'list')
        },

        show(props, nextItems) {
            current = props
            items = nextItems

            // With nothing to pick, this is just text, so the toolbar can come back.
            root.toggleAttribute('data-rep-suggesting', items.length > 0)
            renderItems(items)

            if (!items.length) {
                hide()

                return
            }

            reveal()
            setHighlight(0)
        },

        /**
         * Shows a message in place of rows, such as "Searching…". There is nothing to pick, so Enter stays normal. A
         * listbox may only hold options, so the message is drawn hidden from assistive technology and read out through
         * the field's live region instead.
         */
        showStatus(props, draw, message) {
            current = props
            items = []
            root.setAttribute('data-rep-suggesting', '')
            draw()
            editor.view.dom.removeAttribute('aria-activedescendant')
            reveal()
            announce(root.querySelector('[data-rep-live]'), message)
        },

        onKeyDown(event) {
            if (event.key === 'Escape') {
                return true
            }

            if (isBusy && (event.key === 'Enter' || event.key === 'Tab')) {
                return true
            }

            if (!items.length || element.hidden) {
                return false
            }

            if (event.key === 'ArrowDown') {
                setHighlight((highlighted + 1) % items.length)

                return true
            }

            if (event.key === 'ArrowUp') {
                setHighlight((highlighted - 1 + items.length) % items.length)

                return true
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
                current.command(items[highlighted])

                return true
            }

            return false
        },

        /**
         * Lets go without touching the list, for when another menu sharing the element has taken it over.
         */
        forget() {
            items = []
            current = null
            isBusy = false
            stopPositioning?.()
            stopPositioning = null
        },

        exit() {
            items = []
            current = null
            isBusy = false
            root.removeAttribute('data-rep-suggesting')
            editor.view.dom.removeAttribute('aria-controls')
            editor.view.dom.removeAttribute('aria-autocomplete')
            hide()
        },

        destroy() {
            stopPositioning?.()
            element.removeEventListener('mousedown', onMousedown)
        },
    }
}

/**
 * Plugins handle keys in order, so a menu goes first: otherwise the Enter keymap wins and splits the paragraph.
 */
export function registerSuggestion(editor, plugin) {
    editor.registerPlugin(plugin, (newPlugin, plugins) => [newPlugin, ...plugins])
}

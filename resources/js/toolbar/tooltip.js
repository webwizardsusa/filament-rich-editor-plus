import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'

const SHOW_DELAY = 400

// Moving from one button to the next while a tooltip is up shows the next one straight away.
const WARM_PERIOD = 300

const KEY_NAMES = {
    ArrowUp: ['↑', '↑'],
    ArrowDown: ['↓', '↓'],
    ArrowLeft: ['←', '←'],
    ArrowRight: ['→', '→'],
    Enter: ['↩', 'Enter'],
    Backspace: ['⌫', 'Backspace'],
    Delete: ['⌦', 'Delete'],
    Escape: ['Esc', 'Esc'],
    Space: ['Space', 'Space'],
}

const MODIFIER_NAMES = {
    Mod: ['⌘', 'Ctrl'],
    Meta: ['⌘', 'Win'],
    Cmd: ['⌘', 'Win'],
    Ctrl: ['⌃', 'Ctrl'],
    Control: ['⌃', 'Ctrl'],
    Alt: ['⌥', 'Alt'],
    Shift: ['⇧', 'Shift'],
}

const ARIA_MODIFIERS = { Mod: null, Meta: 'Meta', Cmd: 'Meta', Ctrl: 'Control', Control: 'Control', Alt: 'Alt', Shift: 'Shift' }

export const isMacPlatform = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgentData?.platform ?? navigator.platform ?? '')

/**
 * Splits a TipTap shortcut such as `Mod-Shift-s` into its parts. A trailing `-` is the minus key, as in `Mod--`.
 */
const splitShortcut = (shortcut) => {
    const parts = shortcut.split('-')

    if (shortcut.endsWith('-')) {
        parts.splice(-2, 2, '-')
    }

    return parts
}

/**
 * Formats a TipTap shortcut for display: `⌘⇧S` on a Mac, `Ctrl+Shift+S` elsewhere.
 */
export function formatShortcut(shortcut, isMac = isMacPlatform()) {
    const parts = splitShortcut(shortcut).map((part, index, all) => {
        const names = index < all.length - 1 ? MODIFIER_NAMES[part] : KEY_NAMES[part]

        return names ? names[isMac ? 0 : 1] : part.length === 1 ? part.toUpperCase() : part
    })

    return parts.join(isMac ? '' : '+')
}

/**
 * Formats a TipTap shortcut as an `aria-keyshortcuts` value, such as `Control+Shift+S`.
 */
export function toAriaKeyShortcut(shortcut, isMac = isMacPlatform()) {
    return splitShortcut(shortcut)
        .map((part, index, all) => {
            if (index === all.length - 1) {
                return part.length === 1 ? part.toUpperCase() : part
            }

            return ARIA_MODIFIERS[part] ?? (isMac ? 'Meta' : 'Control')
        })
        .join('+')
}

/**
 * Shows a button's name, and its shortcut when it has one, above it while it is hovered or has keyboard focus. The
 * name comes from `aria-label`, so labels the browser changes stay current, or from `data-rep-tooltip` for a button
 * hidden from assistive technology. The tooltip itself is hidden from it too, since the button already says the same.
 */
export function createToolbarTooltip({ root, toolbars, isMac = isMacPlatform() }) {
    const element = document.createElement('div')
    const label = document.createElement('span')
    const keys = document.createElement('kbd')

    element.className = 'rep-tooltip'
    element.hidden = true
    element.setAttribute('aria-hidden', 'true')
    label.className = 'rep-tooltip-label'
    keys.className = 'rep-tooltip-keys'
    element.append(label, keys)
    root.append(element)

    let current = null
    let cleanup = null
    let showTimeout = null
    let hiddenAt = 0

    const buttonFrom = (target) => target?.closest?.('.rep-tool')

    const textFor = (button) => button.getAttribute('aria-label') ?? button.dataset.repTooltip ?? ''

    const show = (button) => {
        clearTimeout(showTimeout)

        const text = textFor(button)

        if (!text || button.getAttribute('aria-expanded') === 'true') {
            return
        }

        cleanup?.()
        current = button
        label.textContent = text
        keys.textContent = button.dataset.repShortcut ? formatShortcut(button.dataset.repShortcut, isMac) : ''
        keys.hidden = !button.dataset.repShortcut
        element.hidden = false

        cleanup = autoUpdate(button, element, () => {
            computePosition(button, element, {
                strategy: 'fixed',
                placement: 'top',
                middleware: [offset(6), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
                Object.assign(element.style, { left: `${x}px`, top: `${y}px` })
            })
        })
    }

    const schedule = (button) => {
        clearTimeout(showTimeout)

        if (current || Date.now() - hiddenAt < WARM_PERIOD) {
            show(button)

            return
        }

        showTimeout = setTimeout(() => show(button), SHOW_DELAY)
    }

    const hide = () => {
        clearTimeout(showTimeout)

        if (!current) {
            return
        }

        cleanup?.()
        cleanup = null
        current = null
        element.hidden = true
        hiddenAt = Date.now()
    }

    const hideNow = () => {
        hide()
        hiddenAt = 0
    }

    const isKeyboardFocus = (button) => {
        try {
            return button.matches(':focus-visible')
        } catch {
            return true
        }
    }

    const listeners = {
        pointerover: (event) => {
            const button = buttonFrom(event.target)

            if (button && button !== current) {
                schedule(button)
            }
        },
        pointerout: (event) => {
            if (buttonFrom(event.target) && !buttonFrom(event.relatedTarget)) {
                hide()
            }
        },
        pointerdown: hideNow,
        focusin: (event) => {
            const button = buttonFrom(event.target)

            if (button && isKeyboardFocus(button)) {
                show(button)
            }
        },
        focusout: (event) => {
            if (!buttonFrom(event.relatedTarget)) {
                hide()
            }
        },
        keydown: (event) => {
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                hideNow()
            }
        },
    }

    toolbars.forEach((toolbar) => {
        toolbar.querySelectorAll('[data-rep-shortcut]').forEach((button) => {
            button.setAttribute('aria-keyshortcuts', toAriaKeyShortcut(button.dataset.repShortcut, isMac))
        })

        Object.entries(listeners).forEach(([type, listener]) => toolbar.addEventListener(type, listener))
    })

    return {
        element,
        hide: hideNow,
        destroy() {
            hideNow()
            toolbars.forEach((toolbar) =>
                Object.entries(listeners).forEach(([type, listener]) => toolbar.removeEventListener(type, listener)),
            )
            element.remove()
        },
    }
}

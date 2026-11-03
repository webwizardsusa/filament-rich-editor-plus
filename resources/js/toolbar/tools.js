import { getActiveList } from '../blocks/active-block'
import { resolveActionArguments } from '../registry'
import { allowsFormatting } from './block-controls'

const isHiddenWithin = (toolbar, element) => {
    for (let current = element; current && current !== toolbar; current = current.parentElement) {
        if (current.hidden) {
            return true
        }
    }

    return false
}

const toolButtons = (toolbar) =>
    [...toolbar.querySelectorAll('[data-rep-tool], [data-rep-control]')].filter(
        (button) => !isHiddenWithin(toolbar, button),
    )

const normalizeAttributes = (attributes) => (Array.isArray(attributes) ? {} : (attributes ?? {}))

export function runTool(editor, tool, mountAction) {
    if (tool?.action) {
        mountAction(tool.action, resolveActionArguments(tool.action, editor))

        return
    }

    if (!tool?.command) {
        return
    }

    const chain = editor.chain().focus()

    if (typeof chain[tool.command] !== 'function') {
        console.warn(`[rich-editor-plus] The editor has no [${tool.command}] command.`)

        return
    }

    chain[tool.command](...(tool.arguments ?? [])).run()
}

/**
 * Reflects the editor's current marks and nodes onto a toolbar's buttons. With `hideUnavailable` off, as in the fixed
 * toolbar, a tool that can't be used here is disabled instead of hidden, so the toolbar keeps its shape as the cursor
 * moves.
 */
export function syncToolbar(editor, toolbar, tools, { hideUnavailable = true } = {}) {
    const isInList = Boolean(getActiveList(editor.state.selection))
    const canFormat = allowsFormatting(editor.state)

    toolbar.querySelectorAll('[data-rep-tool]').forEach((button) => {
        const tool = tools[button.dataset.repTool]
        const active = tool?.active
        const isActive = Boolean(active) && editor.isActive(active.name, normalizeAttributes(active.attributes))
        const isUnavailable =
            Boolean(tool?.checksAvailability) && !editor.can()[tool.command](...(tool.arguments ?? []))

        button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
        button.classList.toggle('rep-tool-active', isActive)

        if (!hideUnavailable) {
            const isOutOfPlace =
                (Boolean(tool?.hidesInListItem) && isInList) ||
                (!canFormat && Boolean(button.closest('[data-rep-inline-tools]')))

            button.setAttribute('aria-disabled', isUnavailable || isOutOfPlace ? 'true' : 'false')

            return
        }

        if (tool?.checksAvailability) {
            button.setAttribute('aria-disabled', isUnavailable ? 'true' : 'false')
        }

        if (tool?.hidesInListItem) {
            button.hidden = isInList
        }
    })

    if (!hideUnavailable) {
        return
    }

    // A section with no tools showing would leave its divider behind.
    toolbar.querySelectorAll('[data-rep-block-tools]').forEach((section) => {
        section.hidden = [...section.querySelectorAll('[data-rep-tool]')].every((button) => button.hidden)
    })
}

/**
 * Makes a server-rendered toolbar work: buttons run their tool without stealing focus from the editor, and the
 * toolbar follows the APG toolbar pattern (roving tabindex, arrow keys, Home/End, Escape back to the editor).
 * `hideUnavailable` is passed on to `syncToolbar` after each click.
 */
export function bindToolbar(editor, toolbar, tools, mountAction, { hideUnavailable = true } = {}) {
    toolbar.addEventListener('mousedown', (event) => {
        if (event.target.closest('[data-rep-tool], [data-rep-control]')) {
            event.preventDefault()
        }
    })

    toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-rep-tool]')

        if (!button || button.getAttribute('aria-disabled') === 'true') {
            return
        }

        runTool(editor, tools[button.dataset.repTool], mountAction)
        syncToolbar(editor, toolbar, tools, { hideUnavailable })
    })

    toolbar.addEventListener('keydown', (event) => {
        const buttons = toolButtons(toolbar)
        const index = buttons.indexOf(document.activeElement)

        if (event.key === 'Escape') {
            event.preventDefault()
            editor.commands.focus()

            return
        }

        if (index === -1) {
            return
        }

        const target = {
            ArrowRight: buttons[(index + 1) % buttons.length],
            ArrowLeft: buttons[(index - 1 + buttons.length) % buttons.length],
            Home: buttons[0],
            End: buttons[buttons.length - 1],
        }[event.key]

        if (!target) {
            return
        }

        event.preventDefault()
        focusButton(toolbar, target)
    })
}

/**
 * Moves the toolbar's one tab stop to `target`. Hidden buttons are reset too, or one could keep a stale tab stop and
 * become a second one when it shows again.
 */
export function setTabStop(toolbar, target) {
    toolbar.querySelectorAll('[data-rep-tool], [data-rep-control]').forEach((button) => {
        button.setAttribute('tabindex', button === target ? '0' : '-1')
    })
}

export function focusButton(toolbar, target) {
    setTabStop(toolbar, target)
    target.focus()
}

/**
 * Keeps a toolbar that is always in the tab order reachable: when no visible button has the tab stop, as when the
 * group holding it hides, the first visible button takes it.
 */
export function ensureTabStop(toolbar) {
    const buttons = toolButtons(toolbar)

    if (buttons.length && !buttons.some((button) => button.getAttribute('tabindex') === '0')) {
        setTabStop(toolbar, buttons[0])
    }
}

export function focusToolbar(toolbar) {
    const buttons = toolButtons(toolbar)

    if (buttons.length) {
        focusButton(toolbar, buttons[0])
    }
}

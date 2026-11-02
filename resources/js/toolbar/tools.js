import { getActiveList } from '../blocks/active-block'
import { resolveActionArguments } from '../registry'

const toolButtons = (toolbar) =>
    [...toolbar.querySelectorAll('[data-rep-tool], [data-rep-control]')].filter(
        (button) => !button.closest('[data-rep-block-toolbar] [hidden]'),
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
 * Reflects the editor's current marks and nodes onto a toolbar's buttons.
 */
export function syncToolbar(editor, toolbar, tools) {
    const isInList = Boolean(getActiveList(editor.state.selection))

    toolbar.querySelectorAll('[data-rep-tool]').forEach((button) => {
        const tool = tools[button.dataset.repTool]
        const active = tool?.active
        const isActive = Boolean(active) && editor.isActive(active.name, normalizeAttributes(active.attributes))

        button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
        button.classList.toggle('rep-tool-active', isActive)

        if (tool?.checksAvailability) {
            button.setAttribute('aria-disabled', editor.can()[tool.command](...(tool.arguments ?? [])) ? 'false' : 'true')
        }

        if (tool?.hidesInListItem) {
            button.hidden = isInList
        }
    })

    // A section with no tools showing would leave its divider behind.
    toolbar.querySelectorAll('[data-rep-block-tools]').forEach((section) => {
        section.hidden = [...section.querySelectorAll('[data-rep-tool]')].every((button) => button.hidden)
    })
}

/**
 * Makes a server-rendered toolbar work: buttons run their tool without stealing focus from the editor, and the
 * toolbar follows the APG toolbar pattern (roving tabindex, arrow keys, Home/End, Escape back to the editor).
 */
export function bindToolbar(editor, toolbar, tools, mountAction) {
    toolbar.addEventListener('mousedown', (event) => {
        if (event.target.closest('[data-rep-tool], [data-rep-control]')) {
            event.preventDefault()
        }
    })

    toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-rep-tool]')

        if (!button) {
            return
        }

        runTool(editor, tools[button.dataset.repTool], mountAction)
        syncToolbar(editor, toolbar, tools)
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
export function focusButton(toolbar, target) {
    toolbar.querySelectorAll('[data-rep-tool], [data-rep-control]').forEach((button) => {
        button.setAttribute('tabindex', button === target ? '0' : '-1')
    })

    target.focus()
}

export function focusToolbar(toolbar) {
    const buttons = toolButtons(toolbar)

    if (buttons.length) {
        focusButton(toolbar, buttons[0])
    }
}

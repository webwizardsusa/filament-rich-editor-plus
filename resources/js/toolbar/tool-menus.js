import { FloatingMenu } from './floating-menu'
import { formatShortcut } from './tooltip'

const normalizeAttributes = (attributes) => (Array.isArray(attributes) ? {} : (attributes ?? {}))

/**
 * Whether a tool or menu item is the current one. With no name, the attributes alone are checked, so
 * `{ textAlign: 'center' }` matches a centred paragraph or heading.
 */
export function isToolActive(editor, active) {
    if (!active) {
        return false
    }

    // An extension can report its own state, for tools that toggle a view rather than a mark or node.
    if (active.name && typeof editor.storage?.[active.name]?.isActive === 'boolean') {
        return editor.storage[active.name].isActive
    }

    const attributes = normalizeAttributes(active.attributes)

    return active.name ? editor.isActive(active.name, attributes) : editor.isActive(attributes)
}

const escapeSelector = (value) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&'))

const canRun = (editor, item) => {
    const can = editor.can()

    return typeof can[item.command] === 'function' && Boolean(can[item.command](...(item.arguments ?? [])))
}

/**
 * The menus behind menu tools (`Tool::menu()` in PHP), one per tool and shared by every toolbar showing it. A menu
 * tool's button shows the current item's icon (or swatch) and name, and is disabled while none of its items can run. The
 * current item is the first active one, else the one marked `fallback`.
 */
export function createToolMenus({ editor, root, tools }) {
    const menus = new Map()
    const genericIcons = new WeakMap()

    root.querySelectorAll('[data-rep-tool-menu]').forEach((element) => {
        const name = element.dataset.repToolMenu
        const items = tools?.[name]?.menu

        if (!items) {
            return
        }

        element.querySelectorAll('[data-rep-menu-item] [data-rep-shortcut]').forEach((hint) => {
            hint.textContent = formatShortcut(hint.dataset.repShortcut)
        })

        const floatingMenu = new FloatingMenu(element, {
            itemSelector: '[data-rep-menu-item]',
            onSelect: (itemElement) => {
                const item = items.find((candidate) => candidate.name === itemElement.dataset.repMenuItem)

                if (!item || itemElement.getAttribute('aria-disabled') === 'true' || !item.command) {
                    editor.view.focus()

                    return
                }

                editor
                    .chain()
                    .focus()
                    [item.command](...(item.arguments ?? []))
                    .run()
            },
        })

        menus.set(name, { element, items, floatingMenu })
    })

    const syncButton = (button, { element, items }) => {
        const current = items.find((item) => isToolActive(editor, item.active)) ?? items.find((item) => item.fallback) ?? null
        const runnable = items.map((item) => canRun(editor, item))

        items.forEach((item, index) => {
            const itemElement = element.querySelector(`[data-rep-menu-item="${escapeSelector(item.name)}"]`)

            itemElement?.setAttribute('aria-checked', item === current ? 'true' : 'false')
            itemElement?.setAttribute('aria-disabled', runnable[index] ? 'false' : 'true')
        })

        button.setAttribute('aria-disabled', editor.isEditable && runnable.some(Boolean) ? 'false' : 'true')

        const currentName = current?.name ?? ''

        if (button.dataset.repCurrent === currentName) {
            return
        }

        if (!genericIcons.has(button)) {
            genericIcons.set(button, button.innerHTML)
        }

        const itemElement = current && element.querySelector(`[data-rep-menu-item="${escapeSelector(current.name)}"]`)
        const source = itemElement?.querySelector('[data-rep-menu-icon]') ?? itemElement?.querySelector('svg')

        if (source) {
            button.replaceChildren(source.cloneNode(true))
        } else {
            button.innerHTML = genericIcons.get(button)
        }

        const { repLabel, repGenericLabel } = button.dataset

        button.setAttribute(
            'aria-label',
            current && repLabel ? repLabel.replace(':item', () => current.label ?? current.name) : repGenericLabel,
        )
        button.dataset.repCurrent = currentName
    }

    return {
        floatingElements: [...menus.values()].map(({ element }) => element),

        open(name, button) {
            menus.get(name)?.floatingMenu.open(button)
        },

        sync(toolbar) {
            toolbar.querySelectorAll('[data-rep-tool][aria-haspopup="menu"]').forEach((button) => {
                const menu = menus.get(button.dataset.repTool)

                if (menu) {
                    syncButton(button, menu)
                }
            })
        },

        closeMenus() {
            menus.forEach(({ floatingMenu }) => floatingMenu.close({ restoreFocus: false }))
        },

        destroy() {
            menus.forEach(({ floatingMenu }) => floatingMenu.destroy())
        },
    }
}

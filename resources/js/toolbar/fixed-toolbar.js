import { Plugin, PluginKey } from '@tiptap/pm/state'
import { getActiveBlock } from '../blocks/active-block'
import { bindToolbar, ensureTabStop, syncToolbar } from './tools'

export const fixedToolbarKeymapKey = new PluginKey('repFixedToolbarKeymap')

/**
 * Makes the server-rendered toolbar above the editor work. It stays in place: tools that can't be used at the cursor
 * are disabled rather than hidden, and only its block tools section changes, showing the active block's own group
 * next to the one for every block. It is a normal tab stop, on one button at a time.
 */
export function createFixedToolbar({ editor, toolbar, tools, blockControls, mountAction }) {
    const blockGroups = [...toolbar.querySelectorAll('[data-rep-block-tools-for]')]
    const blockSection = toolbar.querySelector('[data-rep-block-tools]')

    bindToolbar(editor, toolbar, tools, mountAction, { hideUnavailable: false })
    blockControls?.bind(toolbar)

    const syncBlockTools = () => {
        const node = getActiveBlock(editor.state)?.node.type.name

        blockGroups.forEach((group) => {
            const { repBlockToolsFor } = group.dataset

            group.hidden = repBlockToolsFor !== '*' && repBlockToolsFor !== node
        })

        if (blockSection) {
            blockSection.hidden = !blockGroups.some((group) => !group.hidden && group.querySelector('[data-rep-tool]'))
        }
    }

    const sync = () => {
        syncToolbar(editor, toolbar, tools, { hideUnavailable: false })
        blockControls?.sync(toolbar, { hideUnavailable: false })
        syncBlockTools()
        ensureTabStop(toolbar)
    }

    editor.on('transaction', sync)
    sync()

    return {
        sync,

        focus() {
            ensureTabStop(toolbar)

            const target = toolbar.querySelector('[tabindex="0"]')

            target?.focus()

            return Boolean(target)
        },

        destroy() {
            editor.off('transaction', sync)
        },
    }
}

/**
 * Alt+F10 moves focus into the fixed toolbar. Only for an editor with no floating toolbar, whose plugin handles the
 * key itself. While a suggestion menu is open the key does nothing, as with the floating toolbar.
 */
export function createFixedToolbarKeymap(fixedToolbar, root) {
    return new Plugin({
        key: fixedToolbarKeymapKey,

        props: {
            handleKeyDown(view, event) {
                if (event.key !== 'F10' || !event.altKey) {
                    return false
                }

                if (root?.hasAttribute('data-rep-suggesting')) {
                    return true
                }

                return fixedToolbar.focus()
            },
        },
    })
}

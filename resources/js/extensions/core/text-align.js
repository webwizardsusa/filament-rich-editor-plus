import { Extension } from '@tiptap/core'

const SHORTCUTS = { left: 'Mod-Shift-l', center: 'Mod-Shift-e', right: 'Mod-Shift-r', justify: 'Mod-Shift-j' }

/**
 * Sets `textAlign` on every block of the given types in the selection. Returns false when there is none, so `can()`
 * tells the toolbar where alignment is possible (TipTap's `updateAttributes` reports success either way).
 */
const alignSelectedBlocks = (types, value) => ({ tr, dispatch }) => {
    const targets = []

    tr.selection.ranges.forEach(({ $from, $to }) => {
        tr.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (types.includes(node.type.name)) {
                targets.push({ node, pos })
            }
        })
    })

    if (!targets.length) {
        return false
    }

    if (dispatch) {
        targets.forEach(({ node, pos }) => tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: value }))
    }

    return true
}

/**
 * The commands and shortcuts for `TextAlignPlugin`. The `textAlign` attribute itself comes from the plugin's global
 * attribute, so this extension adds no schema.
 */
export function textAlignExtension({ alignments, types, defaultAlignment }) {
    return Extension.create({
        name: 'textAlignCommands',

        addCommands() {
            return {
                setTextAlign:
                    (alignment) =>
                    (props) => {
                        if (!alignments.includes(alignment)) {
                            return false
                        }

                        return alignSelectedBlocks(types, alignment === defaultAlignment ? null : alignment)(props)
                    },

                unsetTextAlign: () => (props) => alignSelectedBlocks(types, null)(props),
            }
        },

        /**
         * Each key is claimed even where alignment can't apply, so Ctrl/Cmd+Shift+R never reloads the page.
         */
        addKeyboardShortcuts() {
            return Object.fromEntries(
                alignments.map((alignment) => [
                    SHORTCUTS[alignment],
                    () => {
                        this.editor.commands.setTextAlign(alignment)

                        return true
                    },
                ]),
            )
        },
    })
}

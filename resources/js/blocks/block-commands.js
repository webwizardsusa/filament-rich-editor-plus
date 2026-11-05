import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { Mapping } from '@tiptap/pm/transform'
import { getActiveBlock, getLevelContainer, isListNode, selectionSpansBlocks, selectsNestedBlock } from './active-block'
import { convertList, itemTypeOf } from './convert-list'
import { deleteBlockAt, duplicateBlockAt, moveBlock } from './move-block'

/**
 * The active block, unless the selection crosses blocks or is a block nested inside it: these commands act on exactly
 * one top-level block, and it has to be what looks selected.
 */
const singleBlock = (tr) => (selectionSpansBlocks(tr) || selectsNestedBlock(tr) ? null : getActiveBlock(tr))

/**
 * Whether "select parent" stops at a node. Paragraphs and list items are skipped: there is nothing useful to do with
 * them once selected, and they would mean extra clicks to reach the list.
 */
const isParentBlock = (nodeType) => isListNode(nodeType) || nodeType.name === 'blockquote'

const moveByOne = (direction) => ({ tr, dispatch }) => {
    const block = singleBlock(tr)

    if (!block) {
        return false
    }

    const index = tr.doc.resolve(block.pos).index(0)
    const neighbour = direction < 0 ? tr.doc.maybeChild(index - 1) : tr.doc.maybeChild(index + 1)

    if (!neighbour) {
        return false
    }

    if (dispatch) {
        const gapPos =
            direction < 0 ? block.pos - neighbour.nodeSize : block.pos + block.node.nodeSize + neighbour.nodeSize

        moveBlock(tr, block.pos, gapPos)
        tr.scrollIntoView()
    }

    return true
}

/**
 * The editor event a block move fires, with `'up'` or `'down'`, so the toolbar can announce moves made from the
 * keyboard as well as its own buttons.
 */
export const BLOCK_MOVED_EVENT = 'repBlockMoved'

/**
 * Moves the selected block up or down, and fires {@see BLOCK_MOVED_EVENT} when it moved.
 */
export function moveSelectedBlock(editor, direction) {
    const moved = direction === 'up' ? editor.commands.moveBlockUp() : editor.commands.moveBlockDown()

    if (moved) {
        editor.emit(BLOCK_MOVED_EVENT, direction)
    }

    return moved
}

/**
 * Whole-block operations for the block toolbar. Each runs in one transaction, so it is one undo step.
 */
export const BlockCommands = Extension.create({
    name: 'repBlockCommands',

    addCommands() {
        return {
            moveBlockUp: () => moveByOne(-1),

            moveBlockDown: () => moveByOne(1),

            moveBlockTo: (blockPos, gapPos) => ({ tr }) => moveBlock(tr, blockPos, gapPos),

            duplicateBlock: () => ({ tr, dispatch }) => {
                const block = singleBlock(tr)

                if (!block) {
                    return false
                }

                if (dispatch) {
                    duplicateBlockAt(tr, block.pos)
                }

                return true
            },

            deleteBlock: () => ({ tr, dispatch }) => {
                const block = singleBlock(tr)

                if (!block) {
                    return false
                }

                if (dispatch) {
                    deleteBlockAt(tr, block.pos)
                }

                return true
            },

            selectParentBlock: () => ({ tr, dispatch }) => {
                const { $from, to } = tr.selection

                for (let depth = $from.sharedDepth(to); depth > 0; depth--) {
                    if (isParentBlock($from.node(depth).type)) {
                        if (dispatch) {
                            tr.setSelection(NodeSelection.create(tr.doc, $from.before(depth)))
                        }

                        return true
                    }
                }

                return false
            },

            /**
             * TipTap's toggle removes the list when it is already that type, so that case is a no-op here. Between list
             * types with different items, such as bullet and task lists, the list is rebuilt in place so nesting stays. That
             * rebuild also converts nested lists of the same type, while bullet and numbered lists (TipTap's toggleList)
             * convert only the list at the cursor.
             */
            setListType: (name) => ({ state, tr, dispatch, commands }) => {
                const container = getLevelContainer(state.selection)
                const targetType = state.schema.nodes[name]

                if (!container?.isListItem || !targetType || !isListNode(targetType)) {
                    return false
                }

                const listDepth = container.depth - 1
                const list = state.selection.$from.node(listDepth)

                if (list.type === targetType) {
                    return true
                }

                if (itemTypeOf(list.type) === itemTypeOf(targetType)) {
                    return commands.toggleList(name, itemTypeOf(targetType).name)
                }

                if (dispatch) {
                    const pos = state.selection.$from.before(listDepth)

                    tr.replaceWith(pos, pos + list.nodeSize, convertList(list, targetType))
                    tr.setSelection(state.selection.map(tr.doc, new Mapping()))
                }

                return true
            },

            increaseBlockLevel: () => ({ state, commands }) => {
                const container = getLevelContainer(state.selection)

                if (container?.isListItem) {
                    return commands.sinkListItem(container.name)
                }

                return container?.name === 'blockquote' && commands.wrapIn('blockquote')
            },

            decreaseBlockLevel: () => ({ state, commands }) => {
                const container = getLevelContainer(state.selection)

                if (container?.isListItem) {
                    return commands.liftListItem(container.name)
                }

                return container?.name === 'blockquote' && commands.lift('blockquote')
            },
        }
    },

    addKeyboardShortcuts() {
        return {
            'Alt-Shift-ArrowUp': () => moveSelectedBlock(this.editor, 'up'),
            'Alt-Shift-ArrowDown': () => moveSelectedBlock(this.editor, 'down'),
        }
    },
})

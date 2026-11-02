import { Extension } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { getActiveBlock, getActiveList, getLevelContainer, selectionSpansBlocks, selectsNestedBlock } from './active-block'
import { deleteBlockAt, duplicateBlockAt, moveBlock } from './move-block'

/**
 * The active block, unless the selection crosses blocks or is a block nested inside it: these commands act on exactly
 * one top-level block, and it has to be what looks selected.
 */
const singleBlock = (tr) => (selectionSpansBlocks(tr) || selectsNestedBlock(tr) ? null : getActiveBlock(tr))

/**
 * The blocks "select parent" stops at. Paragraphs and list items are skipped: there is nothing useful to do with them
 * once selected, and they would mean extra clicks to reach the list.
 */
const PARENT_BLOCKS = ['bulletList', 'orderedList', 'blockquote']

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
                    if (PARENT_BLOCKS.includes($from.node(depth).type.name)) {
                        if (dispatch) {
                            tr.setSelection(NodeSelection.create(tr.doc, $from.before(depth)))
                        }

                        return true
                    }
                }

                return false
            },

            /**
             * TipTap's toggle removes the list when it is already that type, so that case is a no-op here.
             */
            setListType: (name) => ({ state, commands }) => {
                const list = getActiveList(state.selection)

                if (!list) {
                    return false
                }

                return list.type.name === name || commands.toggleList(name, 'listItem')
            },

            increaseBlockLevel: () => ({ state, commands }) => {
                const container = getLevelContainer(state.selection)?.name

                if (container === 'listItem') {
                    return commands.sinkListItem('listItem')
                }

                return container === 'blockquote' && commands.wrapIn('blockquote')
            },

            decreaseBlockLevel: () => ({ state, commands }) => {
                const container = getLevelContainer(state.selection)?.name

                if (container === 'listItem') {
                    return commands.liftListItem('listItem')
                }

                return container === 'blockquote' && commands.lift('blockquote')
            },
        }
    },

    addKeyboardShortcuts() {
        return {
            'Alt-Shift-ArrowUp': () => this.editor.commands.moveBlockUp(),
            'Alt-Shift-ArrowDown': () => this.editor.commands.moveBlockDown(),
        }
    },
})

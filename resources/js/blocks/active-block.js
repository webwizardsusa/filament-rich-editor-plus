import { NodeSelection } from '@tiptap/pm/state'

/**
 * The top-level block the selection is in, like Gutenberg's "current block". A selection that starts at the top of
 * the document, such as select-all, anchors to the first block. Takes anything with `selection` and `doc`, so a state
 * or a transaction.
 */
export function getActiveBlock({ selection, doc }) {
    if (selection instanceof NodeSelection && selection.$from.depth === 0) {
        return { node: selection.node, pos: selection.from }
    }

    if (selection.$from.depth < 1) {
        return selection.empty || !doc.firstChild ? null : { node: doc.firstChild, pos: 0 }
    }

    return { node: selection.$from.node(1), pos: selection.$from.before(1) }
}

/**
 * The nearest list item or quote around the cursor, with its depth. Lists and quotes can nest inside each other, and
 * this is the one the cursor is really in.
 */
export function getLevelContainer({ $from }) {
    for (let depth = $from.depth; depth > 0; depth--) {
        const { name } = $from.node(depth).type

        if (name === 'listItem' || name === 'blockquote') {
            return { name, depth }
        }
    }

    return null
}

/**
 * The list the cursor is directly in, or null when it is outside a list or in a quote inside one.
 */
export function getActiveList(selection) {
    const container = getLevelContainer(selection)

    return container?.name === 'listItem' ? selection.$from.node(container.depth - 1) : null
}

/**
 * Whether a block below the top level is selected as a node, such as a list inside a quote. Whole-block operations
 * work on the top-level block, so they would hit something bigger than what looks selected.
 */
export function selectsNestedBlock({ selection }) {
    return selection instanceof NodeSelection && selection.node.isBlock && selection.$from.depth > 0
}

/**
 * How many top-level paragraphs the selection covers, when it covers two or more and nothing else. Otherwise 0.
 */
export function countSelectedParagraphs({ selection, doc }) {
    let count = 0
    let hasOtherBlocks = false

    doc.forEach((node, offset) => {
        if (offset < selection.to && offset + node.nodeSize > selection.from) {
            count++
            hasOtherBlocks ||= node.type.name !== 'paragraph'
        }
    })

    return count > 1 && !hasOtherBlocks ? count : 0
}

/**
 * Whether the selection runs past the end of the active block.
 */
export function selectionSpansBlocks({ selection, doc }) {
    const block = getActiveBlock({ selection, doc })

    return Boolean(block) && selection.to > block.pos + block.node.nodeSize
}

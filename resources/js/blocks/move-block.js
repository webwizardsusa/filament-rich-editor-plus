import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state'

/**
 * Puts the selection back at the same place inside a block that now starts at `newPos`.
 */
function restoreSelection(tr, selection, oldPos, newPos) {
    if (selection instanceof NodeSelection) {
        tr.setSelection(NodeSelection.create(tr.doc, newPos))

        return
    }

    if (selection instanceof TextSelection) {
        tr.setSelection(
            TextSelection.create(tr.doc, newPos + selection.anchor - oldPos, newPos + selection.head - oldPos),
        )

        return
    }

    tr.setSelection(Selection.near(tr.doc.resolve(newPos + 1)))
}

/**
 * Moves the top-level block at `blockPos` to `gapPos`, a position between two top-level blocks. Returns false,
 * without touching the transaction, when that would not change anything.
 */
export function moveBlock(tr, blockPos, gapPos) {
    const node = tr.doc.nodeAt(blockPos)

    if (!node) {
        return false
    }

    const blockEnd = blockPos + node.nodeSize

    if (gapPos >= blockPos && gapPos <= blockEnd) {
        return false
    }

    const { selection } = tr
    const holdsSelection = selection.from >= blockPos && selection.to <= blockEnd
    const newPos = gapPos < blockPos ? gapPos : gapPos - node.nodeSize

    tr.delete(blockPos, blockEnd)
    tr.insert(newPos, node)

    if (holdsSelection) {
        restoreSelection(tr, selection, blockPos, newPos)
    }

    return true
}

/**
 * Inserts a copy of the block after it and moves the selection into the copy.
 */
export function duplicateBlockAt(tr, blockPos) {
    const node = tr.doc.nodeAt(blockPos)
    const copyPos = blockPos + node.nodeSize
    const { selection } = tr

    tr.insert(copyPos, node)
    restoreSelection(tr, selection, blockPos, copyPos)
}

/**
 * Removes the block. A document can never be empty, so the last block is replaced with an empty paragraph.
 */
export function deleteBlockAt(tr, blockPos) {
    const node = tr.doc.nodeAt(blockPos)
    const blockEnd = blockPos + node.nodeSize

    if (tr.doc.childCount === 1) {
        tr.replaceWith(blockPos, blockEnd, tr.doc.type.schema.nodes.paragraph.create())
        tr.setSelection(TextSelection.create(tr.doc, blockPos + 1))

        return
    }

    tr.delete(blockPos, blockEnd)
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(blockPos, tr.doc.content.size))))
}

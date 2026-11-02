import { getActiveBlock } from '../blocks/active-block'

/**
 * Marks a drag as a block from a toolbar handle. It carries no text on purpose: given `text/plain`, ProseMirror in
 * another editor on the page would paste that text at the drop.
 */
const BLOCK_DRAG_TYPE = 'application/x-rep-block'

/**
 * Where each top-level block is on screen. Measured during the drag, because the page can scroll while it runs.
 */
export function measureBlocks(view) {
    const blocks = []

    view.state.doc.forEach((node, pos) => {
        const dom = view.nodeDOM(pos)

        if (dom instanceof HTMLElement) {
            const { top, bottom } = dom.getBoundingClientRect()

            blocks.push({ pos, end: pos + node.nodeSize, top, bottom })
        }
    })

    return blocks
}

/**
 * The gap between top-level blocks nearest a pointer's Y position, and where to draw it.
 */
export function findDropGap(blocks, y) {
    for (const { pos, top, bottom } of blocks) {
        if (y < (top + bottom) / 2) {
            return { pos, y: top }
        }
    }

    const last = blocks.at(-1)

    return last ? { pos: last.end, y: last.bottom } : null
}

/**
 * Dragging a block by the toolbar's handle. ProseMirror's own drop handling would let a block land inside a quote,
 * list or table cell, so while this drag runs, capture-phase listeners on the editor root keep `dragover` and `drop`
 * from reaching it, and the block only ever lands between top-level blocks. Any other drag is left alone.
 */
export function createBlockDrag({ editor, root }) {
    const line = document.createElement('div')

    line.className = 'rep-drop-line'
    line.hidden = true
    root.append(line)

    let dragged = null

    const release = () => {
        if (root.hasAttribute('data-rep-drag-hold')) {
            root.removeAttribute('data-rep-drag-hold')
            editor.commands.focus()
        }
    }

    // The mouse can be released where this page never hears about it, and the window has lost focus anyway.
    const releaseWithoutFocus = () => root.removeAttribute('data-rep-drag-hold')

    const finish = () => {
        dragged = null
        line.hidden = true
        root.removeAttribute('data-rep-dragging')
        release()
    }

    const onMousedown = (event) => {
        if (event.target.closest?.('[data-rep-drag-handle]')) {
            root.setAttribute('data-rep-drag-hold', '')
        }
    }

    const onDragstart = (event) => {
        const handle = event.target.closest?.('[data-rep-drag-handle]')

        if (!handle) {
            return
        }

        const block = getActiveBlock(editor.state)
        const dom = block ? editor.view.nodeDOM(block.pos) : null

        if (handle.getAttribute('aria-disabled') === 'true' || !(dom instanceof HTMLElement)) {
            event.preventDefault()

            return
        }

        dragged = block
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData(BLOCK_DRAG_TYPE, block.node.type.name)
        event.dataTransfer.setDragImage(dom, 0, 0)

        root.setAttribute('data-rep-dragging', '')
    }

    const isBlockFromAnotherEditor = (event) =>
        !dragged && [...(event.dataTransfer?.types ?? [])].includes(BLOCK_DRAG_TYPE)

    const onDragover = (event) => {
        if (isBlockFromAnotherEditor(event)) {
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'none'

            return
        }

        if (!dragged) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'

        const gap = findDropGap(measureBlocks(editor.view), event.clientY)

        if (gap) {
            line.hidden = false
            line.style.top = `${gap.y - root.getBoundingClientRect().top}px`
        }
    }

    const onDrop = (event) => {
        if (isBlockFromAnotherEditor(event)) {
            event.preventDefault()
            event.stopPropagation()

            return
        }

        if (!dragged) {
            return
        }

        event.preventDefault()
        event.stopPropagation()

        // A Livewire update can replace the document during a drag, which would make the position stale.
        const isSameBlock = editor.state.doc.nodeAt(dragged.pos) === dragged.node

        // The drop's own position, because the last `dragover` can be well behind a fast drag.
        const gap = findDropGap(measureBlocks(editor.view), event.clientY)

        if (gap && isSameBlock) {
            editor.commands.moveBlockTo(dragged.pos, gap.pos)
        }

        finish()
    }

    const onDragleave = (event) => {
        if (dragged && !root.contains(event.relatedTarget)) {
            line.hidden = true
        }
    }

    root.addEventListener('mousedown', onMousedown)
    root.addEventListener('dragstart', onDragstart)
    root.addEventListener('dragover', onDragover, true)
    root.addEventListener('drop', onDrop, true)
    root.addEventListener('dragleave', onDragleave)
    root.addEventListener('dragend', finish)
    document.addEventListener('mouseup', release)
    window.addEventListener('blur', releaseWithoutFocus)

    return {
        destroy() {
            root.removeEventListener('mousedown', onMousedown)
            root.removeEventListener('dragstart', onDragstart)
            root.removeEventListener('dragover', onDragover, true)
            root.removeEventListener('drop', onDrop, true)
            root.removeEventListener('dragleave', onDragleave)
            root.removeEventListener('dragend', finish)
            document.removeEventListener('mouseup', release)
            window.removeEventListener('blur', releaseWithoutFocus)
            line.remove()
        },
    }
}

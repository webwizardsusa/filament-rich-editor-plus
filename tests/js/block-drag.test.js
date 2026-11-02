import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createBlockDrag, findDropGap } from '../../resources/js/toolbar/block-drag'
import { blockSummary, doc, makeEditor, p } from './support/make-editor'

let editor
let root
let drag
let handle

const fakeTransfer = () => ({ setData: vi.fn(), setDragImage: vi.fn() })

function fire(target, type, { clientY = 0, dataTransfer = fakeTransfer() } = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true })

    Object.assign(event, { clientY, dataTransfer })
    target.dispatchEvent(event)

    return event
}

/**
 * jsdom has no layout, so give each top-level block a 20px row.
 */
function layOutBlocks() {
    editor.state.doc.forEach((node, offset, index) => {
        const dom = editor.view.nodeDOM(offset)

        dom.getBoundingClientRect = () => ({ top: index * 20, bottom: index * 20 + 20 })
    })
}

beforeEach(() => {
    root = document.createElement('div')
    handle = document.createElement('button')
    handle.setAttribute('data-rep-drag-handle', '')
    root.append(handle)
    document.body.append(root)

    editor = makeEditor(doc(p('a'), p('b'), p('c')))
    drag = createBlockDrag({ editor, root })
    layOutBlocks()
})

afterEach(() => {
    drag.destroy()
    editor.destroy()
    document.body.innerHTML = ''
})

it('picks the gap nearest the pointer', () => {
    const blocks = [
        { pos: 0, end: 3, top: 0, bottom: 20 },
        { pos: 3, end: 6, top: 20, bottom: 40 },
    ]

    expect(findDropGap(blocks, 5)).toEqual({ pos: 0, y: 0 })
    expect(findDropGap(blocks, 15)).toEqual({ pos: 3, y: 20 })
    expect(findDropGap(blocks, 39)).toEqual({ pos: 6, y: 40 })
    expect(findDropGap(blocks, 500)).toEqual({ pos: 6, y: 40 })
})

it('has no gap in an empty measurement', () => {
    expect(findDropGap([], 5)).toBeNull()
})

it('moves the active block to the gap on drop', () => {
    editor.commands.setTextSelection(1)

    fire(handle, 'dragstart')
    expect(root.hasAttribute('data-rep-dragging')).toBe(true)

    const over = fire(root, 'dragover', { clientY: 55 })

    expect(over.defaultPrevented).toBe(true)
    expect(root.querySelector('.rep-drop-line').hidden).toBe(false)

    fire(root, 'drop', { clientY: 55 })

    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:c', 'paragraph:a'])
    expect(root.hasAttribute('data-rep-dragging')).toBe(false)
    expect(root.querySelector('.rep-drop-line').hidden).toBe(true)
})

it('lands where the drop happens, even if the last dragover was somewhere else', () => {
    editor.commands.setTextSelection(1)

    fire(handle, 'dragstart')
    fire(root, 'dragover', { clientY: 5 })
    fire(root, 'drop', { clientY: 55 })

    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:c', 'paragraph:a'])
})

it('still drops after the browser reports leaving the editor mid-drag', () => {
    editor.commands.setTextSelection(1)

    fire(handle, 'dragstart')
    fire(root, 'dragover', { clientY: 55 })
    fire(root, 'dragleave')
    fire(root, 'drop', { clientY: 55 })

    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:c', 'paragraph:a'])
})

it('marks the drag as a block, without offering text another editor could paste', () => {
    editor.commands.setTextSelection(1)

    const dataTransfer = fakeTransfer()

    fire(handle, 'dragstart', { dataTransfer })

    expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-rep-block', expect.any(String))
    expect(dataTransfer.setData).not.toHaveBeenCalledWith('text/plain', expect.anything())
})

it('keeps a block dragged from another editor away from this one', () => {
    const reachedEditor = vi.fn()
    const dataTransfer = { ...fakeTransfer(), types: ['application/x-rep-block'] }

    root.append(editor.view.dom)
    editor.view.dom.addEventListener('dragover', reachedEditor)
    editor.view.dom.addEventListener('drop', reachedEditor)

    fire(editor.view.dom, 'dragover', { clientY: 25, dataTransfer })

    const drop = fire(editor.view.dom, 'drop', { clientY: 25, dataTransfer })

    expect(reachedEditor).not.toHaveBeenCalled()
    expect(drop.defaultPrevented).toBe(true)
    expect(dataTransfer.dropEffect).toBe('none')
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b', 'paragraph:c'])
})

it('only ever lands between top-level blocks, even over a quote', () => {
    editor.destroy()
    drag.destroy()

    editor = makeEditor(doc(p('a'), { type: 'blockquote', content: [p('q'), p('r')] }, p('c')))
    drag = createBlockDrag({ editor, root })
    layOutBlocks()

    editor.commands.setTextSelection(1)

    fire(handle, 'dragstart')
    fire(root, 'dragover', { clientY: 35 })
    fire(root, 'drop', { clientY: 35 })

    expect(editor.getJSON().content.map(({ type }) => type)).toEqual(['blockquote', 'paragraph', 'paragraph'])
    expect(editor.getJSON().content[0].content).toHaveLength(2)
})

it('leaves drags it did not start alone, such as one from another editor', () => {
    const over = fire(root, 'dragover', { clientY: 25 })
    const drop = fire(root, 'drop', { clientY: 25 })

    expect(over.defaultPrevented).toBe(false)
    expect(drop.defaultPrevented).toBe(false)
    expect(root.querySelector('.rep-drop-line').hidden).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b', 'paragraph:c'])
})

it('does not move the wrong block when the content changed during the drag', () => {
    editor.commands.setTextSelection(1)

    fire(handle, 'dragstart')

    editor.commands.setContent(doc(p('x'), p('y')), { emitUpdate: false })
    layOutBlocks()

    fire(root, 'dragover', { clientY: 35 })
    fire(root, 'drop', { clientY: 35 })

    expect(blockSummary(editor)).toEqual(['paragraph:x', 'paragraph:y'])
})

it('refuses to start from a disabled handle', () => {
    handle.setAttribute('aria-disabled', 'true')

    const start = fire(handle, 'dragstart')

    expect(start.defaultPrevented).toBe(true)
    expect(root.hasAttribute('data-rep-dragging')).toBe(false)
})

it('cleans up when the drag is cancelled', () => {
    editor.commands.setTextSelection(1)

    fire(handle, 'dragstart')
    fire(root, 'dragover', { clientY: 55 })
    fire(handle, 'dragend')

    expect(root.hasAttribute('data-rep-dragging')).toBe(false)
    expect(root.querySelector('.rep-drop-line').hidden).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b', 'paragraph:c'])
})

it('lets go of the handle if the window loses focus mid-press, without stealing focus back', () => {
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    const focus = vi.spyOn(editor.commands, 'focus')

    window.dispatchEvent(new Event('blur'))

    expect(root.hasAttribute('data-rep-drag-hold')).toBe(false)
    expect(focus).not.toHaveBeenCalled()
})

it('keeps the toolbar alive between pressing the handle and letting go', () => {
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(root.hasAttribute('data-rep-drag-hold')).toBe(true)

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(root.hasAttribute('data-rep-drag-hold')).toBe(false)
})

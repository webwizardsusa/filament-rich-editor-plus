import { CellSelection } from '@tiptap/pm/tables'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { afterEach, expect, it } from 'vitest'
import { getActiveBlock, selectionSpansBlocks } from '../../resources/js/blocks/active-block'
import { blockSummary, doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const threeParagraphs = () => doc(p('a'), p('b'), p('c'))

it('moves a block up and keeps the cursor inside it', () => {
    editor = makeEditor(threeParagraphs())
    editor.commands.setTextSelection(5)

    expect(editor.commands.moveBlockUp()).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:a', 'paragraph:c'])
    expect(editor.state.selection.from).toBe(2)
})

it('moves a block down and keeps the cursor inside it', () => {
    editor = makeEditor(threeParagraphs())
    editor.commands.setTextSelection(1)

    expect(editor.commands.moveBlockDown()).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:a', 'paragraph:c'])
    expect(editor.state.selection.from).toBe(4)
})

it('refuses to move past the ends of the document', () => {
    editor = makeEditor(threeParagraphs())

    editor.commands.setTextSelection(1)
    expect(editor.can().moveBlockUp()).toBe(false)

    editor.commands.setTextSelection(7)
    expect(editor.can().moveBlockDown()).toBe(false)
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b', 'paragraph:c'])
})

it('undoes a move in one step', () => {
    editor = makeEditor(threeParagraphs())
    editor.commands.setTextSelection(5)
    editor.commands.moveBlockUp()

    editor.commands.undo()

    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b', 'paragraph:c'])
})

it('moves a block to a gap further away', () => {
    editor = makeEditor(threeParagraphs())
    editor.commands.setTextSelection(1)

    expect(editor.commands.moveBlockTo(0, editor.state.doc.content.size)).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:c', 'paragraph:a'])
    expect(getActiveBlock(editor.state).node.textContent).toBe('a')
})

it('treats a drop next to the block as no move', () => {
    editor = makeEditor(threeParagraphs())
    editor.commands.setTextSelection(1)

    expect(editor.commands.moveBlockTo(0, 3)).toBe(false)
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b', 'paragraph:c'])
})

it('keeps a selected divider selected as it moves', () => {
    editor = makeEditor(doc(p('a'), { type: 'horizontalRule' }))
    editor.commands.setNodeSelection(3)

    editor.commands.moveBlockUp()

    expect(blockSummary(editor)).toEqual(['horizontalRule', 'paragraph:a'])
    expect(editor.state.selection).toBeInstanceOf(NodeSelection)
    expect(editor.state.selection.from).toBe(0)
})

it('moves a table while cells are selected', () => {
    const cell = (text) => ({ type: 'tableCell', content: [p(text)] })

    editor = makeEditor(
        doc(p('a'), { type: 'table', content: [{ type: 'tableRow', content: [cell('x'), cell('y')] }] }),
    )

    editor.view.dispatch(
        editor.state.tr.setSelection(CellSelection.create(editor.state.doc, 5, 10)),
    )

    expect(editor.commands.moveBlockUp()).toBe(true)
    expect(blockSummary(editor)[0]).toBe('table:xy')
    expect(getActiveBlock(editor.state).node.type.name).toBe('table')
})

it('duplicates a block after itself and moves the cursor into the copy', () => {
    editor = makeEditor(doc(p('a'), p('b')))
    editor.commands.setTextSelection(1)

    expect(editor.commands.duplicateBlock()).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:a', 'paragraph:b'])
    expect(editor.state.selection.from).toBe(4)
})

it('deletes a block and leaves the cursor in a neighbour', () => {
    editor = makeEditor(doc(p('a'), p('b')))
    editor.commands.setTextSelection(1)

    expect(editor.commands.deleteBlock()).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph:b'])
    expect(editor.state.selection).toBeInstanceOf(TextSelection)
})

it('leaves an empty paragraph when the last block is deleted', () => {
    editor = makeEditor(doc({ type: 'horizontalRule' }))
    editor.commands.setNodeSelection(0)

    expect(editor.commands.deleteBlock()).toBe(true)
    expect(blockSummary(editor)).toEqual(['paragraph'])
})

it('moves with Alt+Shift+Arrow', () => {
    editor = makeEditor(threeParagraphs())
    editor.commands.setTextSelection(5)

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, shiftKey: true })

    editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event))

    expect(blockSummary(editor)).toEqual(['paragraph:b', 'paragraph:a', 'paragraph:c'])
})

it('finds the top-level block, even from inside a quote', () => {
    editor = makeEditor(doc({ type: 'blockquote', content: [p('q')] }))
    editor.commands.setTextSelection(2)

    expect(getActiveBlock(editor.state).node.type.name).toBe('blockquote')
})

it('anchors to the first block for a select-all', () => {
    editor = makeEditor(doc(p('a'), p('b')))
    editor.commands.selectAll()

    expect(getActiveBlock(editor.state).node.textContent).toBe('a')
    expect(selectionSpansBlocks(editor.state)).toBe(true)
})

it('knows when a selection crosses blocks', () => {
    editor = makeEditor(doc(p('abc'), p('def')))

    editor.commands.setTextSelection({ from: 1, to: 3 })
    expect(selectionSpansBlocks(editor.state)).toBe(false)

    editor.commands.setTextSelection({ from: 2, to: 7 })
    expect(selectionSpansBlocks(editor.state)).toBe(true)
})

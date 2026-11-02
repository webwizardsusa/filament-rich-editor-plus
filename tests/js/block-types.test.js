import { afterEach, describe, expect, it, vi } from 'vitest'
import { canRunBlockType, findBlockType, runBlockType, switchBlock } from '../../resources/js/blocks/block-types'
import { blockTypes, named } from './support/block-types'
import { blockSummary, doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => {
    editor?.destroy()
    vi.restoreAllMocks()
})

const sources = {
    paragraph: p('hello'),
    heading2: { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'hello' }] },
    heading3: { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'hello' }] },
    bulletList: { type: 'bulletList', content: [{ type: 'listItem', content: [p('hello')] }] },
    orderedList: { type: 'orderedList', content: [{ type: 'listItem', content: [p('hello')] }] },
    blockquote: { type: 'blockquote', content: [p('hello')] },
    codeBlock: { type: 'codeBlock', content: [{ type: 'text', text: 'hello' }] },
}

const pairs = Object.keys(sources).flatMap((from) =>
    Object.keys(sources)
        .filter((to) => to !== from)
        .map((to) => [from, to]),
)

describe('switching', () => {
    it.each(pairs)('switches %s to %s, keeps the text, and undoes in one step', (from, to) => {
        editor = makeEditor(doc(sources[from]))
        editor.commands.focus('end')

        expect(switchBlock(editor, named(to), blockTypes)).toBe(true)

        expect(findBlockType(blockTypes, editor.state.doc.firstChild).name).toBe(to)
        expect(editor.state.doc.childCount).toBe(1)
        expect(editor.state.doc.textContent).toBe('hello')

        editor.commands.undo()

        expect(findBlockType(blockTypes, editor.state.doc.firstChild).name).toBe(from)
    })

    it('keeps the cursor where it was', () => {
        editor = makeEditor(doc(p('hello')))
        editor.commands.setTextSelection(3)

        switchBlock(editor, named('heading2'), blockTypes)
        expect(editor.state.selection.from).toBe(3)

        switchBlock(editor, named('blockquote'), blockTypes)
        expect(editor.state.selection.from).toBe(4)
    })

    it('splits a multi-item list into one block per item', () => {
        const item = (text) => ({ type: 'listItem', content: [p(text)] })

        editor = makeEditor(doc({ type: 'bulletList', content: [item('a'), item('b'), item('c')] }))
        editor.commands.setTextSelection(3)

        switchBlock(editor, named('heading2'), blockTypes)

        expect(blockSummary(editor)).toEqual(['heading:a', 'heading:b', 'heading:c'])
    })

    it('flattens a nested list', () => {
        const nested = { type: 'bulletList', content: [{ type: 'listItem', content: [p('b')] }] }

        editor = makeEditor(doc({ type: 'bulletList', content: [{ type: 'listItem', content: [p('a'), nested] }] }))
        editor.commands.setTextSelection(3)

        switchBlock(editor, named('paragraph'), blockTypes)

        expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b'])
    })

    it('splits a multi-paragraph quote', () => {
        editor = makeEditor(doc({ type: 'blockquote', content: [p('a'), p('b')] }))
        editor.commands.setTextSelection(2)

        switchBlock(editor, named('paragraph'), blockTypes)

        expect(blockSummary(editor)).toEqual(['paragraph:a', 'paragraph:b'])
    })

    it('leaves other blocks alone', () => {
        editor = makeEditor(doc(p('first'), p('second'), p('third')))
        editor.commands.setTextSelection(9)

        switchBlock(editor, named('heading2'), blockTypes)

        expect(blockSummary(editor)).toEqual(['paragraph:first', 'heading:second', 'paragraph:third'])
    })

    it('drops marks when switching to a code block', () => {
        editor = makeEditor(doc({ type: 'paragraph', content: [{ type: 'text', text: 'hi', marks: [{ type: 'bold' }] }] }))
        editor.commands.setTextSelection(2)

        switchBlock(editor, named('codeBlock'), blockTypes)

        expect(editor.getJSON().content[0]).toEqual({
            type: 'codeBlock',
            attrs: expect.anything(),
            content: [{ type: 'text', text: 'hi' }],
        })
    })

    it('makes one paragraph per line out of a code block', () => {
        editor = makeEditor(doc({ type: 'codeBlock', content: [{ type: 'text', text: 'one\n\ntwo' }] }))
        editor.commands.setTextSelection(2)

        switchBlock(editor, named('paragraph'), blockTypes)

        expect(blockSummary(editor)).toEqual(['paragraph:one', 'paragraph', 'paragraph:two'])
    })

    it('does nothing when the block is already that type', () => {
        editor = makeEditor(doc(p('hello')))
        editor.commands.setTextSelection(2)

        expect(switchBlock(editor, named('paragraph'), blockTypes)).toBe(false)
    })

    it('does not switch a table or a divider', () => {
        editor = makeEditor(doc({ type: 'horizontalRule' }, p('after')))
        editor.commands.setNodeSelection(0)

        expect(switchBlock(editor, named('heading2'), blockTypes)).toBe(false)
        expect(blockSummary(editor)).toEqual(['horizontalRule', 'paragraph:after'])
    })

    it('does not switch across several blocks', () => {
        editor = makeEditor(doc(p('abc'), p('def')))
        editor.commands.setTextSelection({ from: 2, to: 7 })

        expect(switchBlock(editor, named('heading2'), blockTypes)).toBe(false)
    })
})

describe('recognising blocks', () => {
    it('matches on attributes', () => {
        editor = makeEditor(doc(sources.heading3))

        expect(findBlockType(blockTypes, editor.state.doc.firstChild).name).toBe('heading3')
    })

    it('returns nothing for a node with no block type', () => {
        editor = makeEditor(doc(p('x')))

        expect(findBlockType([named('heading2')], editor.state.doc.firstChild)).toBeUndefined()
    })
})

describe('running', () => {
    it('opens an action instead of running a command', () => {
        editor = makeEditor(doc(p('')))
        const mountAction = vi.fn()

        expect(runBlockType(editor, named('table'), blockTypes, mountAction)).toBe(true)
        expect(mountAction).toHaveBeenCalledWith('insertTable', {})
    })

    it('runs a command for a block that is not switchable', () => {
        editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] })
        editor.commands.setTextSelection(1)

        runBlockType(editor, named('divider'), blockTypes, vi.fn())

        expect(blockSummary(editor)).toEqual(['horizontalRule', 'paragraph'])
    })

    it('warns about a command the editor does not have', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        editor = makeEditor(doc(p('x')))

        const missing = { ...named('heading2'), command: 'setSomethingElse' }

        expect(canRunBlockType(editor, missing)).toBe(false)
        expect(runBlockType(editor, missing, blockTypes, vi.fn())).toBe(false)
        expect(warn).toHaveBeenCalled()
    })
})

import { afterEach, expect, it, vi } from 'vitest'
import { findReplaceKey } from '../../resources/js/find-replace/plugin'
import { runSlashItem } from '../../resources/js/slash/slash-menu'
import { doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const findState = () => findReplaceKey.getState(editor.state)

const selected = () => editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)

const openWith = (content, options) => {
    editor = makeEditor(content)
    editor.commands.setTextSelection(1)
    editor.commands.openFindReplace()
    editor.commands.setFindOptions(options)
}

const bold = (value) => ({ type: 'text', text: value, marks: [{ type: 'bold' }] })

const highlights = () => [...editor.view.dom.querySelectorAll('.rep-find-match')]

it('opens with the selected text as the query', () => {
    editor = makeEditor(doc(p('one two two')))
    editor.commands.setTextSelection({ from: 5, to: 8 })

    editor.commands.openFindReplace()

    expect(findState()).toMatchObject({ isOpen: true, query: 'two', currentIndex: 0 })
    expect(findState().matches).toHaveLength(2)
})

it('keeps the earlier query when nothing is selected', () => {
    openWith(doc(p('one two')), { query: 'two' })
    editor.commands.closeFindReplace()
    editor.commands.setTextSelection(1)

    editor.commands.openFindReplace()

    expect(findState()).toMatchObject({ isOpen: true, query: 'two' })
})

it.each([
    ['a selection across blocks', doc(p('one'), p('two')), { from: 2, to: 7 }],
    ['a selection across code lines', doc({ type: 'codeBlock', content: [{ type: 'text', text: 'a\nb' }] }), { from: 1, to: 4 }],
])('does not use %s as the query', (_, content, selection) => {
    editor = makeEditor(content)
    editor.commands.setTextSelection(selection)

    editor.commands.openFindReplace()

    expect(findState().query).toBe('')
})

it('starts at the first match at or after the cursor', () => {
    openWith(doc(p('aa aa aa')), { query: 'zz' })
    editor.commands.closeFindReplace()
    editor.commands.setTextSelection(4)
    editor.commands.openFindReplace()
    editor.commands.setFindOptions({ query: 'aa' })

    expect(findState().currentIndex).toBe(1)
})

it('counts one more open each time, even while open', () => {
    editor = makeEditor(doc(p('a')))

    editor.commands.openFindReplace()
    editor.commands.openFindReplace()

    expect(findState().openCount).toBe(2)
})

it('selects the first match as the query changes, without touching the replacement', () => {
    openWith(doc(p('one two')), { query: 'two' })

    expect(selected()).toBe('two')

    editor.commands.setTextSelection(1)
    editor.commands.setFindOptions({ replacement: 'x' })

    expect(editor.state.selection.empty).toBe(true)
    expect(findState().replacement).toBe('x')
})

it('searches again when a toggle changes', () => {
    openWith(doc(p('Cat cat')), { query: 'cat' })
    expect(findState().matches).toHaveLength(2)

    editor.commands.setFindOptions({ matchCase: true })

    expect(findState().matches).toHaveLength(1)
})

it('refuses options while closed', () => {
    editor = makeEditor(doc(p('a')))

    expect(editor.commands.setFindOptions({ query: 'a' })).toBe(false)
})

it('moves through matches and wraps round both ways', () => {
    openWith(doc(p('a a a')), { query: 'a' })

    editor.commands.findNext()
    expect(findState().currentIndex).toBe(1)

    editor.commands.findNext()
    editor.commands.findNext()
    expect(findState().currentIndex).toBe(0)

    editor.commands.findPrevious()
    expect(findState().currentIndex).toBe(2)
    expect(editor.state.selection.from).toBe(5)
})

it('selects the current match first when the selection has moved off it', () => {
    openWith(doc(p('a a a')), { query: 'a' })
    editor.commands.setTextSelection(4)

    editor.commands.findNext()

    expect(findState().currentIndex).toBe(0)
    expect(editor.state.selection.from).toBe(1)
})

it('cannot move or replace with no matches', () => {
    openWith(doc(p('abc')), { query: 'z' })

    expect(editor.commands.findNext()).toBe(false)
    expect(editor.commands.findPrevious()).toBe(false)
    expect(editor.commands.replaceCurrent()).toBe(false)
    expect(editor.commands.replaceAll()).toBe(false)
})

it('replaces the current match and moves to the next one', () => {
    openWith(doc(p('a b a')), { query: 'a' })
    editor.commands.setFindOptions({ replacement: 'x' })

    editor.commands.replaceCurrent()

    expect(editor.getText()).toBe('x b a')
    expect(findState().matches).toHaveLength(1)
    expect(editor.state.selection.from).toBe(5)
})

it('moves past new text that contains the query', () => {
    openWith(doc(p('a b a')), { query: 'a' })
    editor.commands.setFindOptions({ replacement: 'aa' })

    editor.commands.replaceCurrent()

    expect(editor.getText()).toBe('aa b a')
    expect(editor.state.selection.from).toBe(6)
})

it('replaces everything once, without looping on new text that contains the query', () => {
    openWith(doc(p('a a'), p('a')), { query: 'a' })
    editor.commands.setFindOptions({ replacement: 'aa' })

    editor.commands.replaceAll()

    expect(editor.state.doc.textContent).toBe('aa aaaa')
})

it('gives new text the marks of the first matched character', () => {
    openWith(doc({ type: 'paragraph', content: [bold('ca'), { type: 'text', text: 't' }] }), { query: 'cat' })
    editor.commands.setFindOptions({ replacement: 'dog' })

    editor.commands.replaceCurrent()

    expect(editor.getJSON().content[0].content).toEqual([bold('dog')])
})

it('deletes a match when the replacement is empty', () => {
    openWith(doc(p('a b')), { query: ' b' })

    editor.commands.replaceAll()

    expect(editor.getText()).toBe('a')
})

it('undoes Replace all in one step', () => {
    openWith(doc(p('a a'), p('a')), { query: 'a' })
    editor.commands.setFindOptions({ replacement: 'b' })
    editor.commands.replaceAll()

    editor.commands.undo()

    expect(editor.state.doc.textContent).toBe('a aa')
    expect(findState().matches).toHaveLength(3)
})

it('follows edits while open', () => {
    openWith(doc(p('a a')), { query: 'a' })
    editor.commands.findNext()

    editor.commands.insertContentAt(1, 'zz ')

    expect(findState().matches).toHaveLength(2)
    expect(findState().currentIndex).toBe(1)
})

it('searches content replaced from outside', () => {
    openWith(doc(p('a')), { query: 'a' })

    editor.commands.setContent(doc(p('a a a')))

    expect(findState().matches).toHaveLength(3)
})

it('highlights matches and the current one, only while open', () => {
    openWith(doc(p('a a')), { query: 'a' })

    expect(highlights()).toHaveLength(2)
    expect(editor.view.dom.querySelectorAll('.rep-find-current')).toHaveLength(1)

    editor.commands.closeFindReplace()

    expect(highlights()).toHaveLength(0)
})

it('does not search while closed', () => {
    openWith(doc(p('a')), { query: 'a' })
    editor.commands.closeFindReplace()

    editor.commands.insertContentAt(1, 'a')

    expect(findState().matches).toEqual([])
})

it('leaves the document and selection alone on closing', () => {
    openWith(doc(p('one two')), { query: 'two' })
    const before = editor.state.selection

    editor.commands.closeFindReplace()

    expect(editor.state.selection.eq(before)).toBe(true)
})

it('never changes saved content by searching', () => {
    const content = doc(p('one two'))
    openWith(content, { query: 'two' })
    editor.commands.findNext()

    expect(editor.getJSON()).toEqual(content)
    expect(editor.getHTML()).not.toContain('rep-find')
})

it('does not count as an edit', () => {
    editor = makeEditor(doc(p('one')))
    const onUpdate = vi.fn()
    editor.on('update', onUpdate)

    editor.commands.openFindReplace()
    editor.commands.setFindOptions({ query: 'one' })
    editor.commands.findNext()
    editor.commands.closeFindReplace()

    expect(onUpdate).not.toHaveBeenCalled()
})

it('refuses every command when the editor is not editable', () => {
    openWith(doc(p('a')), { query: 'a' })
    editor.setEditable(false)

    for (const command of ['openFindReplace', 'closeFindReplace', 'findNext', 'findPrevious', 'replaceCurrent', 'replaceAll']) {
        expect(editor.commands[command]()).toBe(false)
    }

    expect(editor.commands.setFindOptions({ query: 'b' })).toBe(false)
})

it('reports that it can open without opening', () => {
    editor = makeEditor(doc(p('a')))

    expect(editor.can().openFindReplace()).toBe(true)
    expect(findState().isOpen).toBe(false)
})

const slashFind = {
    name: 'findReplace',
    node: { name: null, attributes: {} },
    command: 'openFindReplace',
    arguments: [],
    action: null,
    switchable: false,
}

it('opens from the slash menu and removes what was typed', () => {
    editor = makeEditor(doc(p('/find')))

    runSlashItem(editor, { from: 1, to: 6 }, slashFind, [slashFind], vi.fn())

    expect(editor.getText()).toBe('')
    expect(findState().isOpen).toBe(true)
})

it('opens from the slash menu inside a quote', () => {
    editor = makeEditor(doc({ type: 'blockquote', content: [p('/find')] }))

    runSlashItem(editor, { from: 2, to: 7 }, slashFind, [slashFind], vi.fn())

    expect(editor.state.doc.textContent).toBe('')
    expect(findState().isOpen).toBe(true)
})

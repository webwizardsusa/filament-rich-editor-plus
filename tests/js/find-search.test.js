import { afterEach, expect, it } from 'vitest'
import { findMatches } from '../../resources/js/find-replace/search'
import { doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const search = (content, query, options = {}) => {
    editor = makeEditor(content)

    return findMatches(editor.state.doc, { query, matchCase: false, wholeWord: false, ...options }).map(({ from, to }) =>
        editor.state.doc.textBetween(from, to),
    )
}

const positions = (content, query, options = {}) => {
    editor = makeEditor(content)

    return findMatches(editor.state.doc, { query, matchCase: false, wholeWord: false, ...options })
}

const text = (value, marks) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })

it('finds every match in document order with exact positions', () => {
    expect(positions(doc(p('cat'), p('a cat')), 'cat')).toEqual([
        { from: 1, to: 4 },
        { from: 8, to: 11 },
    ])
})

it('finds nothing for an empty query', () => {
    expect(search(doc(p('abc')), '')).toEqual([])
})

it('ignores case unless match case is on', () => {
    expect(search(doc(p('Cat cat')), 'cat')).toEqual(['Cat', 'cat'])
    expect(search(doc(p('Cat cat')), 'cat', { matchCase: true })).toEqual(['cat'])
})

it.each(['a-b', 'c++', '[x]', '(y)', 'a.b', '$1', 'a/b', '^z', '{2}', 'a|b', 'a\\b'])(
    'treats %s as plain text',
    (query) => {
        expect(search(doc(p(`before ${query} after`)), query)).toEqual([query])
    },
)

it('does not treat a dot as a wildcard', () => {
    expect(search(doc(p('axb')), 'a.b')).toEqual([])
})

it('matches whole words only when asked', () => {
    expect(search(doc(p('cat concat cat_ cats cat')), 'cat', { wholeWord: true })).toEqual(['cat', 'cat'])
})

it('treats accented letters and combining marks as part of a word', () => {
    expect(search(doc(p('écat')), 'cat', { wholeWord: true })).toEqual([])
    expect(search(doc(p('caté cat')), 'cate', { wholeWord: true })).toEqual([])
})

it('keeps looking inside a rejected whole word candidate', () => {
    expect(search(doc(p('ba a a')), 'a a', { wholeWord: true })).toEqual(['a a'])
})

it('survives an astral query rejected by whole word', () => {
    expect(search(doc(p('a😀 😀')), '😀', { wholeWord: true })).toEqual(['😀'])
})

it('matches across marks', () => {
    const content = doc({
        type: 'paragraph',
        content: [text('ca'), text('t', [{ type: 'bold' }])],
    })

    expect(search(content, 'cat')).toEqual(['cat'])
})

it('does not match across a hard break, which also counts as a word boundary', () => {
    const content = doc({
        type: 'paragraph',
        content: [text('a'), { type: 'hardBreak' }, text('b')],
    })

    expect(search(content, 'ab')).toEqual([])
    expect(search(content, 'a', { wholeWord: true })).toEqual(['a'])
})

it('does not match across a mention, and keeps later positions correct', () => {
    const content = doc({
        type: 'paragraph',
        content: [
            text('a'),
            { type: 'mention', attrs: { id: '1', label: 'Ada', trigger: '@' } },
            text('b'),
        ],
    })

    expect(search(content, 'ab')).toEqual([])
    expect(search(content, 'Ada')).toEqual([])
    expect(positions(content, 'b')).toEqual([{ from: 3, to: 4 }])
})

it('never matches a mention through its placeholder character', () => {
    const content = doc({
        type: 'paragraph',
        content: [text('a'), { type: 'mention', attrs: { id: '1', label: 'Ada', trigger: '@' } }],
    })

    expect(search(content, '￼')).toEqual([])
})

it('does not match across blocks', () => {
    expect(search(doc(p('ab'), p('cd')), 'bc')).toEqual([])
})

it('searches code blocks, list items, quotes and table cells', () => {
    const content = doc(
        { type: 'codeBlock', content: [text('x\ny')] },
        { type: 'blockquote', content: [p('x')] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [p('x')] }] },
        {
            type: 'table',
            content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [p('x')] }] }],
        },
    )

    expect(search(content, 'x')).toHaveLength(4)
})

it('does not overlap matches', () => {
    expect(search(doc(p('aaaa')), 'aa')).toEqual(['aa', 'aa'])
})

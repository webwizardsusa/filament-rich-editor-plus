import { AllSelection, TextSelection } from '@tiptap/pm/state'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { switchBlock } from '../../resources/js/blocks/block-types'
import { createBlockControls } from '../../resources/js/toolbar/block-controls'
import { blockTypes, named } from './support/block-types'
import { doc, makeEditor, p } from './support/make-editor'
import { makeToolbarRoot } from './support/toolbar-markup'

let editor
let root
let toolbar
let controls

const item = (...content) => ({ type: 'listItem', content })
const bullets = (...items) => ({ type: 'bulletList', content: items })
const numbers = (...items) => ({ type: 'orderedList', attrs: { start: 1, type: null }, content: items })
const quote = (...content) => ({ type: 'blockquote', content })
const heading = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })

const threeParagraphs = () => doc(p('a'), p('b'), p('c'))

const switcher = () => toolbar.querySelector('[data-rep-control="switcher"]')
const switcherLabel = () => switcher().querySelector('[data-rep-switcher-label]').textContent
const switcherItem = (name) => root.querySelector(`[data-rep-switcher-menu] [data-rep-block-type="${name}"]`)

const open = (content) => {
    editor = makeEditor(content)
    controls = createBlockControls({ editor, root, blockTypes })
    controls.bind(toolbar)
}

const select = (from, to) => {
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)))
    controls.sync(toolbar)
}

const selectText = () => select(1, editor.state.doc.content.size - 1)

beforeEach(() => {
    root = makeToolbarRoot()
    toolbar = root.querySelector('[data-rep-block-toolbar]')
})

afterEach(() => {
    controls.destroy()
    editor.destroy()
    document.body.innerHTML = ''
})

it('enables the switcher for selected paragraphs and counts them', () => {
    open(threeParagraphs())
    selectText()

    expect(switcher().getAttribute('aria-disabled')).toBe('false')
    expect(switcherLabel()).toBe('3 blocks')
})

it('counts only the paragraphs in the selection', () => {
    open(threeParagraphs())
    select(1, 5)

    expect(switcherLabel()).toBe('2 blocks')
})

it('offers only the types that take several blocks, with none ticked', () => {
    open(threeParagraphs())
    selectText()

    expect(switcherItem('paragraph').hidden).toBe(true)
    expect(switcherItem('heading2').hidden).toBe(true)

    for (const name of ['bulletList', 'orderedList', 'blockquote']) {
        expect(switcherItem(name).hidden).toBe(false)
        expect(switcherItem(name).getAttribute('aria-checked')).toBe('false')
    }
})

it('brings every type back for a single block', () => {
    open(threeParagraphs())
    selectText()

    editor.commands.setTextSelection(1)
    controls.sync(toolbar)

    expect(switcherItem('heading2').hidden).toBe(false)
    expect(switcherLabel()).toBe('paragraph')
})

it('makes a bulleted list with one item per paragraph', () => {
    open(threeParagraphs())
    selectText()

    expect(switchBlock(editor, named('bulletList'), blockTypes)).toBe(true)
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')), item(p('b')), item(p('c')))))
})

it('makes a numbered list', () => {
    open(threeParagraphs())
    selectText()

    switchBlock(editor, named('orderedList'), blockTypes)

    expect(editor.getJSON()).toEqual(doc(numbers(item(p('a')), item(p('b')), item(p('c')))))
})

it('wraps the paragraphs in one quote', () => {
    open(threeParagraphs())
    selectText()

    switchBlock(editor, named('blockquote'), blockTypes)

    expect(editor.getJSON()).toEqual(doc(quote(p('a'), p('b'), p('c'))))
})

it('leaves paragraphs outside the selection alone', () => {
    open(threeParagraphs())
    select(1, 5)

    switchBlock(editor, named('bulletList'), blockTypes)

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')), item(p('b'))), p('c')))
})

it('works on a select-all', () => {
    open(threeParagraphs())
    editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)))
    controls.sync(toolbar)

    expect(switcherLabel()).toBe('3 blocks')
    expect(switchBlock(editor, named('bulletList'), blockTypes)).toBe(true)
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')), item(p('b')), item(p('c')))))
})

it('runs from the switcher menu', () => {
    open(threeParagraphs())
    selectText()

    switcher().click()
    switcherItem('bulletList').click()

    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')), item(p('b')), item(p('c')))))
})

it('undoes in one step', () => {
    open(threeParagraphs())
    selectText()
    switchBlock(editor, named('bulletList'), blockTypes)

    editor.commands.undo()

    expect(editor.getJSON()).toEqual(threeParagraphs())
})

it('refuses a type that cannot take several blocks', () => {
    open(threeParagraphs())
    selectText()

    expect(switchBlock(editor, named('heading2'), blockTypes)).toBe(false)
    expect(editor.getJSON()).toEqual(threeParagraphs())
})

it('keeps the switcher disabled for a mixed selection', () => {
    open(doc(p('a'), heading('b')))
    selectText()

    expect(switcher().getAttribute('aria-disabled')).toBe('true')
    expect(switchBlock(editor, named('bulletList'), blockTypes)).toBe(false)
})

it('keeps the switcher disabled when no type can take several blocks', () => {
    const single = blockTypes.map((blockType) => ({ ...blockType, multiBlock: false }))

    editor = makeEditor(threeParagraphs())
    controls = createBlockControls({ editor, root, blockTypes: single })
    controls.bind(toolbar)
    selectText()

    expect(switcher().getAttribute('aria-disabled')).toBe('true')
})

it('keeps the other whole-block controls disabled', () => {
    open(threeParagraphs())
    selectText()

    expect(root.querySelector('[data-rep-more-action="duplicateBlock"]').getAttribute('aria-disabled')).toBe('true')
    expect(root.querySelector('[data-rep-more-action="deleteBlock"]').getAttribute('aria-disabled')).toBe('true')
    expect(toolbar.querySelector('[data-rep-control="moveUp"]').getAttribute('aria-disabled')).toBe('true')
})

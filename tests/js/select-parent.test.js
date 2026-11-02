import { NodeSelection, TextSelection } from '@tiptap/pm/state'
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
const quote = (...content) => ({ type: 'blockquote', content })

const listInQuote = () => doc(quote(p('a'), bullets(item(p('x')), item(p('y')))))

const control = (name) => toolbar.querySelector(`[data-rep-control="${name}"]`)
const moreItem = (action) => root.querySelector(`[data-rep-more-action="${action}"]`)
const selectedNode = () => editor.state.selection.node?.type.name

const placeCursor = (text) => {
    editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text === text) {
            editor.commands.setTextSelection(pos + 1)
        }
    })
}

const open = (content, text) => {
    editor = makeEditor(content)
    placeCursor(text)
    controls = createBlockControls({ editor, root, blockTypes })
    controls.bind(toolbar)
}

const selectNodeNamed = (name) => {
    let position

    editor.state.doc.descendants((node, pos) => {
        if (position === undefined && node.type.name === name) {
            position = pos
        }
    })

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)))
}

beforeEach(() => {
    root = makeToolbarRoot()
    toolbar = root.querySelector('[data-rep-block-toolbar]')
})

afterEach(() => {
    controls.destroy()
    editor.destroy()
    document.body.innerHTML = ''
})

it('selects the list first, skipping the paragraph and list item', () => {
    open(listInQuote(), 'y')

    expect(editor.commands.selectParentBlock()).toBe(true)
    expect(selectedNode()).toBe('bulletList')
})

it('climbs from the list to the quote around it', () => {
    open(listInQuote(), 'y')
    editor.commands.selectParentBlock()

    expect(editor.commands.selectParentBlock()).toBe(true)
    expect(selectedNode()).toBe('blockquote')
})

it('steps through nested lists one at a time', () => {
    open(doc(bullets(item(p('a'), bullets(item(p('b')))))), 'b')

    editor.commands.selectParentBlock()
    expect(editor.state.selection.node.childCount).toBe(1)
    expect(editor.state.selection.$from.depth).toBe(2)

    editor.commands.selectParentBlock()
    expect(editor.state.selection.$from.depth).toBe(0)
})

it('selects the quote from a paragraph inside it', () => {
    open(listInQuote(), 'a')

    editor.commands.selectParentBlock()

    expect(selectedNode()).toBe('blockquote')
})

it('selects what contains the whole selection, not just its start', () => {
    open(listInQuote(), 'a')

    const { doc: document } = editor.state
    let end

    document.descendants((node, pos) => {
        if (node.isText && node.text === 'y') {
            end = pos + 1
        }
    })

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(document, 2, end)))
    editor.commands.selectParentBlock()

    expect(selectedNode()).toBe('blockquote')
})

it('has nothing to select from a top-level paragraph', () => {
    open(doc(p('a')), 'a')

    expect(editor.can().selectParentBlock()).toBe(false)
})

it('has nothing to select once the top-level block is selected', () => {
    open(listInQuote(), 'a')
    editor.commands.selectParentBlock()

    expect(editor.can().selectParentBlock()).toBe(false)
})

it('wraps a selected list in another quote level and keeps it selected', () => {
    open(listInQuote(), 'y')
    editor.commands.selectParentBlock()

    expect(editor.commands.increaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(quote(p('a'), quote(bullets(item(p('x')), item(p('y')))))))
    expect(selectedNode()).toBe('bulletList')
})

it('removes quote levels from a selected list until it is out of the quote', () => {
    open(doc(quote(quote(bullets(item(p('x')))))), 'x')
    editor.commands.selectParentBlock()

    editor.commands.decreaseBlockLevel()
    expect(editor.getJSON()).toEqual(doc(quote(bullets(item(p('x'))))))

    editor.commands.decreaseBlockLevel()
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('x')))))
    expect(selectedNode()).toBe('bulletList')
})

it('runs from the more menu and keeps the menu reachable for the next step', () => {
    open(listInQuote(), 'y')
    controls.sync(toolbar)

    control('more').click()
    moreItem('selectParentBlock').click()
    controls.sync(toolbar)

    expect(selectedNode()).toBe('bulletList')
    expect(control('more').getAttribute('aria-disabled')).toBe('false')
    expect(moreItem('selectParentBlock').getAttribute('aria-disabled')).toBe('false')
})

it('greys select parent out when there is nothing above, and ignores a click on it', () => {
    open(doc(p('a')), 'a')
    controls.sync(toolbar)

    expect(moreItem('selectParentBlock').getAttribute('aria-disabled')).toBe('true')

    control('more').click()
    moreItem('selectParentBlock').click()

    expect(selectedNode()).toBeUndefined()
})

it('protects the top-level block while a nested block is selected', () => {
    open(listInQuote(), 'y')
    selectNodeNamed('bulletList')
    controls.sync(toolbar)

    for (const name of ['switcher', 'moveUp', 'moveDown']) {
        expect(control(name).getAttribute('aria-disabled')).toBe('true')
    }

    expect(toolbar.querySelector('[data-rep-drag-handle]').getAttribute('aria-disabled')).toBe('true')
    expect(moreItem('duplicateBlock').getAttribute('aria-disabled')).toBe('true')
    expect(moreItem('deleteBlock').getAttribute('aria-disabled')).toBe('true')
})

it('refuses whole-block commands while a nested block is selected', () => {
    open(doc(p('z'), quote(bullets(item(p('x'))))), 'x')
    selectNodeNamed('bulletList')

    const before = editor.getJSON()

    expect(editor.commands.deleteBlock()).toBe(false)
    expect(editor.commands.duplicateBlock()).toBe(false)
    expect(editor.commands.moveBlockUp()).toBe(false)
    expect(switchBlock(editor, named('paragraph'), blockTypes)).toBe(false)
    expect(editor.getJSON()).toEqual(before)
})

it('ignores a click on delete while a nested block is selected', () => {
    open(listInQuote(), 'y')
    selectNodeNamed('bulletList')
    controls.sync(toolbar)

    const before = editor.getJSON()

    control('more').click()
    moreItem('deleteBlock').click()

    expect(editor.getJSON()).toEqual(before)
})

it('leaves the controls alone for a selected top-level block', () => {
    open(doc(bullets(item(p('x'))), p('z')), 'x')
    selectNodeNamed('bulletList')
    controls.sync(toolbar)

    expect(moreItem('deleteBlock').getAttribute('aria-disabled')).toBe('false')
    expect(control('moveDown').getAttribute('aria-disabled')).toBe('false')
})

it('leaves the controls alone for a selected mention', () => {
    open(
        doc(quote({ type: 'paragraph', content: [{ type: 'mention', attrs: { id: '1', label: 'Ada', char: '@' } }] })),
        'none',
    )
    selectNodeNamed('mention')
    controls.sync(toolbar)

    expect(moreItem('deleteBlock').getAttribute('aria-disabled')).toBe('false')
})

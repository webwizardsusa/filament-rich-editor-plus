import { afterEach, expect, it } from 'vitest'
import { syncToolbar } from '../../resources/js/toolbar/tools'
import { note, pluginIdsWithNote } from './support/container-node'
import { doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const item = (...content) => ({ type: 'listItem', content })
const bullets = (...items) => ({ type: 'bulletList', content: items })
const quote = (...content) => ({ type: 'blockquote', content })

/**
 * Puts the cursor inside the first text block containing `text`.
 */
const placeCursor = (text) => {
    editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text === text) {
            editor.commands.setTextSelection(pos + 1)
        }
    })
}

const open = (content, text, pluginIds = undefined) => {
    editor = makeEditor(content, pluginIds)
    placeCursor(text)
}

it('nests a list item under the one above it', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'b')

    expect(editor.commands.increaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a'), bullets(item(p('b')))))))
})

it('cannot nest the first item of a list', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'a')

    expect(editor.can().increaseBlockLevel()).toBe(false)
})

it('moves a nested list item up one level', () => {
    open(doc(bullets(item(p('a'), bullets(item(p('b')))))), 'b')

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')), item(p('b')))))
})

it('turns a top-level list item into a paragraph', () => {
    open(doc(bullets(item(p('a')))), 'a')

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(p('a')))
})

it('nests only the current block of a quote', () => {
    open(doc(quote(p('a'), p('b'))), 'b')

    expect(editor.commands.increaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(quote(p('a'), quote(p('b')))))
})

it('removes one quote level', () => {
    open(doc(quote(quote(p('a')))), 'a')

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(quote(p('a'))))
})

it('turns a top-level quote into a paragraph', () => {
    open(doc(quote(p('a'))), 'a')

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(p('a')))
})

it('acts on the list when it sits inside a quote', () => {
    open(doc(quote(bullets(item(p('a')), item(p('b'))))), 'b')

    expect(editor.commands.increaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(quote(bullets(item(p('a'), bullets(item(p('b'))))))))
})

it('acts on the quote when it sits inside a list', () => {
    open(doc(bullets(item(quote(p('a'))))), 'a')

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a')))))
})

it('nests the current block of any container, keeping its attributes', () => {
    open(doc(note('warning', p('a'), p('b'))), 'b', pluginIdsWithNote)

    expect(editor.commands.increaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(note('warning', p('a'), note('warning', p('b')))))
})

it('lifts a block out of any container', () => {
    open(doc(note('warning', p('a'), p('b'))), 'b', pluginIdsWithNote)

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(note('warning', p('a')), p('b')))
})

it('does nothing outside a list or quote', () => {
    open(doc(p('a')), 'a')

    expect(editor.can().increaseBlockLevel()).toBe(false)
    expect(editor.can().decreaseBlockLevel()).toBe(false)
})

it('does nothing on a field without list or quote plugins', () => {
    editor = makeEditor(doc(p('a')), ['core/document'])

    expect(editor.can().increaseBlockLevel()).toBe(false)
    expect(editor.can().decreaseBlockLevel()).toBe(false)
})

it('undoes a level change in one step', () => {
    open(doc(quote(p('a'))), 'a')
    editor.commands.increaseBlockLevel()

    editor.commands.undo()

    expect(editor.getJSON()).toEqual(doc(quote(p('a'))))
})

const toolbarWith = (name) => {
    const toolbar = document.createElement('div')
    toolbar.innerHTML = `<button data-rep-tool="${name}"></button>`

    return toolbar
}

it('marks a tool unavailable when its command cannot run', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'a')
    const toolbar = toolbarWith('increaseLevel')
    const tools = { increaseLevel: { command: 'increaseBlockLevel', arguments: [], checksAvailability: true } }

    syncToolbar(editor, toolbar, tools)
    expect(toolbar.firstChild.getAttribute('aria-disabled')).toBe('true')

    placeCursor('b')
    syncToolbar(editor, toolbar, tools)
    expect(toolbar.firstChild.getAttribute('aria-disabled')).toBe('false')
})

it('leaves other tools alone', () => {
    open(doc(p('a')), 'a')
    const toolbar = toolbarWith('increaseLevel')

    syncToolbar(editor, toolbar, { increaseLevel: { command: 'increaseBlockLevel', arguments: [] } })

    expect(toolbar.firstChild.hasAttribute('aria-disabled')).toBe(false)
})

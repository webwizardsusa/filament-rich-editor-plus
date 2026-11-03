import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, expect, it } from 'vitest'
import { getActiveList } from '../../resources/js/blocks/active-block'
import { defaultPluginIds, doc, makeEditor, p } from './support/make-editor'

const pluginIds = [...defaultPluginIds, 'core/task-list']

let editor

afterEach(() => editor?.destroy())

const item = (...content) => ({ type: 'listItem', content })
const task = (checked, ...content) => ({ type: 'taskItem', attrs: { checked }, content })
const bullets = (...items) => ({ type: 'bulletList', content: items })
const numbers = (...items) => ({ type: 'orderedList', attrs: { start: 1, type: null }, content: items })
const tasks = (...items) => ({ type: 'taskList', content: items })

const open = (content, text, ids = pluginIds) => {
    editor = makeEditor(content, ids)
    editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text === text) {
            editor.commands.setTextSelection(pos + 1)
        }
    })
}

it('turns a bullet list into a task list, keeping nesting', () => {
    open(doc(bullets(item(p('a'), bullets(item(p('b')))))), 'a')

    expect(editor.commands.setListType('taskList')).toBe(true)
    expect(editor.getJSON()).toEqual(doc(tasks(task(false, p('a'), tasks(task(false, p('b')))))))
})

it('turns a task list into a numbered list, dropping checked state', () => {
    open(doc(tasks(task(true, p('a')), task(false, p('b')))), 'a')

    expect(editor.commands.setListType('orderedList')).toBe(true)
    expect(editor.getJSON()).toEqual(doc(numbers(item(p('a')), item(p('b')))))
})

it('keeps the cursor where it was', () => {
    open(doc(bullets(item(p('abc')))), 'abc')
    editor.commands.setTextSelection(3)

    editor.commands.setListType('taskList')

    expect(editor.state.selection.from).toBe(3)
})

it('converts only the nested list the cursor is in', () => {
    open(doc(bullets(item(p('a'), bullets(item(p('b')))))), 'b')

    expect(editor.commands.setListType('taskList')).toBe(true)
    expect(editor.getJSON()).toEqual(doc(bullets(item(p('a'), tasks(task(false, p('b')))))))
})

it('undoes a list type switch in one step', () => {
    const original = doc(bullets(item(p('a'), bullets(item(p('b'))))))
    open(original, 'a')

    editor.commands.setListType('taskList')
    editor.commands.undo()

    expect(editor.getJSON()).toEqual(original)
})

it('cannot switch to a list type the editor does not have', () => {
    open(doc(bullets(item(p('a')))), 'a', defaultPluginIds)

    expect(editor.can().setListType('taskList')).toBe(false)
})

it('nests and un-nests task items', () => {
    open(doc(tasks(task(false, p('a')), task(true, p('b')))), 'b')

    expect(editor.commands.increaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(tasks(task(false, p('a'), tasks(task(true, p('b')))))))

    expect(editor.commands.decreaseBlockLevel()).toBe(true)
    expect(editor.getJSON()).toEqual(doc(tasks(task(false, p('a')), task(true, p('b')))))
})

it('finds the task list the cursor is in', () => {
    open(doc(tasks(task(false, p('a')))), 'a')

    expect(getActiveList(editor.state.selection)?.type.name).toBe('taskList')
})

it('selects the task list as the parent block', () => {
    open(doc(tasks(task(false, p('a')))), 'a')

    expect(editor.commands.selectParentBlock()).toBe(true)
    expect(editor.state.selection).toBeInstanceOf(NodeSelection)
    expect(editor.state.selection.node.type.name).toBe('taskList')
})

it('still switches bullet and numbered lists the way it did', () => {
    open(doc(bullets(item(p('a')), item(p('b')))), 'a')

    expect(editor.commands.setListType('orderedList')).toBe(true)
    expect(editor.getJSON()).toEqual(doc(numbers(item(p('a')), item(p('b')))))
})

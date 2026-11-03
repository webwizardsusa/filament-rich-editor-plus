import { afterEach, describe, expect, it } from 'vitest'
import { switchBlock } from '../../resources/js/blocks/block-types'
import { convertList } from '../../resources/js/blocks/convert-list'
import { blockTypes, named } from './support/block-types'
import { defaultPluginIds, doc, makeEditor, p } from './support/make-editor'

let editor

afterEach(() => editor?.destroy())

const textAlign = {
    name: 'textAlign',
    kind: 'style',
    key: 'text-align',
    types: ['paragraph', 'heading', 'codeBlock'],
    values: ['left', 'center', 'right'],
    pattern: null,
    keepOnSplit: true,
}

const tone = { name: 'tone', kind: 'html', key: 'class', types: ['listItem', 'taskItem'], values: ['urgent'], pattern: null, keepOnSplit: true }

const pluginIds = [
    ...defaultPluginIds,
    'core/task-list',
    { id: 'core/global-attributes', options: { name: 'globalAttributes:test', attributes: [textAlign, tone] } },
]

const centred = (text) => ({ type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text }] })

const firstTextblock = () => {
    let found = null

    editor.state.doc.descendants((node) => {
        if (!found && node.isTextblock) {
            found = node
        }

        return !found
    })

    return found
}

describe('the block switcher', () => {
    it('keeps a global attribute from paragraph to heading to list and back', () => {
        editor = makeEditor(doc(centred('hello')), pluginIds)

        for (const to of ['heading2', 'bulletList', 'paragraph']) {
            editor.commands.focus('end')
            expect(switchBlock(editor, named(to), blockTypes)).toBe(true)
            expect(firstTextblock().attrs.textAlign).toBe('center')
        }

        expect(editor.state.doc.firstChild.type.name).toBe('paragraph')
    })

    it('gives the lines of a code block the code block its attributes', () => {
        editor = makeEditor(doc({ type: 'codeBlock', attrs: { language: null, textAlign: 'right' }, content: [{ type: 'text', text: 'a\nb' }] }), pluginIds)
        editor.commands.focus('end')

        switchBlock(editor, named('paragraph'), blockTypes)

        expect(editor.getJSON().content.map((node) => node.attrs?.textAlign)).toEqual(['right', 'right'])
    })

    it('does not carry attributes the target does not define', () => {
        editor = makeEditor(doc({ type: 'heading', attrs: { level: 3, textAlign: 'left' }, content: [{ type: 'text', text: 'x' }] }), pluginIds)
        editor.commands.focus('end')

        switchBlock(editor, named('paragraph'), blockTypes)

        expect(editor.getJSON().content[0].attrs).toEqual({ textAlign: 'left' })
    })
})

describe('list conversion', () => {
    it('keeps item attributes from bullet to task to ordered', () => {
        editor = makeEditor(doc(p('x')), pluginIds)

        const { schema } = editor
        const bullets = schema.nodeFromJSON({
            type: 'bulletList',
            content: [{ type: 'listItem', attrs: { tone: 'urgent' }, content: [centred('a')] }],
        })

        const tasks = convertList(bullets, schema.nodes.taskList)
        const numbers = convertList(tasks, schema.nodes.orderedList)

        expect(tasks.firstChild.attrs).toEqual({ tone: 'urgent', checked: false })
        expect(numbers.firstChild.attrs).toEqual({ tone: 'urgent' })
        expect(numbers.firstChild.firstChild.attrs.textAlign).toBe('center')
        expect(numbers.nodeSize).toBe(bullets.nodeSize)
    })
})

describe('splitting', () => {
    it('keeps the attribute when Enter splits a paragraph', () => {
        editor = makeEditor(doc(centred('ab')), pluginIds)
        editor.commands.setTextSelection(2)

        editor.commands.splitBlock()

        expect(editor.getJSON().content.map((node) => node.attrs.textAlign)).toEqual(['center', 'center'])
    })
})

import { afterEach, expect, it, vi } from 'vitest'
import { createMentionLabels } from '../../resources/js/mentions/mention-labels'
import { insertMention } from '../../resources/js/mentions/mention-node'
import { defaultPluginIds, doc, makeEditor, p } from './support/make-editor'

const mention = (id, label, char = '@') => ({ type: 'mention', attrs: { id, label, char } })

const paragraph = (...content) => ({ type: 'paragraph', content })

let editor
let labels

afterEach(() => {
    labels?.destroy()
    editor?.destroy()
    vi.restoreAllMocks()
})

const tokens = () => [...editor.view.dom.querySelectorAll('.rep-mention')].map((token) => token.textContent)

it('shows the stored label with the provider format', () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada'), mention('2', 'Page', '[['))))

    expect(tokens()).toEqual(['@Ada', '[[Page]]'])
})

it('shows the stored label for a trigger with no provider', () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada', '!'))))

    expect(tokens()).toEqual(['!Ada'])
})

it('asks once per trigger and shows the current labels', async () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Old'), mention('1', 'Old'), mention('9', 'Tag', '#'))))

    const fetchLabels = vi.fn().mockResolvedValue({ '@': { 1: 'New' }, '#': { 9: 'Tag' } })

    labels = createMentionLabels({ editor, fetchLabels })
    await labels.refresh()

    expect(fetchLabels).toHaveBeenCalledTimes(1)
    expect(fetchLabels).toHaveBeenCalledWith({ '@': ['1'], '#': ['9'] })
    expect(tokens()).toEqual(['@New', '@New', '#Tag'])
})

it('never touches the document', async () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Old'))))

    const onUpdate = vi.fn()
    const before = editor.getJSON()

    editor.on('update', onUpdate)

    labels = createMentionLabels({ editor, fetchLabels: async () => ({ '@': { 1: 'New' } }) })
    await labels.refresh()

    expect(tokens()).toEqual(['@New'])
    expect(editor.getJSON()).toEqual(before)
    expect(onUpdate).not.toHaveBeenCalled()
})

it('keeps the stored label for a record that has gone', async () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada'))))

    labels = createMentionLabels({ editor, fetchLabels: async () => ({ '@': {} }) })
    await labels.refresh()

    expect(tokens()).toEqual(['@Ada'])
})

it('keeps stored labels when the lookup fails, and does not retry forever', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    editor = makeEditor(doc(paragraph(mention('1', 'Ada'))))

    const fetchLabels = vi.fn().mockRejectedValue(new Error('down'))

    labels = createMentionLabels({ editor, fetchLabels })
    await labels.refresh()
    await labels.refresh()

    expect(tokens()).toEqual(['@Ada'])
    expect(fetchLabels).toHaveBeenCalledTimes(1)
})

it('only asks about ids it has not seen', async () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada'))))

    const fetchLabels = vi.fn().mockResolvedValue({ '@': {} })

    labels = createMentionLabels({ editor, fetchLabels })
    await labels.refresh()

    editor.commands.setContent(doc(paragraph(mention('1', 'Ada'), mention('2', 'Grace'))), { emitUpdate: false })
    await labels.refresh()

    expect(fetchLabels).toHaveBeenLastCalledWith({ '@': ['2'] })
})

it('looks up new mentions after any content change', async () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada'))))

    const fetchLabels = vi.fn().mockResolvedValue({ '@': { 2: 'Grace Hopper' } })

    labels = createMentionLabels({ editor, fetchLabels })
    await labels.refresh()

    editor.commands.setContent(doc(paragraph(mention('2', 'Grace'))), { emitUpdate: false })

    await vi.waitFor(() => expect(tokens()).toEqual(['@Grace Hopper']))
})

it('splits a large document into batches of 100, so every label is found', async () => {
    const mentions = Array.from({ length: 230 }, (_, index) => mention(String(index), 'x'))

    editor = makeEditor(doc(paragraph(...mentions)))

    const fetchLabels = vi.fn(async (idsByTrigger) => ({
        '@': Object.fromEntries(idsByTrigger['@'].map((id) => [id, `N${id}`])),
    }))

    labels = createMentionLabels({ editor, fetchLabels })
    await labels.refresh()

    expect(fetchLabels).toHaveBeenCalledTimes(3)
    expect(fetchLabels.mock.calls.every(([ids]) => ids['@'].length <= 100)).toBe(true)
    expect(tokens().at(-1)).toBe('@N229')
})

it('stops updating after destroy', async () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Old'))))

    let resolve

    labels = createMentionLabels({ editor, fetchLabels: () => new Promise((done) => (resolve = done)) })

    const refresh = labels.refresh()

    labels.destroy()
    resolve({ '@': { 1: 'New' } })
    await refresh

    expect(tokens()).toEqual(['@Old'])
})

it('inserts a token and a trailing space in one undo step', () => {
    editor = makeEditor(doc(p('hi @ad')))
    editor.commands.setTextSelection(7)

    insertMention(editor, { from: 4, to: 7 }, { id: '1', label: 'Ada' }, '@')

    expect(editor.getJSON().content[0].content).toEqual([
        { type: 'text', text: 'hi ' },
        { type: 'mention', attrs: { id: '1', label: 'Ada', char: '@' } },
        { type: 'text', text: ' ' },
    ])
    expect(editor.state.selection.empty).toBe(true)
    expect(editor.state.selection.$from.parentOffset).toBe(5)

    editor.commands.undo()

    expect(editor.getText()).toBe('hi @ad')
})

it('keeps id, label and trigger through copy and paste', () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada', '#'))))

    const html = editor.getHTML()

    editor.commands.setContent(doc(p('')), { emitUpdate: false })
    editor.commands.insertContent(html)

    expect(editor.getJSON().content[0].content[0]).toEqual({
        type: 'mention',
        attrs: { id: '1', label: 'Ada', char: '#' },
    })
})

it('reads a rendered link back as a mention, ahead of the link mark', () => {
    editor = makeEditor(doc(p('')), [...defaultPluginIds, 'core/link'])

    editor.commands.insertContent(
        '<a class="rep-mention" data-type="mention" href="/people/1" data-id="1" data-label="Ada" data-char="@">@Ada</a>',
    )

    expect(editor.getJSON().content[0].content[0]).toEqual({
        type: 'mention',
        attrs: { id: '1', label: 'Ada', char: '@' },
    })
})

it('uses the format in text output', () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Page', '[['))))

    expect(editor.getText()).toBe('[[Page]]')
})

it('removes the whole token with one backspace', () => {
    editor = makeEditor(doc(paragraph(mention('1', 'Ada'))))
    editor.commands.setTextSelection(2)

    const event = new KeyboardEvent('keydown', { key: 'Backspace' })

    editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event))

    expect(editor.getJSON().content[0].content).toBeUndefined()
})

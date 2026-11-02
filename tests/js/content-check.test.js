import { afterEach, expect, it, vi } from 'vitest'
import { checksContent, createCheckedEditor, setCheckedContent } from '../../resources/js/content-check'
import { doc, editorOptions, p } from './support/make-editor'

const withoutHeading = ['core/document', 'core/bold']

const heading = { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] }

afterEach(() => vi.restoreAllMocks())

it('refuses JSON the schema does not allow, instead of emptying the document', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { editor, error } = createCheckedEditor(editorOptions(doc(heading), withoutHeading), 'json')

    expect(editor).toBeNull()
    expect(error).toBeInstanceOf(Error)
})

it('accepts valid JSON', () => {
    const { editor, error } = createCheckedEditor(editorOptions(doc(p('fine'))), 'json')

    expect(error).toBeNull()
    expect(editor.getText()).toBe('fine')

    editor.destroy()
})

it('refuses invalid content that arrives after load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { editor } = createCheckedEditor(editorOptions(doc(p('fine')), withoutHeading), 'json')

    expect(setCheckedContent(editor, doc(heading), 'json')).toBe(false)
    expect(editor.getText()).toBe('fine')

    editor.destroy()
})

it('does not check HTML, because the check rejects the editor\'s own table markup', () => {
    expect(checksContent('html')).toBe(false)
})

it('locks the editor after refusing an update, without writing the old document back', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const onUpdate = vi.fn()
    const { editor } = createCheckedEditor({ ...editorOptions(doc(p('fine')), withoutHeading), onUpdate }, 'json')

    expect(setCheckedContent(editor, doc(heading), 'json')).toBe(false)
    expect(onUpdate).not.toHaveBeenCalled()
    expect(editor.isEditable).toBe(false)

    editor.destroy()
})

it('always checks JSON', () => {
    expect(checksContent('json')).toBe(true)
})

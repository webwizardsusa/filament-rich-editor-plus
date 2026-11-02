import { Editor } from '@tiptap/core'

/**
 * Whether content in this format is checked against the schema. HTML is not: TipTap's check flags every element the
 * schema has no rule for, including the `<tbody>` and `<colgroup>` in the editor's own table output. A plugin removed
 * from an HTML field therefore downgrades its tags silently (a heading becomes a paragraph).
 */
export function checksContent(format) {
    return format === 'json'
}

/**
 * Builds an editor, refusing content the schema does not allow. Left alone, TipTap replaces such JSON with an empty
 * document, which a save would then persist, for example after a plugin is removed from a field whose stored content
 * still uses it. `editor` is null when the content was refused.
 */
export function createCheckedEditor(options, format) {
    let error = null

    const editor = new Editor({
        ...options,
        enableContentCheck: checksContent(format),
        onContentError: ({ error: contentError }) => {
            error = contentError
        },
    })

    if (!error) {
        return { editor, error: null }
    }

    console.error('[rich-editor-plus] The stored content does not fit this editor.', error)
    editor.destroy()

    return { editor: null, error }
}

/**
 * Replaces the document from outside the editor. When the content is refused this returns false and leaves the document
 * alone, with the editor locked so nothing can overwrite the stored value. The update event has to stay off, or the
 * editor would write its old document over that value. The empty transaction closes anything open, like the slash menu.
 */
export function setCheckedContent(editor, content, format) {
    try {
        return editor.commands.setContent(content, {
            emitUpdate: false,
            errorOnInvalidContent: checksContent(format),
        })
    } catch (error) {
        console.error('[rich-editor-plus] The new content does not fit this editor.', error)

        editor.setEditable(false, false)
        editor.view.dispatch(editor.state.tr)

        return false
    }
}

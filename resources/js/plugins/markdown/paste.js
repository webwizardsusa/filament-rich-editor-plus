import { Extension } from '@tiptap/core'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { looksLikeMarkdown } from './detect'
import { notify } from './notify'

export const markdownPasteKey = new PluginKey('markdownPaste')

/**
 * Converts pasted Markdown on the server (the `toDocument` request) and puts the result where it was pasted. The
 * pasted range is tracked through edits made while the request runs. On failure the text is pasted as plain text.
 */
export function markdownPasteExtension({ paste = true, labels = {} } = {}, { callPlugin, processing = (promise) => promise } = {}) {
    let isShiftPaste = false
    let lastId = 0

    return Extension.create({
        name: 'markdownPaste',

        addProseMirrorPlugins() {
            const editor = this.editor

            return [
                new Plugin({
                    key: markdownPasteKey,

                    state: {
                        init: () => new Map(),
                        apply(tr, ranges) {
                            const meta = tr.getMeta(markdownPasteKey)
                            const next = new Map()

                            ranges.forEach((range, id) => {
                                const from = tr.mapping.map(range.from, 1)
                                const to = Math.max(from, tr.mapping.map(range.to, -1))
                                next.set(id, { from, to })
                            })

                            if (meta?.add) {
                                next.set(meta.add.id, { from: meta.add.from, to: meta.add.to })
                            }

                            if (meta?.remove) {
                                next.delete(meta.remove)
                            }

                            return next
                        },
                    },

                    props: {
                        handleKeyDown(view, event) {
                            isShiftPaste = event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v'

                            return false
                        },

                        handlePaste(view, event) {
                            const wasShiftPaste = isShiftPaste
                            isShiftPaste = false
                            const data = event.clipboardData

                            if (!paste || !callPlugin || !data || wasShiftPaste) {
                                return false
                            }

                            const text = data.getData('text/plain')
                            const html = data.getData('text/html')
                            const isFromCodeEditor = Array.from(data.types ?? []).includes('vscode-editor-data')

                            if (!text || (html && !isFromCodeEditor) || data.files?.length) {
                                return false
                            }

                            if (view.state.selection.$from.parent.type.spec.code || !looksLikeMarkdown(text)) {
                                return false
                            }

                            const id = ++lastId
                            const { from, to } = view.state.selection
                            view.dispatch(view.state.tr.setMeta(markdownPasteKey, { add: { id, from, to } }))

                            const finish = (apply) => {
                                if (editor.isDestroyed) {
                                    return
                                }

                                const range = markdownPasteKey.getState(view.state).get(id)
                                const tr = view.state.tr.setMeta(markdownPasteKey, { remove: id })

                                if (range) {
                                    apply(tr, range)
                                }

                                view.dispatch(tr)
                            }

                            const request = Promise.resolve(callPlugin('webwizardsusa/markdown', 'toDocument', { markdown: text }))
                                .then((answer) => {
                                    const content = answer?.document?.content

                                    if (!Array.isArray(content)) {
                                        throw new Error(answer?.error ?? 'No document.')
                                    }

                                    finish((tr, range) => {
                                        const fragment = Fragment.fromJSON(view.state.schema, content)
                                        // Paragraphs at the edges join the text around the paste, as a plain-text
                                        // paste does; other blocks (headings, lists) stay whole.
                                        const isOpen = (node) => (node?.type.name === 'paragraph' ? 1 : 0)
                                        const slice = new Slice(fragment, isOpen(fragment.firstChild), isOpen(fragment.lastChild))
                                        tr.replaceRange(range.from, range.to, slice).scrollIntoView()
                                    })
                                })
                                .catch(() => {
                                    finish((tr, range) => tr.setSelection(TextSelection.create(tr.doc, range.from, range.to)))

                                    if (!editor.isDestroyed) {
                                        view.pasteText(text, new Event('paste'))
                                        notify(labels.pasteFailed ?? 'The pasted Markdown was pasted as plain text.')
                                    }
                                })

                            processing(request, labels.converting)

                            return true
                        },
                    },
                }),
            ]
        },
    })
}

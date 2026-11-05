import { Extension } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { notify } from './notify'

const DEBOUNCE = 400
const OWN_CHANGE = 'markdownSourceOwnChange'

/**
 * A Markdown source view: the `toggleMarkdownSource` command swaps the editor surface for a textarea holding the
 * content as Markdown (the `toMarkdown` request). Typing is converted back after a pause (`toDocument`) and applied
 * as an ordinary history step, so the field's state stays current and Undo after returning walks back through the
 * source edits. The editor is read-only while the source view is open, which disables the other tools.
 */
export function markdownSourceExtension({ labels = {} } = {}, { callPlugin, processing = (promise) => promise } = {}) {
    const sessions = new WeakMap()

    const refresh = (editor) => editor.view.dispatch(editor.state.tr.setMeta('markdownSource', true))

    const fail = (answer) => notify(labels.convertFailed ?? "The Markdown couldn't be converted.", answer?.error ?? '')

    /**
     * Resolves with whether the textarea's Markdown now matches the document.
     */
    const convert = (editor, session) => {
        const id = ++session.latest
        const markdown = session.textarea.value
        // A refresh still in flight was asked for before this Markdown, so its answer must not replace it.
        session.refreshing++

        session.inFlight = Promise.resolve(callPlugin('hollyit/markdown', 'toDocument', { markdown }))
            .then((answer) => {
                if (id !== session.latest || editor.isDestroyed) {
                    return false
                }

                if (!answer?.document) {
                    fail(answer)

                    return false
                }

                session.applied = markdown
                // Its own undo step, never merged with typing from before the switch.
                editor.view.dispatch(closeHistory(editor.state.tr))
                editor.chain().setMeta(OWN_CHANGE, true).setContent(answer.document, { emitUpdate: true }).run()

                return true
            })
            .catch(() => {
                fail()

                return false
            })
            .finally(() => {
                if (id === session.latest && session.timer === null) {
                    session.release?.()
                    session.release = null
                }
            })

        return session.inFlight
    }

    const hold = (session) => {
        if (session.release) {
            return
        }

        processing(new Promise((resolve) => (session.release = resolve)), labels.converting)
    }

    const enter = async (editor) => {
        if (!editor.isEditable || sessions.has(editor)) {
            return
        }

        sessions.set(editor, null)
        const answer = await Promise.resolve(processing(callPlugin('hollyit/markdown', 'toMarkdown', { document: editor.getJSON() }), labels.converting)).catch(() => null)

        if (editor.isDestroyed || typeof answer?.markdown !== 'string') {
            sessions.delete(editor)

            if (!editor.isDestroyed) {
                fail(answer)
            }

            return
        }

        const surface = editor.view.dom
        const textarea = document.createElement('textarea')
        textarea.className = 'rep-markdown-source'
        textarea.value = answer.markdown
        textarea.spellcheck = false
        textarea.setAttribute('aria-label', labels.source ?? 'Markdown source')
        textarea.style.minHeight = `${surface.offsetHeight}px`

        const bar = document.createElement('div')
        bar.className = 'rep-markdown-source-bar'

        const done = document.createElement('button')
        done.type = 'button'
        done.className = 'rep-markdown-source-done'
        done.textContent = labels.done ?? 'Done'
        done.addEventListener('click', () => editor.commands.toggleMarkdownSource())
        bar.append(done)

        const session = { textarea, bar, original: answer.markdown, applied: answer.markdown, latest: 0, timer: null, release: null, inFlight: Promise.resolve(), leaving: false, refreshing: 0 }

        textarea.addEventListener('input', () => {
            session.refreshing++
            hold(session)
            clearTimeout(session.timer)
            session.timer = setTimeout(() => {
                session.timer = null
                convert(editor, session)
            }, DEBOUNCE)
        })

        surface.after(bar)
        bar.after(textarea)
        surface.hidden = true
        sessions.set(editor, session)
        editor.storage.markdownSource.isActive = true
        editor.setEditable(false, false)
        refresh(editor)
        textarea.focus()
    }

    const leave = async (editor) => {
        const session = sessions.get(editor)

        if (!session || session.leaving) {
            return
        }

        session.leaving = true
        session.textarea.readOnly = true
        clearTimeout(session.timer)
        session.timer = null

        const isCurrent = session.textarea.value === session.applied

        if (isCurrent) {
            await session.inFlight
        }

        const isConverted = isCurrent || (await convert(editor, session))

        session.release?.()

        if (!isConverted && !editor.isDestroyed) {
            // The Markdown couldn't be converted, so it stays on screen rather than being thrown away.
            session.leaving = false
            session.textarea.readOnly = false

            return
        }

        sessions.delete(editor)

        if (editor.isDestroyed) {
            return
        }

        session.bar.remove()
        session.textarea.remove()
        editor.view.dom.hidden = false
        editor.storage.markdownSource.isActive = false
        editor.setEditable(true, false)
        refresh(editor)
        editor.commands.focus()
    }

    return Extension.create({
        name: 'markdownSource',

        addStorage() {
            return { isActive: false }
        },

        addCommands() {
            return {
                toggleMarkdownSource:
                    () =>
                    ({ editor, dispatch }) => {
                        if (dispatch) {
                            sessions.get(editor) ? leave(editor) : enter(editor)
                        }

                        return true
                    },
            }
        },

        /**
         * A change to the document that didn't come from the textarea (a More-menu action, a field update) would leave
         * the textarea stale, so it's refreshed, unless the user has typing pending: that conversion wins.
         */
        onTransaction({ transaction }) {
            const session = sessions.get(this.editor)

            if (!session || session.leaving || !transaction.docChanged || transaction.getMeta(OWN_CHANGE)) {
                return
            }

            if (session.timer !== null || session.release || session.textarea.value !== session.applied) {
                return
            }

            const ticket = ++session.refreshing

            Promise.resolve(callPlugin('hollyit/markdown', 'toMarkdown', { document: this.editor.getJSON() }))
                .then((answer) => {
                    const isStale = ticket !== session.refreshing || session.timer !== null || session.release || session.leaving || session.textarea.value !== session.applied

                    if (isStale || this.editor.isDestroyed || typeof answer?.markdown !== 'string') {
                        return
                    }

                    session.textarea.value = answer.markdown
                    session.applied = answer.markdown
                    session.original = answer.markdown
                })
                .catch(() => {})
        },

        onDestroy() {
            const session = sessions.get(this.editor)

            if (session) {
                clearTimeout(session.timer)
                session.release?.()
                session.bar.remove()
                session.textarea.remove()
                sessions.delete(this.editor)
            }
        },
    })
}

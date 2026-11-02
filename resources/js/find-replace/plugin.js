import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createFindPanel } from './panel'
import { findMatches } from './search'

export const findReplaceKey = new PluginKey('repFindReplace')

const initialState = {
    isOpen: false,
    query: '',
    replacement: '',
    matchCase: false,
    wholeWord: false,
    matches: [],
    currentIndex: -1,
    openCount: 0,
    decorations: DecorationSet.empty,
}

const firstIndexAtOrAfter = (matches, position) => {
    const index = matches.findIndex(({ from }) => from >= position)

    return index === -1 && matches.length ? 0 : index
}

const search = (doc, options, anchor) => {
    const matches = findMatches(doc, options)

    return { matches, currentIndex: firstIndexAtOrAfter(matches, anchor) }
}

const buildDecorations = (doc, { isOpen, matches, currentIndex }) =>
    isOpen
        ? DecorationSet.create(
              doc,
              matches.map(({ from, to }, index) =>
                  Decoration.inline(from, to, {
                      class: index === currentIndex ? 'rep-find-match rep-find-current' : 'rep-find-match',
                  }),
              ),
          )
        : DecorationSet.empty

const selectMatch = (tr, { from, to }) => tr.setSelection(TextSelection.create(tr.doc, from, to)).scrollIntoView()

const selectFirstResult = (tr, { matches, currentIndex }) => {
    if (matches.length) {
        selectMatch(tr, matches[currentIndex])
    }
}

const replaceMatch = (tr, { from, to }, replacement) => {
    if (replacement === '') {
        tr.delete(from, to)
    } else {
        tr.replaceWith(from, to, tr.doc.type.schema.text(replacement, tr.doc.nodeAt(from).marks))
    }
}

/**
 * Text selected inside one line of one textblock, which is all a single-line search box can hold.
 */
const selectedQuery = ({ doc, selection }) => {
    if (!(selection instanceof TextSelection) || selection.empty || !selection.$from.sameParent(selection.$to)) {
        return null
    }

    const text = doc.textBetween(selection.from, selection.to)

    return text === '' || text.includes('\n') ? null : text
}

/**
 * Find and replace for one editor. Commands search `tr.doc` themselves and pass the result as meta, which the plugin
 * merges into its state, so a chain with an earlier step in the same transaction sees the right document.
 */
export const FindReplace = Extension.create({
    name: 'findReplace',

    addCommands() {
        const { editor } = this

        const findState = () => findReplaceKey.getState(editor.state)

        const whenEditable = (run) => (props) => editor.isEditable && run(props)

        const whenMatched = (run) =>
            whenEditable((props) => {
                const state = findState()

                if (!state.matches.length) {
                    return false
                }

                if (props.dispatch) {
                    run(props.tr, state)
                }

                return true
            })

        const moveCurrent = (step) =>
            whenMatched((tr, { matches, currentIndex }) => {
                const current = matches[currentIndex]
                const isOnCurrent = tr.selection.from === current.from && tr.selection.to === current.to
                const index = isOnCurrent ? (currentIndex + step + matches.length) % matches.length : currentIndex

                selectMatch(tr, matches[index])
                tr.setMeta(findReplaceKey, { currentIndex: index })
            })

        return {
            openFindReplace: () =>
                whenEditable(({ tr, dispatch }) => {
                    if (dispatch) {
                        const state = findState()
                        const query = selectedQuery(tr) ?? state.query

                        tr.setMeta(findReplaceKey, {
                            isOpen: true,
                            query,
                            openCount: state.openCount + 1,
                            ...search(tr.doc, { ...state, query }, tr.selection.from),
                        })
                    }

                    return true
                }),

            closeFindReplace: () =>
                whenEditable(({ tr, dispatch, commands }) => {
                    if (dispatch) {
                        tr.setMeta(findReplaceKey, { isOpen: false, matches: [], currentIndex: -1 })
                        commands.focus()
                    }

                    return true
                }),

            setFindOptions: (options) =>
                whenEditable(({ tr, dispatch }) => {
                    const state = findState()

                    if (!state.isOpen) {
                        return false
                    }

                    if (dispatch) {
                        const next = { ...state, ...options }
                        const searchChanged = ['query', 'matchCase', 'wholeWord'].some((key) => next[key] !== state[key])

                        if (searchChanged) {
                            const anchor = state.matches[state.currentIndex]?.from ?? tr.selection.from
                            const result = search(tr.doc, next, anchor)

                            selectFirstResult(tr, result)
                            tr.setMeta(findReplaceKey, { ...options, ...result })
                        } else {
                            tr.setMeta(findReplaceKey, options)
                        }
                    }

                    return true
                }),

            findNext: () => moveCurrent(1),

            findPrevious: () => moveCurrent(-1),

            replaceCurrent: () =>
                whenMatched((tr, state) => {
                    const match = state.matches[state.currentIndex]

                    replaceMatch(tr, match, state.replacement)

                    const result = search(tr.doc, state, match.from + state.replacement.length)

                    selectFirstResult(tr, result)
                    tr.setMeta(findReplaceKey, result)
                }),

            replaceAll: () =>
                whenMatched((tr, state) => {
                    ;[...state.matches].reverse().forEach((match) => replaceMatch(tr, match, state.replacement))

                    tr.setMeta(findReplaceKey, search(tr.doc, state, tr.selection.from))
                }),
        }
    },

    addProseMirrorPlugins() {
        const { editor } = this

        return [
            new Plugin({
                key: findReplaceKey,

                state: {
                    init: () => initialState,

                    apply(tr, value) {
                        const patch = tr.getMeta(findReplaceKey)

                        if (!patch && !(value.isOpen && tr.docChanged)) {
                            return value
                        }

                        const current = value.matches[value.currentIndex]
                        const anchor = current ? tr.mapping.map(current.from) : tr.selection.from
                        const next = { ...value, ...(patch ?? search(tr.doc, value, anchor)) }

                        return { ...next, decorations: buildDecorations(tr.doc, next) }
                    },
                },

                props: {
                    decorations: (state) => findReplaceKey.getState(state).decorations,
                },

                view: (view) =>
                    createFindPanel({
                        editor,
                        root: view.dom.closest('.rep-editor'),
                        view,
                        getState: (state) => findReplaceKey.getState(state),
                    }),
            }),
        ]
    },
})

import { PluginKey } from '@tiptap/pm/state'
import { exitSuggestion, Suggestion } from '@tiptap/suggestion'
import { createSuggestionList } from '../slash/suggestion-list'
import { insertMention } from './mention-node'

const ALLOWED_PREFIXES = [' ', '(', '[', '{', '"', "'"]

const SEARCH_DEBOUNCE = 200

let pluginCount = 0

// All of an editor's providers share one list, and two can be active at once, as in `@ada #` with spaces allowed on `@`.
const listOwners = new WeakMap()

/**
 * Builds a result row from strings and properties only, because results come from the server and can hold anything.
 */
function createRow(item, index, listId) {
    const row = document.createElement('button')
    const text = document.createElement('span')
    const label = document.createElement('span')

    row.type = 'button'
    row.tabIndex = -1
    row.id = `${listId}-${index}`
    row.className = 'rep-menu-item'
    row.setAttribute('role', 'option')
    row.setAttribute('aria-selected', 'false')
    row.dataset.repMentionIndex = String(index)

    if (item.avatar) {
        const avatar = document.createElement('img')

        avatar.className = 'rep-mention-avatar'
        avatar.src = item.avatar
        avatar.alt = ''
        row.append(avatar)
    }

    text.className = 'rep-menu-item-text'
    label.className = 'rep-menu-item-label'
    label.textContent = item.label
    text.append(label)

    if (item.description) {
        const description = document.createElement('span')

        description.className = 'rep-menu-item-description'
        description.textContent = item.description
        text.append(description)
    }

    row.append(text)

    return row
}

/**
 * The dropdown for one provider. All of an editor's providers share one list element, and only one can be open.
 */
export function createMentionMenuPlugin({ editor, root, element, provider, search, debounce = SEARCH_DEBOUNCE }) {
    const pluginKey = new PluginKey(`repMention${(pluginCount += 1)}`)
    const { trigger, allowSpaces, minQueryLength, messages } = provider

    let rows = []
    let results = []

    const list = createSuggestionList({
        editor,
        root,
        element,
        optionFor: (item) => rows[results.indexOf(item)],
        renderItems: (items) => {
            results = items
            rows = items.map((item, index) => createRow(item, index, element.id))
            element.replaceChildren(...rows)
        },
    })

    const showMessage = (props, text) => {
        listOwners.set(element, pluginKey)

        list.showStatus(props, () => {
            const message = document.createElement('div')

            message.className = 'rep-menu-status'
            message.setAttribute('aria-hidden', 'true')
            message.textContent = text
            rows = []
            results = []
            element.replaceChildren(message)
        }, text)
    }

    const render = (props) => {
        const query = props.query ?? ''

        if (query.length < minQueryLength) {
            list.setBusy(false)
            showMessage(props, messages.searchPrompt)

            return
        }

        if (props.loading) {
            list.setBusy(true)
            showMessage(props, messages.searching)

            return
        }

        list.setBusy(false)

        if (props.items.length) {
            listOwners.set(element, pluginKey)
            list.show(props, props.items)

            return
        }

        // With spaces allowed, a query never ends by itself, so a sentence would keep this open until the paragraph ends.
        // Any space counts, because fast typing can skip the search that would have run on one at the end.
        if (allowSpaces && /\s/.test(query)) {
            exitSuggestion(editor.view, pluginKey)

            return
        }

        showMessage(props, messages.noResults)
    }

    const closeOnBlur = () => exitSuggestion(editor.view, pluginKey)

    const onClick = (event) => {
        const index = event.target.closest('[data-rep-mention-index]')?.dataset.repMentionIndex

        if (index !== undefined && listOwners.get(element) === pluginKey) {
            list.select(results[Number(index)])
        }
    }

    element.addEventListener('click', onClick)

    editor.once('destroy', () => {
        list.destroy()
        element.removeEventListener('click', onClick)
    })

    return Suggestion({
        pluginKey,
        editor,
        char: trigger,
        allowSpaces,
        allowedPrefixes: ALLOWED_PREFIXES,
        debounce,
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: async ({ query }) => {
            if (query.length < minQueryLength) {
                return []
            }

            try {
                return (await search(query, trigger)) ?? []
            } catch (error) {
                console.error('[rich-editor-plus] The mention search failed.', error)

                return []
            }
        },
        command: ({ editor, range, props }) => insertMention(editor, range, props, trigger),
        render: () => ({
            onStart(props) {
                list.start(props)
                editor.on('blur', closeOnBlur)
                render(props)
            },

            onUpdate: render,

            onKeyDown: ({ event }) => list.onKeyDown(event),

            onExit() {
                editor.off('blur', closeOnBlur)
                rows = []
                results = []

                if (listOwners.get(element) !== pluginKey) {
                    list.forget()

                    return
                }

                element.replaceChildren()
                list.exit()
            },
        }),
    })
}

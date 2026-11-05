import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMentionMenuPlugin } from '../../resources/js/mentions/mention-menu'
import { registerSuggestion } from '../../resources/js/slash/suggestion-list'
import { doc, makeEditor } from './support/make-editor'

const people = [
    { id: '1', label: 'Ada Lovelace', description: 'Engineering', avatar: '/ada.png' },
    { id: '2', label: 'Grace Hopper', description: null, avatar: null },
]

const messages = { noResults: 'Nothing found', searching: 'Searching', searchPrompt: 'Type to search' }

const provider = (overrides = {}) => ({
    trigger: '@',
    allowSpaces: false,
    minQueryLength: 0,
    displayFormat: '@:label',
    messages,
    ...overrides,
})

const editors = []

function setUp({ content = { type: 'doc', content: [{ type: 'paragraph' }] }, search, config } = {}) {
    const root = document.createElement('div')
    const element = document.createElement('div')

    element.id = `menu-${editors.length}`
    element.hidden = true
    root.append(element)
    document.body.append(root)

    const editor = makeEditor(content)
    const searchMock = search ?? vi.fn(async () => people)

    const plugin = createMentionMenuPlugin({
        editor,
        root,
        element,
        provider: provider(config),
        search: searchMock,
        debounce: 0,
    })

    registerSuggestion(editor, plugin)
    editor.commands.setTextSelection(1)
    editors.push(editor)

    return { editor, root, element, search: searchMock, key: plugin.spec.key }
}

const pressKey = (editor, key) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true })

    return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event)) ?? false
}

const rows = (element) => [...element.querySelectorAll('[role="option"]')]

const type = (editor, text) => editor.view.dispatch(editor.state.tr.insertText(text))

afterEach(() => {
    editors.splice(0).forEach((editor) => editor.destroy())
    document.body.innerHTML = ''
    vi.restoreAllMocks()
})

describe('opening', () => {
    it('searches and shows rows', async () => {
        const { editor, element, search } = setUp()

        type(editor, '@ad')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        expect(search).toHaveBeenLastCalledWith('ad', '@')
        expect(element.hidden).toBe(false)
    })

    it('works in a list item', async () => {
        const { editor, element } = setUp({
            content: doc({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }),
        })

        editor.commands.setTextSelection(3)
        type(editor, '@')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))
    })

    it('does not open in a code block', async () => {
        const { editor, element, key } = setUp({ content: doc({ type: 'codeBlock' }) })

        type(editor, '@')

        expect(key.getState(editor.state).active).toBe(false)
        expect(element.hidden).toBe(true)
    })

    it('stays closed in an email address', () => {
        const { editor, key } = setUp()

        type(editor, 'ada@example')

        expect(key.getState(editor.state).active).toBe(false)
    })

    it('opens for a multi-character trigger', async () => {
        const { editor, element, search } = setUp({ config: { trigger: '[[', displayFormat: '[[:label]]' } })

        type(editor, '[[pa')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        expect(search).toHaveBeenLastCalledWith('pa', '[[')
    })
})

describe('rows', () => {
    it('shows label, description and avatar', async () => {
        const { editor, element } = setUp()

        type(editor, '@')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        expect(rows(element)[0].textContent).toContain('Ada Lovelace')
        expect(rows(element)[0].textContent).toContain('Engineering')
        expect(rows(element)[0].querySelector('img').getAttribute('src')).toBe('/ada.png')
        expect(rows(element)[1].querySelector('img')).toBeNull()
    })

    it('cannot be used to inject markup', async () => {
        const { editor, element } = setUp({
            search: async () => [{ id: '1', label: '<img src=x onerror=alert(1)>', description: '<b>x</b>', avatar: null }],
        })

        type(editor, '@')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(1))

        expect(element.querySelector('img')).toBeNull()
        expect(element.querySelector('b')).toBeNull()
        expect(element.textContent).toContain('<img src=x onerror=alert(1)>')
    })
})

describe('status', () => {
    it('shows the prompt below the minimum length and does not search', async () => {
        const { editor, element, search } = setUp({ config: { minQueryLength: 2 } })

        type(editor, '@a')

        await vi.waitFor(() => expect(element.textContent).toContain('Type to search'))

        expect(search).not.toHaveBeenCalled()
    })

    it('shows that it is searching', async () => {
        const { editor, element } = setUp({ search: () => new Promise(() => {}) })

        type(editor, '@a')

        await vi.waitFor(() => expect(element.textContent).toContain('Searching'))
    })

    it('shows the no-results message', async () => {
        const { editor, element } = setUp({ search: async () => [] })

        type(editor, '@a')

        await vi.waitFor(() => expect(element.textContent).toContain('Nothing found'))
    })

    it('reads status messages out through the live region, keeping them out of the listbox', async () => {
        const { editor, root, element } = setUp({ search: async () => [] })
        const live = document.createElement('span')

        live.setAttribute('data-rep-live', '')
        root.append(live)
        type(editor, '@a')

        await vi.waitFor(() => expect(live.textContent).toBe('Nothing found'))
        expect(element.querySelector('.rep-menu-status').getAttribute('aria-hidden')).toBe('true')
    })

    it('treats a failed request as no results', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const { editor, element } = setUp({ search: async () => Promise.reject(new Error('down')) })

        type(editor, '@a')

        await vi.waitFor(() => expect(element.textContent).toContain('Nothing found'))
    })
})

describe('keyboard', () => {
    it('inserts the highlighted row and closes', async () => {
        const { editor, element } = setUp()

        type(editor, '@')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        pressKey(editor, 'ArrowDown')
        expect(pressKey(editor, 'Enter')).toBe(true)

        expect(editor.getJSON().content[0].content[0].attrs).toEqual({ id: '2', label: 'Grace Hopper', char: '@' })

        await vi.waitFor(() => expect(element.hidden).toBe(true))
    })

    it('swallows Enter during a search, so a fast @ada + Enter does not start a new line', async () => {
        const { editor } = setUp({ search: () => new Promise(() => {}) })

        type(editor, '@a')

        await vi.waitFor(() => expect(pressKey(editor, 'Enter')).toBe(true))

        expect(editor.state.doc.childCount).toBe(1)
    })

    it('leaves Enter alone with no results, keeping the text', async () => {
        const { editor, element } = setUp({ search: async () => [] })

        type(editor, '@nobody')

        await vi.waitFor(() => expect(element.textContent).toContain('Nothing found'))

        pressKey(editor, 'Enter')

        expect(editor.state.doc.childCount).toBe(2)
        expect(editor.state.doc.firstChild.textContent).toBe('@nobody')
    })

    it('closes on Escape, keeps the text and does not reopen', async () => {
        const { editor, element, key } = setUp()

        type(editor, '@a')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        pressKey(editor, 'Escape')
        type(editor, 'd')

        expect(key.getState(editor.state).active).toBe(false)
        expect(editor.getText()).toBe('@ad')
    })
})

describe('spaces', () => {
    it('ends the query at a space by default', () => {
        const { editor, key } = setUp()

        type(editor, '@ada ')

        expect(key.getState(editor.state).active).toBe(false)
    })

    it('keeps searching past a space with allowSpaces', async () => {
        const { editor, search } = setUp({ config: { allowSpaces: true } })

        type(editor, '@ada love')

        await vi.waitFor(() => expect(search).toHaveBeenLastCalledWith('ada love', '@'))
    })

    it('gives up with allowSpaces once nothing matches and a space is typed', async () => {
        const { editor, key, element } = setUp({ search: async () => [], config: { allowSpaces: true } })

        type(editor, '@nobody')

        await vi.waitFor(() => expect(element.textContent).toContain('Nothing found'))

        type(editor, ' ')

        await vi.waitFor(() => expect(key.getState(editor.state).active).toBe(false))

        type(editor, 'and then a sentence')

        expect(key.getState(editor.state).active).toBe(false)
        expect(element.hidden).toBe(true)
    })
})

describe('spaces, typed faster than the debounce', () => {
    it('gives up even when no search ran on a query ending in a space', async () => {
        const { editor, key } = setUp({ search: async () => [], config: { allowSpaces: true } })

        type(editor, '@nobody and more')

        await vi.waitFor(() => expect(key.getState(editor.state).active).toBe(false))
    })
})

describe('lifecycle', () => {
    it('ignores a response that arrives after the menu closed', async () => {
        let resolve

        const { editor, element } = setUp({ search: () => new Promise((done) => (resolve = done)) })

        type(editor, '@a')

        await vi.waitFor(() => expect(element.textContent).toContain('Searching'))

        pressKey(editor, 'Escape')
        resolve(people)

        await new Promise((done) => setTimeout(done, 20))

        expect(element.hidden).toBe(true)
        expect(rows(element)).toHaveLength(0)
    })

    it('closes on blur', async () => {
        const { editor, element } = setUp()

        editor.commands.focus(1)
        type(editor, '@')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        editor.view.dom.blur()

        await vi.waitFor(() => expect(element.hidden).toBe(true))
    })

    it('inserts on click', async () => {
        const { editor, element } = setUp()

        type(editor, '@')

        await vi.waitFor(() => expect(rows(element)).toHaveLength(2))

        rows(element)[1].click()

        expect(editor.getJSON().content[0].content[0].attrs.id).toBe('2')
    })

    it('keeps two triggers apart on one editor', async () => {
        const first = setUp()
        const tagSearch = vi.fn(async () => [{ id: '9', label: 'Bug' }])
        const element = document.createElement('div')

        element.hidden = true
        first.root.append(element)

        const plugin = createMentionMenuPlugin({
            editor: first.editor,
            root: first.root,
            element,
            provider: provider({ trigger: '#' }),
            search: tagSearch,
            debounce: 0,
        })

        registerSuggestion(first.editor, plugin)

        type(first.editor, '#b')

        await vi.waitFor(() => expect(tagSearch).toHaveBeenCalledWith('b', '#'))

        expect(first.search).not.toHaveBeenCalled()
    })

    it('keeps a second trigger open when an allowSpaces query beside it gives up', async () => {
        const first = setUp({ search: async () => [], config: { allowSpaces: true } })

        registerSuggestion(
            first.editor,
            createMentionMenuPlugin({
                editor: first.editor,
                root: first.root,
                element: first.element,
                provider: provider({ trigger: '#' }),
                search: async () => [{ id: '9', label: 'Bug' }],
                debounce: 0,
            }),
        )

        type(first.editor, '@ada #')

        await vi.waitFor(() => expect(rows(first.element)).toHaveLength(1))
        await new Promise((done) => setTimeout(done, 30))

        expect(first.element.hidden).toBe(false)
        expect(rows(first.element)).toHaveLength(1)
        expect(first.root.hasAttribute('data-rep-suggesting')).toBe(true)

        pressKey(first.editor, 'Enter')

        expect(first.editor.state.doc.childCount).toBe(1)
        expect(first.editor.getJSON().content[0].content.find(({ type }) => type === 'mention').attrs.char).toBe('#')
    })

    it('runs a click once when two providers share the menu', async () => {
        const first = setUp()
        const tagSearch = vi.fn(async () => [{ id: '9', label: 'Bug' }])

        registerSuggestion(
            first.editor,
            createMentionMenuPlugin({
                editor: first.editor,
                root: first.root,
                element: first.element,
                provider: provider({ trigger: '#' }),
                search: tagSearch,
                debounce: 0,
            }),
        )

        type(first.editor, '#')

        await vi.waitFor(() => expect(rows(first.element)).toHaveLength(1))

        rows(first.element)[0].click()

        expect(first.editor.getJSON().content[0].content[0].attrs.char).toBe('#')
    })

    it('keeps two editors on one page apart', async () => {
        const one = setUp()
        const two = setUp()

        type(one.editor, '@')

        await vi.waitFor(() => expect(rows(one.element)).toHaveLength(2))

        expect(two.element.hidden).toBe(true)
        expect(two.search).not.toHaveBeenCalled()
    })

    it('removes its listeners when the editor is destroyed', () => {
        const { editor, element } = setUp()
        const removed = vi.spyOn(element, 'removeEventListener')

        editor.destroy()

        expect(removed.mock.calls.map(([type]) => type).sort()).toEqual(['click', 'mousedown'])
    })
})

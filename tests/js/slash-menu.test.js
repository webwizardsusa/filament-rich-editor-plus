import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    createSlashMenuPlugin,
    filterBlockTypes,
    registerSlashMenu,
    runSlashItem,
    slashMenuKey,
} from '../../resources/js/slash/slash-menu'
import { setCheckedContent } from '../../resources/js/content-check'
import { blockTypes, named } from './support/block-types'
import { blockSummary, doc, makeEditor, p } from './support/make-editor'
import { makeToolbarRoot } from './support/toolbar-markup'

let editor
let root

const pressKey = (key) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true })

    return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event)) ?? false
}

const isActive = () => slashMenuKey.getState(editor.state).active

const menu = () => root.querySelector('[data-rep-slash-menu]')

function setUp(content, mountAction = vi.fn()) {
    root = makeToolbarRoot()
    editor = makeEditor(content)

    registerSlashMenu(
        editor,
        createSlashMenuPlugin({ editor, root, element: menu(), blockTypes, mountAction }),
    )

    return mountAction
}

afterEach(() => {
    editor?.destroy()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
})

const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

describe('filtering', () => {
    it('matches label and keywords, ignoring case', () => {
        const names = (query) => filterBlockTypes(blockTypes, query).map(({ name }) => name)

        expect(names('h2')).toEqual(['heading2'])
        expect(names('TITLE')).toEqual(['heading2', 'heading3'])
        expect(names('Divid')).toEqual(['divider'])
        expect(names('')).toHaveLength(blockTypes.length)
        expect(names('nothing')).toEqual([])
    })
})

describe('filtering by the start of a word', () => {
    it('does not match letters inside a word, so /h offers headings before paragraphs', () => {
        expect(filterBlockTypes(blockTypes, 'h').map(({ name }) => name)).toEqual(['heading2', 'heading3'])
    })

    it('matches the start of any word and a whole label', () => {
        expect(filterBlockTypes(blockTypes, '2').map(({ name }) => name)).toEqual(['heading2'])
        expect(filterBlockTypes(blockTypes, 'heading 3').map(({ name }) => name)).toEqual(['heading3'])
    })
})

describe('trigger', () => {
    it('opens for a slash alone in a top-level paragraph', () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)

        editor.commands.insertContent('/')

        expect(isActive()).toBe(true)
    })

    it('stays open while filtering and shows only matches', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h2')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        expect(menu().querySelector('[data-rep-block-type="heading2"]').hidden).toBe(false)
        expect(menu().querySelector('[data-rep-block-type="table"]').hidden).toBe(true)
    })

    it.each([
        ['mid-sentence', doc(p('hello ')), 7],
        ['before existing text', doc(p('hello')), 1],
    ])('does not open %s', (_, content, position) => {
        setUp(content)
        editor.commands.setTextSelection(position)

        editor.commands.insertContent('/')

        expect(isActive()).toBe(false)
    })

    it.each([
        ['a list item', doc({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }), 3],
        ['a code block', doc({ type: 'codeBlock' }), 1],
    ])('does not open inside %s', (_, content, position) => {
        setUp(content)
        editor.commands.setTextSelection(position)

        editor.commands.insertContent('/')

        expect(isActive()).toBe(false)
    })

    it('does not open for a double slash', () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)

        editor.commands.insertContent('//')

        expect(isActive()).toBe(false)
    })

    it('closes on a space and keeps the text', () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h')

        editor.view.dispatch(editor.state.tr.insertText(' '))

        expect(isActive()).toBe(false)
        expect(editor.getText()).toBe('/h ')
    })
})

describe('keyboard', () => {
    it('runs the highlighted item on Enter, ahead of the normal Enter key', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h2')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        expect(pressKey('Enter')).toBe(true)
        expect(blockSummary(editor)).toEqual(['heading'])
    })

    it('moves the highlight and wraps round', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/title')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        pressKey('ArrowDown')
        pressKey('Tab')

        expect(editor.getJSON().content[0].attrs.level).toBe(3)
    })

    it('wraps upward to the last match', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/title')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        pressKey('ArrowUp')

        expect(editor.view.dom.getAttribute('aria-activedescendant')).toBe('s-heading3')
    })

    it('closes on Escape, keeps the text, and does not reopen for that slash', () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/')

        pressKey('Escape')
        expect(isActive()).toBe(false)

        editor.commands.insertContent('h')

        expect(isActive()).toBe(false)
        expect(editor.getText()).toBe('/h')
    })

    it('lets Enter through when nothing matches, keeping the typed text', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/usr')

        await vi.waitFor(() => expect(menu().hidden).toBe(true))

        expect(pressKey('Enter')).toBe(true)
        expect(blockSummary(editor)).toEqual(['paragraph:/usr', 'paragraph'])
    })

    it('reopens when deleting back to a match', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h2x')

        await vi.waitFor(() => expect(menu().hidden).toBe(true))

        editor.commands.deleteRange({ from: 4, to: 5 })

        await vi.waitFor(() => expect(menu().hidden).toBe(false))
    })
})

describe('running', () => {
    it('removes the query before applying the block', () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/hr')

        runSlashItem(editor, { from: 1, to: 4 }, named('divider'), blockTypes, vi.fn())

        expect(blockSummary(editor)).toEqual(['horizontalRule', 'paragraph'])
    })

    it('opens the action for a table with the query gone', () => {
        const mountAction = setUp(emptyDoc)

        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/table')

        runSlashItem(editor, { from: 1, to: 7 }, named('table'), blockTypes, mountAction)

        expect(mountAction).toHaveBeenCalledWith('insertTable', {})
        expect(blockSummary(editor)).toEqual(['paragraph'])
    })

    it('leaves the typed text alone when the command does not exist', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/x')

        const missing = { ...named('heading2'), command: 'setSomethingElse' }

        expect(runSlashItem(editor, { from: 1, to: 3 }, missing, blockTypes, vi.fn())).toBe(false)
        expect(editor.getText()).toBe('/x')
    })

    it('runs an item on click', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h2')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        menu().querySelector('[data-rep-block-type="heading2"]').click()

        expect(blockSummary(editor)).toEqual(['heading'])
    })
})

describe('accessibility and lifecycle', () => {
    it('points the editor at the highlighted option while open', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h2')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        expect(editor.view.dom.getAttribute('aria-activedescendant')).toBe('s-heading2')
        expect(editor.view.dom.getAttribute('aria-controls')).toBe(menu().id)
        expect(editor.view.dom.hasAttribute('aria-expanded')).toBe(false)
        expect(root.hasAttribute('data-rep-suggesting')).toBe(true)
    })

    it('closes when the editor loses focus, keeping the text', async () => {
        setUp(emptyDoc)
        editor.commands.focus(1)
        editor.commands.insertContent('/h')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        editor.view.dom.blur()

        await vi.waitFor(() => expect(menu().hidden).toBe(true))

        expect(isActive()).toBe(false)
        expect(editor.getText()).toBe('/h')
    })

    it('closes when a refused update locks the editor', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        setCheckedContent(editor, doc({ type: 'noSuchBlock' }), 'json')

        await vi.waitFor(() => expect(menu().hidden).toBe(true))

        expect(root.hasAttribute('data-rep-suggesting')).toBe(false)
    })

    it('lets the toolbar back while no block matches, and hides it again on a match', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h2x')

        await vi.waitFor(() => expect(root.hasAttribute('data-rep-suggesting')).toBe(false))

        editor.commands.deleteRange({ from: 4, to: 5 })

        await vi.waitFor(() => expect(root.hasAttribute('data-rep-suggesting')).toBe(true))
    })

    it('removes its menu listeners when the editor is destroyed', () => {
        setUp(emptyDoc)

        const removed = vi.spyOn(menu(), 'removeEventListener')

        editor.destroy()

        expect(removed.mock.calls.map(([type]) => type).sort()).toEqual(['click', 'mousedown'])
    })

    it('closes on an external content update and deletes nothing else', async () => {
        setUp(emptyDoc)
        editor.commands.setTextSelection(1)
        editor.commands.insertContent('/h')

        await vi.waitFor(() => expect(menu().hidden).toBe(false))

        editor.commands.setContent(doc(p('from the server')), { emitUpdate: false })

        await vi.waitFor(() => expect(menu().hidden).toBe(true))

        expect(blockSummary(editor)).toEqual(['paragraph:from the server'])
        expect(root.hasAttribute('data-rep-suggesting')).toBe(false)
    })
})

describe('inside a quote', () => {
    const quote = (...content) => ({ type: 'blockquote', content })
    const empty = { type: 'paragraph' }
    const item = (...content) => ({ type: 'listItem', content })
    const bullets = (...items) => ({ type: 'bulletList', content: items })

    /**
     * Puts the cursor in the first empty paragraph and types `query` there, returning its range.
     */
    const typeInEmptyParagraph = (query) => {
        let position

        editor.state.doc.descendants((node, pos) => {
            if (position === undefined && node.type.name === 'paragraph' && node.content.size === 0) {
                position = pos + 1
            }
        })

        editor.commands.setTextSelection(position)
        editor.commands.insertContent(query)

        return { from: position, to: position + query.length }
    }

    const run = (name, content = doc(quote(p('a'), empty))) => {
        setUp(content)

        const range = typeInEmptyParagraph(`/${name}`)

        expect(runSlashItem(editor, range, named(name), blockTypes, vi.fn())).toBe(true)
    }

    it('opens in a quote', () => {
        setUp(doc(quote(empty)))
        typeInEmptyParagraph('/')

        expect(isActive()).toBe(true)
    })

    it('opens in a nested quote', () => {
        setUp(doc(quote(quote(empty))))
        typeInEmptyParagraph('/')

        expect(isActive()).toBe(true)
    })

    it('stays closed after other text in a quote', () => {
        setUp(doc(quote(p('a'))))
        editor.commands.setTextSelection(3)
        editor.commands.insertContent('/')

        expect(isActive()).toBe(false)
    })

    it('stays closed in a list inside a quote', () => {
        setUp(doc(quote(bullets(item(empty)))))
        typeInEmptyParagraph('/')

        expect(isActive()).toBe(false)
    })

    it('stays closed in a quote inside a list', () => {
        setUp(doc(bullets(item(quote(empty)))))
        typeInEmptyParagraph('/')

        expect(isActive()).toBe(false)
    })

    it('stays closed in a top-level list', () => {
        setUp(doc(bullets(item(empty))))
        typeInEmptyParagraph('/')

        expect(isActive()).toBe(false)
    })

    it('makes a heading of that paragraph only', () => {
        run('heading2')

        expect(editor.getJSON()).toEqual(
            doc(quote(p('a'), { type: 'heading', attrs: { level: 2 } })),
        )
    })

    it('makes a list inside the quote', () => {
        run('bulletList')

        expect(editor.getJSON()).toEqual(doc(quote(p('a'), bullets(item(empty)))))
    })

    it('nests a quote', () => {
        run('blockquote')

        expect(editor.getJSON()).toEqual(doc(quote(p('a'), quote(empty))))
    })

    it('makes a code block inside the quote', () => {
        run('codeBlock')

        expect(editor.getJSON()).toEqual(
            doc(quote(p('a'), { type: 'codeBlock', attrs: { language: null } })),
        )
    })

    it('keeps a paragraph as it is, with the query gone', () => {
        run('paragraph')

        expect(editor.getJSON()).toEqual(doc(quote(p('a'), empty)))
    })

    it('adds a divider with somewhere to keep typing', () => {
        run('divider')

        expect(editor.getJSON()).toEqual(doc(quote(p('a'), { type: 'horizontalRule' }, empty)))
        expect(editor.state.selection.$from.parent.type.name).toBe('paragraph')
        expect(editor.state.selection.$from.depth).toBe(2)
    })

    it('opens the table action with the cursor still in the quote', () => {
        const mountAction = setUp(doc(quote(empty)))
        const range = typeInEmptyParagraph('/table')

        runSlashItem(editor, range, named('table'), blockTypes, mountAction)

        expect(mountAction).toHaveBeenCalledWith('insertTable', {})
        expect(editor.getJSON()).toEqual(doc(quote(empty)))
    })

    it('leaves a top-level switch working on the whole block', () => {
        setUp(doc(p('a'), empty))

        const range = typeInEmptyParagraph('/heading2')

        runSlashItem(editor, range, named('heading2'), blockTypes, vi.fn())

        expect(blockSummary(editor)).toEqual(['paragraph:a', 'heading'])
    })

    it('undoes the block in one step after the query', () => {
        run('heading2')

        editor.commands.undo()

        expect(editor.getJSON().content[0].content[1].type).toBe('paragraph')
    })
})

import { PluginKey } from '@tiptap/pm/state'
import { exitSuggestion, Suggestion } from '@tiptap/suggestion'
import { isContainerNode } from '../blocks/active-block'
import { canRunBlockType, runBlockType } from '../blocks/block-types'
import { createSuggestionList, registerSuggestion } from './suggestion-list'

export const slashMenuKey = new PluginKey('repSlashMenu')

/**
 * Matches the start of a word, not letters inside one: `/h` should offer headings, not "Paragraph".
 */
export function filterBlockTypes(blockTypes, query) {
    const needle = query.trim().toLowerCase()

    const matches = (word) => {
        const lowered = word.toLowerCase()

        return lowered.startsWith(needle) || lowered.split(/\s+/).some((part) => part.startsWith(needle))
    }

    return blockTypes.filter(({ label, keywords }) => needle === '' || [label, ...(keywords ?? [])].some(matches))
}

const isTopLevelOrInContainer = ($position) => {
    for (let depth = 1; depth < $position.depth; depth++) {
        if (!isContainerNode($position.node(depth).type)) {
            return false
        }
    }

    return $position.depth >= 1
}

/**
 * The menu only opens when the slash and its query are all a paragraph holds, with the cursor after them, and the
 * paragraph is at the top level or only inside containers such as quotes. The cursor check matters because the match runs on past it: a slash typed before the word "hello" would otherwise
 * count as the query `/hello`. Anywhere else `/` is a plain character, which keeps URLs and file paths out of its way.
 */
export function isSlashAllowed({ state, range }) {
    const $from = state.doc.resolve(range.from)

    return (
        isTopLevelOrInContainer($from) &&
        $from.parent.type.name === 'paragraph' &&
        range.from === $from.start() &&
        range.to === $from.end() &&
        state.selection.from === range.to
    )
}

/**
 * Replaces the typed `/query` with the block. The command is checked first, so a broken plugin cannot eat the text.
 */
export function runSlashItem(editor, range, blockType, blockTypes, mountAction) {
    if (!canRunBlockType(editor, blockType)) {
        return false
    }

    // Switching replaces the whole top-level block, so inside a quote the command runs on just this paragraph.
    if (editor.state.doc.resolve(range.from).depth > 1 && !blockType.action) {
        const chain = editor.chain().focus().deleteRange(range)

        // It is already a paragraph, and `setParagraph` reports a failure when nothing changes.
        return blockType.node.name === 'paragraph'
            ? chain.run()
            : chain[blockType.command](...(blockType.arguments ?? [])).run()
    }

    editor.chain().focus().deleteRange(range).run()

    return runBlockType(editor, blockType, blockTypes, mountAction)
}

/**
 * The server renders one option per block type; this shows the ones that match.
 */
export function createSlashMenuPlugin({ editor, root, element, blockTypes, mountAction }) {
    const options = new Map(
        [...element.querySelectorAll('[data-rep-block-type]')].map((option) => [option.dataset.repBlockType, option]),
    )

    const list = createSuggestionList({
        editor,
        root,
        element,
        optionFor: (blockType) => options.get(blockType?.name),
        renderItems: (blockTypesShown) => {
            const visible = new Set(blockTypesShown.map(({ name }) => name))

            options.forEach((option, name) => {
                option.hidden = !visible.has(name)
            })
        },
    })

    let matches = []

    const render = (props) => {
        if (props.loading) {
            return
        }

        matches = props.items
        list.show(props, matches)
    }

    const closeOnBlur = () => exitSuggestion(editor.view, slashMenuKey)

    const onClick = (event) => {
        const name = event.target.closest('[data-rep-block-type]')?.dataset.repBlockType
        const blockType = matches.find((match) => match.name === name)

        if (blockType) {
            list.select(blockType)
        }
    }

    element.addEventListener('click', onClick)

    editor.once('destroy', () => {
        list.destroy()
        element.removeEventListener('click', onClick)
    })

    return Suggestion({
        pluginKey: slashMenuKey,
        editor,
        char: '/',
        startOfLine: true,
        allowedPrefixes: null,
        allow: isSlashAllowed,
        items: ({ query }) => filterBlockTypes(blockTypes, query),
        command: ({ editor, range, props }) => runSlashItem(editor, range, props, blockTypes, mountAction),
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
                matches = []
                list.exit()
            },
        }),
    })
}

export const registerSlashMenu = registerSuggestion

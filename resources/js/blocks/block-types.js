import { TextSelection } from '@tiptap/pm/state'
import { resolveActionArguments } from '../registry'
import { countSelectedParagraphs, getActiveBlock, selectionSpansBlocks, selectsNestedBlock } from './active-block'

export const toBlockTypeList = (config) => Object.entries(config).map(([name, blockType]) => ({ name, ...blockType }))

/**
 * The block type of a top-level node. Attributes matter: a heading is only "Heading 2" at level 2.
 */
export function findBlockType(blockTypes, node) {
    return blockTypes.find(
        ({ node: { name, attributes } }) =>
            name === node.type.name &&
            Object.entries(attributes ?? {}).every(([key, value]) => node.attrs[key] === value),
    )
}

export function canRunBlockType(editor, blockType) {
    if (blockType.action) {
        return true
    }

    if (typeof editor.chain()[blockType.command] === 'function') {
        return true
    }

    console.warn(`[rich-editor-plus] The editor has no [${blockType.command}] command.`)

    return false
}

/**
 * Lists each run of text in a block, with where it starts in the document. A code block holds its lines as one string,
 * which would collapse into one line anywhere else, so each line is its own run.
 */
function textRuns(block, schema) {
    const runs = []

    const visit = (node, start) => {
        if (!node.type.spec.code) {
            runs.push({ start, size: node.content.size, content: node.content })

            return
        }

        let lineStart = start

        node.textContent.split('\n').forEach((line) => {
            runs.push({ start: lineStart, size: line.length, content: line === '' ? null : schema.text(line) })
            lineStart += line.length + 1
        })
    }

    if (block.node.isTextblock) {
        visit(block.node, block.pos + 1)
    } else {
        block.node.descendants((node, offset) => {
            if (!node.isTextblock) {
                return true
            }

            visit(node, block.pos + 2 + offset)

            return false
        })
    }

    return runs.length ? runs : [{ start: block.pos + 1, size: 0, content: null }]
}

/**
 * Replaces a block with one paragraph per run of text, so any block type can then be applied to it. Returns the new
 * block's end, and a function that finds a position from the old block in the new one. TipTap's `clearNodes` is no use
 * here: it breaks on nested content, and on earlier steps in the same transaction.
 */
function flattenToParagraphs(tr, block) {
    const { schema } = tr.doc.type
    const runs = textRuns(block, schema)

    tr.replaceWith(
        block.pos,
        block.pos + block.node.nodeSize,
        runs.map(({ content }) => schema.nodes.paragraph.create(null, content)),
    )

    let contentStart = block.pos + 1

    const placedRuns = runs.map((run) => {
        const placed = { ...run, contentStart }

        contentStart += run.size + 2

        return placed
    })

    const mapPosition = (position) => {
        const run =
            placedRuns.find(({ start, size }) => position >= start && position <= start + size) ?? placedRuns[0]

        return run.contentStart + Math.min(Math.max(position - run.start, 0), run.size)
    }

    return { end: contentStart - 1, mapPosition }
}

/**
 * Turns the active block into another block type, in one undo step, with the cursor where it was. Blocks with several
 * items split into one block each, as in Gutenberg. Several selected paragraphs instead become one block, for the
 * types marked `multiBlock`.
 */
export function switchBlock(editor, blockType, blockTypes) {
    const { state } = editor

    if (countSelectedParagraphs(state)) {
        return (
            Boolean(blockType.multiBlock) &&
            canRunBlockType(editor, blockType) &&
            editor.chain().focus()[blockType.command](...(blockType.arguments ?? [])).run()
        )
    }

    const block = getActiveBlock(state)

    if (
        !block ||
        !blockType.switchable ||
        selectionSpansBlocks(state) ||
        selectsNestedBlock(state) ||
        !canRunBlockType(editor, blockType)
    ) {
        return false
    }

    const current = findBlockType(blockTypes, block.node)

    if (!current?.switchable || current.name === blockType.name) {
        return false
    }

    const { anchor, head } = state.selection

    let flatAnchor
    let flatHead
    let stepsBeforeCommand

    const chain = editor
        .chain()
        .focus()
        .command(({ tr }) => {
            const { end, mapPosition } = flattenToParagraphs(tr, block)

            flatAnchor = mapPosition(anchor)
            flatHead = mapPosition(head)
            stepsBeforeCommand = tr.mapping.maps.length

            tr.setSelection(TextSelection.between(tr.doc.resolve(block.pos), tr.doc.resolve(end)))

            return true
        })

    // Flattening has already made the paragraphs, and `setParagraph` falls back to `clearNodes` when nothing changes.
    if (blockType.node.name !== 'paragraph') {
        chain[blockType.command](...(blockType.arguments ?? []))
    }

    chain
        .command(({ tr }) => {
            const mapping = tr.mapping.slice(stepsBeforeCommand)

            tr.setSelection(
                TextSelection.between(tr.doc.resolve(mapping.map(flatAnchor)), tr.doc.resolve(mapping.map(flatHead))),
            )

            return true
        })
        .run()

    return true
}

/**
 * Applies a block type at the cursor: a Filament action, a switch of the current block, or a plain insert.
 */
export function runBlockType(editor, blockType, blockTypes, mountAction) {
    if (!canRunBlockType(editor, blockType)) {
        return false
    }

    if (blockType.action) {
        mountAction(blockType.action, resolveActionArguments(blockType.action, editor))

        return true
    }

    if (blockType.switchable) {
        return switchBlock(editor, blockType, blockTypes)
    }

    return editor.chain().focus()[blockType.command](...(blockType.arguments ?? [])).run()
}

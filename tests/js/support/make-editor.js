import { Editor } from '@tiptap/core'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import '../../../resources/js/extensions/core'
import { registerExtension, resolveExtensions } from '../../../resources/js/registry'

registerExtension('hollyit/table', () => [Table, TableRow, TableHeader, TableCell])

export const defaultPluginIds = [
    'core/document',
    'core/bold',
    'core/blockquote',
    'core/heading',
    'core/bullet-list',
    'core/ordered-list',
    'core/code-block',
    'core/divider',
    'core/mention',
    'core/find-replace',
    'hollyit/table',
]

const optionsFor = {
    'core/heading': { levels: [2, 3] },
    // PHP sends an empty array when links stay in the tab, which replaces TipTap's default `target` and `rel`. `{}` would merge with them.
    'core/link': { protocols: [], defaultProtocol: 'https', autolink: false, HTMLAttributes: [] },
    'core/mention': {
        providers: [
            { trigger: '@', allowSpaces: true, minQueryLength: 0, displayFormat: '@:label', messages: {} },
            { trigger: '#', allowSpaces: false, minQueryLength: 0, displayFormat: '#:label', messages: {} },
            { trigger: '[[', allowSpaces: false, minQueryLength: 0, displayFormat: '[[:label]]', messages: {} },
        ],
    },
}

/**
 * `context` is what factories get as their third argument, such as `{ callPlugin }`.
 */
export function editorOptions(content, pluginIds = defaultPluginIds, context = {}) {
    const element = document.createElement('div')
    document.body.append(element)

    const { extensions } = resolveExtensions(
        pluginIds.map((id) => (typeof id === 'string' ? { id, options: optionsFor[id] ?? {} } : id)),
        {},
        context,
    )

    return { element, extensions, content }
}

export function makeEditor(content, pluginIds = defaultPluginIds, context = {}) {
    return new Editor(editorOptions(content, pluginIds, context))
}

export const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

export const doc = (...content) => ({ type: 'doc', content })

/**
 * Each top-level block as `type:text`, to compare document structure at a glance.
 */
export const blockSummary = (editor) =>
    editor.getJSON().content.map((node) => {
        const pmNode = editor.schema.nodeFromJSON(node)

        return pmNode.textContent ? `${node.type}:${pmNode.textContent}` : node.type
    })

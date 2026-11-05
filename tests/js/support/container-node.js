import { Node } from '@tiptap/core'
import { registerExtension } from '../../../resources/js/registry'
import { defaultPluginIds } from './make-editor'

/**
 * A plugin's own container, like a callout box: any node in the `container` group should get the block tools a quote
 * gets. It has an attribute so tests can check it carries over when the container nests.
 */
registerExtension('test/note', () =>
    Node.create({
        name: 'note',
        group: 'block container',
        content: 'block+',
        defining: true,
        addAttributes: () => ({ tone: { default: 'info' } }),
        parseHTML: () => [{ tag: 'aside' }],
        renderHTML: ({ HTMLAttributes }) => ['aside', HTMLAttributes, 0],
    }),
)

export const pluginIdsWithNote = [...defaultPluginIds, 'test/note']

export const note = (tone, ...content) => ({ type: 'note', attrs: { tone }, content })

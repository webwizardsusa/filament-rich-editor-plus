import { Node } from '@tiptap/core'

export const mentionKey = (char, id) => `${char}\u0000${id}`

export const formatMention = (format, label) => format.replace(':label', () => label)

const dataAttribute = (name) => ({
    default: null,
    parseHTML: (element) => element.getAttribute(`data-${name}`),
    renderHTML: (attributes) => (attributes[name] ? { [`data-${name}`]: attributes[name] } : {}),
})

/**
 * Replaces the typed trigger and query with a token and a space, in one undo step.
 */
export function insertMention(editor, range, { id, label }, trigger) {
    return editor
        .chain()
        .focus()
        .insertContentAt(range, [
            { type: 'mention', attrs: { id, label, char: trigger } },
            { type: 'text', text: ' ' },
        ])
        .run()
}

/**
 * An inline token. It shows a live label from `storage.labels` when there is one, and the stored `label` otherwise.
 * Live labels stay out of the document on purpose: writing them in would mark every opened document as changed.
 */
export function createMentionNode(providers) {
    const formatFor = (char) => providers.find(({ trigger }) => trigger === char)?.displayFormat ?? `${char}:label`

    return Node.create({
        name: 'mention',

        group: 'inline',

        inline: true,

        atom: true,

        selectable: true,

        addOptions() {
            return { providers }
        },

        addStorage() {
            return { labels: new Map() }
        },

        addAttributes() {
            return {
                id: dataAttribute('id'),
                label: dataAttribute('label'),
                char: dataAttribute('char'),
            }
        },

        parseHTML() {
            // The priority beats the link mark's `a[href]` rule, which would turn a rendered mention into a plain link.
            return [{ tag: 'span[data-type="mention"]' }, { tag: 'a[data-type="mention"]', priority: 51 }]
        },

        renderHTML({ node, HTMLAttributes }) {
            return [
                'span',
                { ...HTMLAttributes, 'data-type': 'mention', class: 'rep-mention' },
                formatMention(formatFor(node.attrs.char), node.attrs.label ?? ''),
            ]
        },

        renderText({ node }) {
            return formatMention(formatFor(node.attrs.char), node.attrs.label ?? '')
        },

        addKeyboardShortcuts() {
            return {
                Backspace: () => {
                    const { empty, $from, from } = this.editor.state.selection
                    const before = $from.nodeBefore

                    if (!empty || before?.type.name !== this.name) {
                        return false
                    }

                    return this.editor.commands.deleteRange({ from: from - before.nodeSize, to: from })
                },
            }
        },

        addNodeView() {
            const { storage } = this

            return ({ node }) => {
                const dom = document.createElement('span')

                const draw = (current) => {
                    const { id, char, label } = current.attrs

                    dom.dataset.repMentionKey = mentionKey(char, id)
                    dom.dataset.repMentionFormat = formatFor(char)
                    dom.textContent = formatMention(
                        formatFor(char),
                        storage.labels.get(mentionKey(char, id)) ?? label ?? '',
                    )
                }

                dom.className = 'rep-mention'
                draw(node)

                return {
                    dom,

                    update(updated) {
                        if (updated.type !== node.type) {
                            return false
                        }

                        draw(updated)

                        return true
                    },

                    ignoreMutation: () => true,
                }
            }
        },
    })
}

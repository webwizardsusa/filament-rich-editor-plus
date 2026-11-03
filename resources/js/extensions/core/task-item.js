import { mergeAttributes } from '@tiptap/core'
import { TaskItem } from '@tiptap/extension-list'

/**
 * TipTap's task item, with the checkbox disabled in the HTML it writes, to match the PHP renderer. The editor draws its
 * own checkbox in a node view, so it can still be ticked while editing.
 */
export const ReadOnlyHtmlTaskItem = TaskItem.extend({
    renderHTML({ node, HTMLAttributes }) {
        return [
            'li',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': this.name }),
            [
                'label',
                ['input', { type: 'checkbox', checked: node.attrs.checked ? 'checked' : null, disabled: 'disabled' }],
                ['span'],
            ],
            ['div', 0],
        ]
    },
})

import { Mark } from '@tiptap/core'

const isEmpty = (mark) => Object.values(mark.attrs).every((value) => value === null || value === undefined)

/**
 * The `textStyle` span that colour and type plugins put their attributes on (PHP: `HasTextStyleMark`). A span counts only
 * with a class or style, and never a mention's span. Its attributes all come from global attributes.
 */
export const TextStyle = Mark.create({
    name: 'textStyle',

    priority: 101,

    parseHTML() {
        return [
            {
                tag: 'span',
                consuming: false,
                getAttrs: (element) =>
                    !element.hasAttribute('data-type') && (element.hasAttribute('class') || element.hasAttribute('style'))
                        ? {}
                        : false,
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', HTMLAttributes, 0]
    },

    addCommands() {
        return {
            /**
             * Removes `textStyle` marks with no attribute left from the selection, and from the marks stored for typing.
             */
            removeEmptyTextStyle:
                () =>
                ({ tr }) => {
                    const { from, to } = tr.selection

                    tr.doc.nodesBetween(from, to, (node, pos) => {
                        if (!node.isText) {
                            return true
                        }

                        if (node.marks.some((mark) => mark.type === this.type && isEmpty(mark))) {
                            tr.removeMark(Math.max(pos, from), Math.min(pos + node.nodeSize, to), this.type)
                        }

                        return false
                    })

                    const stored = tr.storedMarks

                    if (stored?.some((mark) => mark.type === this.type && isEmpty(mark))) {
                        tr.removeStoredMark(this.type)
                    }

                    return true
                },
        }
    },
})

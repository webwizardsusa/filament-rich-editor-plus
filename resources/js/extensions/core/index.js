import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import { BulletList, ListItem, ListKeymap, OrderedList, TaskList } from '@tiptap/extension-list'
import { globalAttributesExtension } from './global-attributes'
import { paletteStyleExtension } from './palette-style'
import { textAlignExtension } from './text-align'
import { TextStyle } from './text-style'
import { ReadOnlyHtmlTaskItem } from './task-item'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Text from '@tiptap/extension-text'
import Underline from '@tiptap/extension-underline'
import { Dropcursor, Gapcursor, TrailingNode, UndoRedo } from '@tiptap/extensions'
import { BlockCommands } from '../../blocks/block-commands'
import { FindReplace } from '../../find-replace/plugin'
import { createMentionNode } from '../../mentions/mention-node'
import { registerActionArguments, registerExtension } from '../../registry'

registerExtension('core/document', () => [Document, Paragraph, Text, HardBreak, UndoRedo, Dropcursor, Gapcursor, BlockCommands])
registerExtension('core/global-attributes', (options) => globalAttributesExtension(options))
registerExtension('core/text-align', (options) => textAlignExtension(options))

registerExtension('core/text-color', ({ colors }) => [
    TextStyle,
    paletteStyleExtension({ name: 'textColorCommands', attribute: 'color', setCommand: 'setTextColor', unsetCommand: 'unsetTextColor', values: colors }),
])
registerExtension('core/background-color', ({ colors }) => [
    TextStyle,
    paletteStyleExtension({ name: 'backgroundColorCommands', attribute: 'backgroundColor', setCommand: 'setBackgroundColor', unsetCommand: 'unsetBackgroundColor', values: colors }),
])
registerExtension('core/font-family', ({ values }) => [
    TextStyle,
    paletteStyleExtension({ name: 'fontFamilyCommands', attribute: 'fontFamily', setCommand: 'setFontFamily', unsetCommand: 'unsetFontFamily', values }),
])
registerExtension('core/font-size', ({ values }) => [
    TextStyle,
    paletteStyleExtension({ name: 'fontSizeCommands', attribute: 'fontSize', setCommand: 'setFontSize', unsetCommand: 'unsetFontSize', values }),
])
registerExtension('core/line-height', ({ values }) => [
    TextStyle,
    paletteStyleExtension({ name: 'lineHeightCommands', attribute: 'lineHeight', setCommand: 'setLineHeight', unsetCommand: 'unsetLineHeight', values }),
])

registerExtension('core/bold', () => Bold)
registerExtension('core/italic', () => Italic)
registerExtension('core/underline', () => Underline)
registerExtension('core/strikethrough', () => Strike)
registerExtension('core/code', () => Code)
// Set here as well as in PHP, so the editor and the server agree whichever TipTap version is installed.
/**
 * TipTap's shortcut returns the result of `setMark`, which is false when the mark is swapped for the excluded one, so the
 * browser would also handle the key. Chaining the removal first makes the swap report success and claim the key.
 */
registerExtension('core/subscript', () =>
    Subscript.extend({
        excludes: 'superscript',

        addKeyboardShortcuts() {
            return {
                'Mod-,': () => this.editor.chain().unsetSuperscript().toggleSubscript().run(),
            }
        },
    }),
)
registerExtension('core/superscript', () =>
    Superscript.extend({
        excludes: 'subscript',

        addKeyboardShortcuts() {
            return {
                'Mod-.': () => this.editor.chain().unsetSubscript().toggleSuperscript().run(),
            }
        },
    }),
)
registerExtension('core/blockquote', () => Blockquote)
registerExtension('core/heading', ({ levels }) => Heading.configure({ levels }))
registerExtension('core/bullet-list', () => [BulletList, ListItem, ListKeymap])
registerExtension('core/ordered-list', () => [OrderedList, ListItem, ListKeymap])
registerExtension('core/task-list', () => [TaskList, ReadOnlyHtmlTaskItem.configure({ nested: true }), ListKeymap])
registerExtension('core/trailing-node', () => TrailingNode.configure({ node: 'paragraph' }))
registerExtension('core/code-block', () => CodeBlock)
registerExtension('core/divider', () => HorizontalRule)
registerExtension('core/mention', ({ providers }) => createMentionNode(providers ?? []))
registerExtension('core/find-replace', () => FindReplace)

registerExtension('core/link', ({ protocols, defaultProtocol, autolink, HTMLAttributes }) =>
    Link.configure({
        protocols,
        defaultProtocol,
        autolink,
        HTMLAttributes,
        openOnClick: false,
    }),
)

registerActionArguments('link', (editor) => {
    const { href, target } = editor.getAttributes('link')

    return { url: href ?? null, ...(href ? { shouldOpenInNewTab: target === '_blank' } : {}) }
})

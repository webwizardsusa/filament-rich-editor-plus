import '../../../css/plugins/image.css'
import '../../../css/plugins/attachment.css'
import { NodeSelection } from '@tiptap/pm/state'
import { attachmentExtension } from './attachment'
import { fileUploadsExtension } from './file-uploads'
import { imageExtension } from './image'

// Loaded by Rich Editor Plus before it builds the editor (see ImagePlugin::getJsExtension() and
// AttachmentPlugin::getJsExtension()). The `@tiptap/*` imports resolve to the editor's own TipTap and ProseMirror
// through the `sharedTiptap()` Vite plugin.
export default function ({ registerExtension, registerActionArguments }) {
    // Both plugins add the same paste-and-drop extension; the editor keeps one, which routes to every plugin present.
    registerExtension('webwizardsusa/image', (options, tiptap, context) => [imageExtension(options, context), fileUploadsExtension(options, context)])
    registerExtension('webwizardsusa/attachment', (options, tiptap, context) => [attachmentExtension(options, context), fileUploadsExtension(options, context)])

    // Each modal edits the selected node of its type, and inserts a new one otherwise.
    const selected = (name) => (editor) => {
        const { selection } = editor.state

        if (!(selection instanceof NodeSelection) || selection.node.type.name !== name) {
            return {}
        }

        return { editing: true, ...selection.node.attrs }
    }

    registerActionArguments('image', selected('image'))
    registerActionArguments('attachment', selected('attachment'))
}

if (import.meta.hot) {
    import.meta.hot.accept(() => window.location.reload())
}

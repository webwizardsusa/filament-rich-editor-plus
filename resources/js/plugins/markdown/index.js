import '../../../css/plugins/markdown.css'
import { markdownPasteExtension } from './paste'
import { markdownSourceExtension } from './source'

// Loaded by Rich Editor Plus before it builds the editor (see MarkdownPlugin::getJsExtension()).
export default function ({ registerExtension }) {
    registerExtension('hollyit/markdown', (options, tiptap, context) => [
        ...(options.paste ? [markdownPasteExtension(options, context)] : []),
        ...(options.source ? [markdownSourceExtension(options, context)] : []),
    ])
}

if (import.meta.hot) {
    import.meta.hot.accept(() => window.location.reload())
}

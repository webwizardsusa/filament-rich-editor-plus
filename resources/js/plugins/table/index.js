import '../../../css/plugins/table.css'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

// Loaded by Rich Editor Plus before it builds the editor (see TablePlugin::getJsExtension()). The `@tiptap/*`
// imports resolve to the editor's own TipTap and ProseMirror through the `sharedTiptap()` Vite plugin.
export default function ({ registerExtension }) {
    registerExtension('webwizardsusa/table', ({ resizable }) => [
        Table.configure({ resizable: resizable ?? true }),
        TableRow,
        TableHeader,
        TableCell,
    ])
}

if (import.meta.hot) {
    import.meta.hot.accept(() => window.location.reload())
}

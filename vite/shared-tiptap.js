/**
 * A Vite plugin for packages that ship JS for Rich Editor Plus (see `JsExtension::module()`).
 *
 * The editor exposes its TipTap and ProseMirror modules on `window.RichEditorPlus.tiptap`. A plugin's own bundle
 * must use those instances instead of bundling a second copy: ProseMirror relies on `instanceof` checks and
 * plugin keys, so two copies of `prosemirror-state` break in subtle ways. This plugin rewrites imports of the
 * shared modules, by any name they are imported under, to read from that object.
 *
 *     import { sharedTiptap } from '../rich-editor-plus/vite/shared-tiptap.js'
 *
 *     export default defineConfig({ plugins: [sharedTiptap()] })
 *
 * In `vite` dev mode, keep the packages that import TipTap out of dependency pre-bundling (see the table
 * package's vite.config.js), because pre-bundling inlines its own copy of the shared modules.
 *
 * `prosemirror-tables` is shared too: it registers the `cell` selection type once, so a second copy throws
 * "Duplicate use of selection JSON ID cell".
 */
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

const shared = {
    '@tiptap/core': 'core',
    '@tiptap/pm/state': 'pmState',
    'prosemirror-state': 'pmState',
    '@tiptap/pm/view': 'pmView',
    'prosemirror-view': 'pmView',
    '@tiptap/pm/model': 'pmModel',
    'prosemirror-model': 'pmModel',
    '@tiptap/pm/transform': 'pmTransform',
    'prosemirror-transform': 'pmTransform',
    '@tiptap/pm/commands': 'pmCommands',
    'prosemirror-commands': 'pmCommands',
    '@tiptap/pm/keymap': 'pmKeymap',
    'prosemirror-keymap': 'pmKeymap',
    '@tiptap/pm/tables': 'pmTables',
    'prosemirror-tables': 'pmTables',
}

const prefix = '\0rich-editor-plus-shared:'

export const sharedModules = Object.keys(shared)

export function sharedTiptap() {
    const importers = new Map()

    return {
        name: 'rich-editor-plus:shared-tiptap',

        enforce: 'pre',

        resolveId(id, importer) {
            if (!(id in shared)) {
                return null
            }

            if (importer && !importers.has(id)) {
                importers.set(id, importer)
            }

            return prefix + id
        },

        async load(id) {
            if (!id.startsWith(prefix)) {
                return null
            }

            const specifier = id.slice(prefix.length)

            // Static ESM needs the export names up front, so read them from the real module, found the same way
            // the importing file would find it.
            const resolved = await this.resolve(specifier, importers.get(specifier), { skipSelf: true })

            // In dev, Vite tags resolved dependencies with a version query (`index.js?v=abc123`).
            const file = resolved?.id.split('?')[0]
            const target = file && isAbsolute(file) ? pathToFileURL(file).href : specifier

            const names = Object.keys(await import(target)).filter(
                (name) => name !== 'default' && /^[A-Za-z_$][\w$]*$/.test(name),
            )

            return [
                `const shared = window.RichEditorPlus.tiptap.${shared[specifier]}`,
                ...names.map((name) => `export const ${name} = shared.${name}`),
                'export default shared',
            ].join('\n')
        },
    }
}

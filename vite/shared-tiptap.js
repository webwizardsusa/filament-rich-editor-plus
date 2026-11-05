/**
 * A Vite plugin for packages that ship JS for Rich Editor Plus (see `JsExtension::module()`).
 *
 * The editor exposes its TipTap and ProseMirror modules on `window.RichEditorPlus.tiptap` (see
 * `resources/js/shared-modules.js`). A plugin's own bundle must use those instances instead of bundling a second
 * copy: ProseMirror relies on `instanceof` checks and plugin keys, so two copies of `prosemirror-state` break in
 * subtle ways, and the copy would add hundreds of KB. This plugin rewrites imports of the shared modules, by any name
 * they are imported under, to read from that object. In an app that installed the package with Composer:
 *
 *     import { sharedTiptap } from './vendor/webwizardsusa/rich-editor-plus/vite/shared-tiptap.js'
 *
 *     export default defineConfig({ plugins: [sharedTiptap({ exclude: ['@tiptap/extension-table'] })] })
 *
 * `exclude` lists the packages your plugin imports that themselves import TipTap. They are kept out of `vite` dev
 * mode's dependency pre-bundling, which would otherwise inline its own copy of the shared modules.
 *
 * The build reads each shared module's export names from your own `@tiptap/core` and `@tiptap/pm` (install them as
 * dev dependencies, same major version as the editor). They are never bundled.
 *
 * `prosemirror-tables` is shared too: it registers the `cell` selection type once, so a second copy throws
 * "Duplicate use of selection JSON ID cell".
 */
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Import specifier => key of the module on `window.RichEditorPlus.tiptap`.
 */
export const sharedSpecifiers = {
    '@tiptap/core': 'core',
    '@tiptap/suggestion': 'suggestion',
    ...pm('state', 'pmState'),
    ...pm('view', 'pmView'),
    ...pm('model', 'pmModel'),
    ...pm('transform', 'pmTransform'),
    ...pm('commands', 'pmCommands'),
    ...pm('keymap', 'pmKeymap'),
    ...pm('tables', 'pmTables'),
    ...pm('inputrules', 'pmInputrules'),
    ...pm('history', 'pmHistory'),
    ...pm('dropcursor', 'pmDropcursor'),
    ...pm('gapcursor', 'pmGapcursor'),
    ...pm('schema-list', 'pmSchemaList'),
}

export const sharedModules = Object.keys(sharedSpecifiers)

const prefix = '\0rich-editor-plus-shared:'

/**
 * A ProseMirror module is imported as `@tiptap/pm/<name>` or, by ProseMirror packages, as `prosemirror-<name>`.
 */
function pm(name, key) {
    return { [`@tiptap/pm/${name}`]: key, [`prosemirror-${name}`]: key }
}

/**
 * @param {{ exclude?: string[] }} [options]
 */
export function sharedTiptap({ exclude = [] } = {}) {
    const importers = new Map()

    return {
        name: 'rich-editor-plus:shared-tiptap',

        enforce: 'pre',

        config() {
            return { optimizeDeps: { exclude: [...sharedModules, ...exclude] } }
        },

        resolveId(id, importer) {
            if (!(id in sharedSpecifiers)) {
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

            return sharedModuleCode(specifier, names)
        },
    }
}

/**
 * The browser module that stands in for a shared import. It fails loudly when the editor hasn't shared the module,
 * and warns (once, listing them) about exports the editor's copy lacks, which means the plugin was built against a
 * newer TipTap. Each export is read through a pure call, so a build drops the exports, and the checks, of every name
 * the plugin doesn't use: only names it really uses are checked.
 *
 * @param {string} specifier
 * @param {string[]} names
 */
function sharedModuleCode(specifier, names) {
    const key = JSON.stringify(sharedSpecifiers[specifier])
    const label = JSON.stringify(specifier)

    return [
        'const tiptap = globalThis.RichEditorPlus?.tiptap',
        'if (!tiptap) {',
        `    throw new Error('[rich-editor-plus] ' + ${label} + ' is shared by Rich Editor Plus, but the editor has not loaded. Load plugin JS through JsExtension::module(), which runs after the editor.')`,
        '}',
        `const shared = tiptap[${key}]`,
        'if (!shared) {',
        `    throw new Error('[rich-editor-plus] This version of Rich Editor Plus does not share ' + ${label} + '. Update the editor, or bundle a module that does not depend on it.')`,
        '}',
        'const missing = []',
        'function pick(name) {',
        '    if (!(name in shared)) {',
        '        if (missing.push(name) === 1) {',
        `            queueMicrotask(() => console.warn('[rich-editor-plus] ' + ${label} + ' was built against a newer TipTap than the editor shares. Missing: ' + missing.join(', ')))`,
        '        }',
        '    }',
        '    return shared[name]',
        '}',
        ...names.map((name) => `export const ${name} = /* @__PURE__ */ pick(${JSON.stringify(name)})`),
        'export default shared',
    ].join('\n')
}

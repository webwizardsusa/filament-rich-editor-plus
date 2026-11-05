import { defineConfig } from 'vite'
import fs from 'node:fs'
import laravel from 'laravel-vite-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sharedTiptap } from './vite/shared-tiptap.js'

const packageRoot = path.dirname(fileURLToPath(import.meta.url))

/**
 * The plugins that ship in this package but load only on fields that use them (`BundledPluginAssets`). Each is its
 * own module, picked with `--mode`: `vite build --config vite.modules.config.js --mode table`.
 *
 * `exclude` lists the dependencies that import TipTap themselves, kept out of dev pre-bundling (see shared-tiptap.js).
 */
const modules = {
    table: { port: 5176, exclude: ['@tiptap/extension-table'] },
    image: { port: 5177, exclude: [] },
    markdown: { port: 5178, exclude: [] },
}

const reloadOnChange = ['resources/views/**', 'src/**/*.php']
    .filter((pattern) => fs.existsSync(path.join(packageRoot, pattern.split('*')[0])))
    .map((pattern) => path.join(packageRoot, pattern))

/**
 * Same two modes as `vite.config.js`: `vite` serves the module to the host app with HMR for the CSS, and `vite build`
 * writes the self-contained module and stylesheet into dist/ beside the editor's own, for `filament:assets` to
 * publish. Either way the TipTap and ProseMirror imports are rewritten to the editor's shared instances. Each module
 * is a build of its own, so no chunks are shared between them.
 */
export default defineConfig(({ command, mode }) => {
    const module = modules[mode]

    if (!module) {
        throw new Error(`Pick a module with --mode: ${Object.keys(modules).join(', ')}.`)
    }

    const id = `rich-editor-plus-${mode}`
    const entry = `resources/js/plugins/${mode}/index.js`

    if (command === 'serve') {
        const appRoot = path.resolve(packageRoot, '../..')

        return {
            root: appRoot,
            // Every dev server shares appRoot, so without its own cache dir each one wipes the others' pre-bundled
            // deps on startup and the browser gets 504 (Outdated Optimize Dep).
            cacheDir: path.join(appRoot, `node_modules/.vite/${id}`),
            plugins: [
                // Pre-bundling would inline a second copy of the shared modules, so the extension is served as-is.
                sharedTiptap({ exclude: module.exclude }),
                laravel({
                    input: [path.relative(appRoot, path.join(packageRoot, entry))],
                    hotFile: path.join(appRoot, `public/${id}.hot`),
                    refresh: reloadOnChange,
                }),
            ],
            server: {
                port: module.port,
                strictPort: true,
            },
        }
    }

    return {
        root: packageRoot,
        publicDir: false,
        plugins: [sharedTiptap()],
        build: {
            // Vite only mangles ES library builds, keeping their whitespace for downstream bundlers. The browser loads
            // this file as is, so minify it fully.
            minify: true,
            rolldownOptions: {
                output: { minify: true },
            },
            outDir: 'dist',
            // The editor's own build empties dist/ first; the modules are written after it.
            emptyOutDir: false,
            cssCodeSplit: false,
            lib: {
                entry: path.resolve(packageRoot, entry),
                formats: ['es'],
                fileName: () => `${id}.js`,
                cssFileName: id,
            },
        },
    }
})

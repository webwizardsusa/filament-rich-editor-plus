import { defineConfig } from 'vite'
import fs from 'node:fs'
import laravel from 'laravel-vite-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.dirname(fileURLToPath(import.meta.url))
// Full-reload the page when these change. Every pattern must be absolute and name a directory that exists:
// watching a path that does not exist (the package may have no `resources/views/` yet) stops Vite from noticing
// edits to any file, so the dev server silently keeps serving stale code.
const reloadOnChange = ['resources/views/**', 'src/**/*.php']
    .filter((pattern) => fs.existsSync(path.join(packageRoot, pattern.split('*')[0])))
    .map((pattern) => path.join(packageRoot, pattern))

const entry = 'packages/rich-editor-plus/resources/js/index.js'

/**
 * Two modes:
 *  - `vite` (serve): dev server for the host app. Writes public/rich-editor-plus.hot so the field's Blade view
 *    loads the Alpine component from Vite. The JS entry imports its CSS, so CSS gets true HMR.
 *  - `vite build`: self-contained ESM bundle into dist/, which Filament copies to public/js via `filament:assets`.
 */
export default defineConfig(({ command }) => {
    if (command === 'serve') {
        // npm workspaces run this from the package directory, and laravel-vite-plugin resolves `hotFile`
        // against the cwd, so every path that must land in the host app is absolute.
        const appRoot = path.resolve(packageRoot, '../..')

        return {
            root: appRoot,
            // Every dev server shares appRoot, so without its own cache dir each one wipes the others' pre-bundled
            // deps on startup and the browser gets 504 (Outdated Optimize Dep).
            cacheDir: path.join(appRoot, 'node_modules/.vite/rich-editor-plus'),
            plugins: [
                laravel({
                    input: [entry],
                    hotFile: path.join(appRoot, 'public/rich-editor-plus.hot'),
                    refresh: reloadOnChange,
                }),
            ],
            server: {
                port: 5174,
                strictPort: true,
            },
        }
    }

    return {
        root: packageRoot,
        publicDir: false,
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            cssCodeSplit: false,
            lib: {
                entry: path.resolve(packageRoot, 'resources/js/index.js'),
                formats: ['es'],
                fileName: () => 'rich-editor-plus.js',
                cssFileName: 'rich-editor-plus',
            },
        },
    }
})

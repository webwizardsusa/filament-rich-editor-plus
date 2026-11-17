---
title: The JavaScript module
weight: 70
description: Register TipTap extensions from your package's ES module, use the editor's context, and build without a second copy of TipTap.
---

A plugin that adds editor behaviour ships an ES module. The editor imports it before it builds the editor, and calls
its default export with the editor's API.

## The module

```js
import { Mark } from '@tiptap/core'

export default function ({ registerExtension, extendExtension, registerActionArguments, tiptap }) {
    registerExtension('acme/keyboard', ({ shortcut }) =>
        Mark.create({
            name: 'keyboard',
            inclusive: false,
            excludes: 'code',

            parseHTML() {
                return [{ tag: 'kbd' }]
            },

            renderHTML({ HTMLAttributes }) {
                return ['kbd', HTMLAttributes, 0]
            },

            addCommands() {
                return {
                    toggleKeyboard: () => ({ commands }) => commands.toggleMark(this.name),
                }
            },

            addKeyboardShortcuts() {
                return shortcut ? { [shortcut]: () => this.editor.commands.toggleKeyboard() } : {}
            },
        }),
    )
}
```

The default export gets one object:

| Key | Does |
|---|---|
| `registerExtension(id, factory)` | Registers the factory for a `JsExtension` id. |
| `extendExtension(id, decorator)` | Changes the extensions another plugin's factory produces. See [extending existing plugins](extending-plugins.md#changing-another-plugins-js). |
| `registerActionArguments(action, resolver)` | Reads the editor's state into a Filament action's arguments. See [actions](actions.md#arguments-from-the-editor). |
| `tiptap` | The editor's shared TipTap and ProseMirror modules. See [shared modules](#shared-modules). |

The same object is also on `window.RichEditorPlus`.

Each module URL is imported once per page, however many editors use it, and before any editor that needs it is
built. A module that fails to load is logged to the console, and the editors that need its extensions show an error
instead of starting.

### The factory

```js
registerExtension('acme/callout', (options, tiptap, context) => createCallout(options, context))
```

A factory is called once per editor, with:

1. **`options`**: the options the PHP plugin passed to `JsExtension::make($id, $options)`, as a plain object.
2. **`tiptap`**: the [shared modules](#shared-modules).
3. **`context`**: the [editor context](#the-editor-context), for talking to the server.

It returns one TipTap extension (a `Node`, `Mark` or `Extension`) or an array of them. Extensions with the same name
are used once, so two plugins can both return a shared extension such as `listItem`.

Use the options for everything PHP decides: allowed values, labels (already translated), shortcuts. That keeps the
editor and the server in step, because both read the same plugin settings.

The extension must match what the PHP plugin [declares](schema.md): the same node or mark names, tags, attributes,
and the commands the plugin's tools and block types run.

### The editor context

| Function | Does |
|---|---|
| `callPlugin(pluginId, request, payload = {})` | Sends a request to a plugin on the field, and resolves with the array its `answerEditorRequest()` returns. See [server requests](server-requests-and-uploads.md). |
| `upload(file, { onProgress })` | Uploads a `File` to the field's Livewire temporary uploads, and resolves with the key a plugin takes it by. `onProgress` gets a percentage. |
| `processing(promise, message)` | Keeps the form from saving until the promise settles, and resolves or rejects as it does. The optional message is what the form shows while it waits; it defaults to the uploading message. Calls may nest. |
| `runAction(action)` | Opens a Filament action on the field with its registered arguments, as a toolbar tool does. |

`upload()` holds the form only while the file uploads. Wrap the whole job (upload, the request that stores it, and
inserting the result) in `processing()`, so the form can't save before the file is in the document. See
[taking uploads](server-requests-and-uploads.md#taking-uploads).

### Hot reload

The editor imports a module once, so a changed module only takes effect on a fresh page. End your entry with:

```js
if (import.meta.hot) {
    import.meta.hot.accept(() => window.location.reload())
}
```

## Shared modules

> [!CAUTION]
> Never bundle `@tiptap/core` or `@tiptap/pm`. The editor already ships them, and ProseMirror breaks in subtle ways
> when two copies run on one page: it relies on `instanceof` checks and plugin keys, and a second copy of
> `prosemirror-tables` throws "Duplicate use of selection JSON ID cell".

The editor shares its copies on `window.RichEditorPlus.tiptap`, and on the `tiptap` argument:

| Import | Shared as |
|---|---|
| `@tiptap/core` | `tiptap.core` |
| `@tiptap/suggestion` | `tiptap.suggestion` |
| `@tiptap/pm/state`, `prosemirror-state` | `tiptap.pmState` |
| `@tiptap/pm/view`, `prosemirror-view` | `tiptap.pmView` |
| `@tiptap/pm/model`, `prosemirror-model` | `tiptap.pmModel` |
| `@tiptap/pm/transform`, `prosemirror-transform` | `tiptap.pmTransform` |
| `@tiptap/pm/commands`, `prosemirror-commands` | `tiptap.pmCommands` |
| `@tiptap/pm/keymap`, `prosemirror-keymap` | `tiptap.pmKeymap` |
| `@tiptap/pm/tables`, `prosemirror-tables` | `tiptap.pmTables` |
| `@tiptap/pm/inputrules`, `prosemirror-inputrules` | `tiptap.pmInputrules` |
| `@tiptap/pm/history`, `prosemirror-history` | `tiptap.pmHistory` |
| `@tiptap/pm/dropcursor`, `prosemirror-dropcursor` | `tiptap.pmDropcursor` |
| `@tiptap/pm/gapcursor`, `prosemirror-gapcursor` | `tiptap.pmGapcursor` |
| `@tiptap/pm/schema-list`, `prosemirror-schema-list` | `tiptap.pmSchemaList` |

The editor runs TipTap 3.

## Building the module

The package ships a Vite plugin, `sharedTiptap()`, in `vite/shared-tiptap.js`. It rewrites your imports of the shared
modules, under either name, to read from `window.RichEditorPlus.tiptap`, so your code imports TipTap as usual and the
bundle holds only your own code.

Install Vite and TipTap as dev dependencies. TipTap is only read for its export names; it is never bundled:

```bash
npm i -D vite laravel-vite-plugin @tiptap/core@^3 @tiptap/pm@^3
```

Import the plugin from the copy Composer installed. The path depends on where that `vendor/` is relative to your
`vite.config.js`:

| Your package | Import from |
|---|---|
| Installed on its own, with its own `vendor/` (for example to run its tests) | `./vendor/webwizardsusa/filament-rich-editor-plus/vite/shared-tiptap.js` |
| Developed inside an app at `packages/your-package`, using the app's `vendor/` | `../../vendor/webwizardsusa/filament-rich-editor-plus/vite/shared-tiptap.js` |

A `vite.config.js` that builds the module for release and serves it with hot reload in development, as the
[example plugin](docs:rich-editor-plus-example/introduction) does:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sharedTiptap } from '../../vendor/webwizardsusa/filament-rich-editor-plus/vite/shared-tiptap.js'

const packageRoot = path.dirname(fileURLToPath(import.meta.url))

// Must match the service provider's assetId().
const assetId = 'acme-callout'

const entry = 'resources/js/index.js'

export default defineConfig(({ command }) => {
    if (command === 'serve') {
        // The host app: this package sits in its packages/ directory.
        const appRoot = path.resolve(packageRoot, '../..')

        return {
            root: appRoot,
            // Each dev server in the app needs a cache dir of its own.
            cacheDir: path.join(appRoot, `node_modules/.vite/${assetId}`),
            plugins: [
                // List packages you import that import TipTap themselves, such as `@tiptap/extension-*`.
                sharedTiptap({ exclude: [] }),
                laravel({
                    // Relative to the app root, as RegistersPluginAssets::devServerEntry() expects.
                    input: [path.relative(appRoot, path.join(packageRoot, entry))],
                    hotFile: path.join(appRoot, `public/${assetId}.hot`),
                    refresh: [path.join(packageRoot, 'src/**/*.php')],
                }),
            ],
            server: { port: 5179, strictPort: true },
        }
    }

    return {
        root: packageRoot,
        publicDir: false,
        plugins: [sharedTiptap()],
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            cssCodeSplit: false,
            lib: {
                entry: path.resolve(packageRoot, entry),
                formats: ['es'],
                fileName: () => `${assetId}.js`,
                cssFileName: assetId,
            },
        },
    }
})
```

- `npm run build` (`vite build`) writes `dist/acme-callout.js` and, if your entry imports CSS, `dist/acme-callout.css`.
  Name both after your `assetId()` so [`RegistersPluginAssets`](assets.md) finds them.
- `npm run dev` (`vite`) serves the entry to the host app and writes `public/acme-callout.hot`, which tells the field
  to load the module from the dev server. Give each package's dev server its own port.
- `exclude` lists packages your module imports that import TipTap themselves, such as `@tiptap/extension-table`, so dev
  mode's dependency pre-bundling doesn't inline a copy of TipTap into them. In a build, their TipTap imports are
  rewritten too, so only their own code is added.

To check a build, look at its size (the core table plugin's bundle is about 18 KB, against about 650 KB for the
editor), and search it for `Duplicate use of selection JSON ID`, which only appears in a bundled copy of ProseMirror.
If your build uses an export the editor's TipTap doesn't have, the browser console warns with the missing names.

## Without a build step

A small plugin can skip Vite and read the shared modules from the `tiptap` argument:

```js
export default function ({ registerExtension, tiptap }) {
    const { Mark } = tiptap.core

    registerExtension('acme/highlight', () =>
        Mark.create({
            name: 'highlight',
            parseHTML: () => [{ tag: 'mark' }],
            renderHTML: ({ HTMLAttributes }) => ['mark', HTMLAttributes, 0],
        }),
    )
}
```

Save it as `dist/{assetId}.js`, and `RegistersPluginAssets` registers it like a built file. It can't import packages
from npm, so anything beyond the shared modules needs the Vite setup above.

## Plugins with nothing to add in the browser

Every plugin returns a `JsExtension`, and the editor refuses to start when its id has no registered factory. A plugin
with nothing to add in the browser, such as one that only declares a [global attribute](global-attributes.md) or only
opens a Filament action, still registers its id, with a factory that returns no extensions:

```js
// dist/acme-indent.js
export default function ({ registerExtension }) {
    registerExtension('acme/indent', () => [])
}
```

The core HTML source plugin works this way: its JS id is registered with an empty factory.

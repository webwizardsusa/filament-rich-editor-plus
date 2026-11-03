# Rich Editor Plus

## Storing content

The field stores **HTML** by default. Use a text column (`text` or `longText`) for it:

```php
$table->longText('body')->nullable();
```

To store the TipTap document instead, use a `json` column with an `array` cast and opt in:

```php
use Hollyit\RichEditorPlus\Support\StateFormat;

RichEditorPlus::make('body')->storeAs(StateFormat::Json);
```

Rows already stored as JSON keep working in an HTML field: they load, render, and are saved as HTML the next time
they are edited.

### Rendering

```php
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;

RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml();

RichContentPlusRenderer::many($posts->pluck('body', 'id'))->plugins($plugins)->toHtml();
```

Stored HTML is rendered by patching only what plugins fill in at render time, such as mention labels and links. The
rest is printed as stored, which makes rendering fast, but it means **stored HTML is trusted**:

- Only write the column through the field, or through `toStorableHtml()`, which removes anything unsafe:

  ```php
  $post->body = RichContentPlusRenderer::make($importedHtml)->plugins($plugins)->toStorableHtml();
  ```

- To render HTML that came from anywhere else, parse it instead:

  ```php
  RichContentPlusRenderer::make($untrustedHtml)->plugins($plugins)->parseHtml()->toHtml();
  ```

Documents stored as JSON are always rendered from the document.

### Caching

The package doesn't cache rendered HTML. To cache it yourself, key the cache on the record and when it last changed:

```php
use Illuminate\Support\Facades\Cache;

$html = Cache::remember(
    "posts.{$post->id}.body.{$post->updated_at->timestamp}",
    now()->addHour(),
    fn (): string => RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml(),
);
```

Mentions are looked up when the HTML is rendered, so a cached copy keeps a renamed user's old name until the entry
expires. Keep the lifetime as short as that staleness allows.

## Toolbar

Choose which formatting tools a field's toolbar shows, and in what order, by tool name. Each inner array is a group,
with a divider between groups:

```php
RichEditorPlus::make('body')->toolbarTools([
    ['bold', 'italic', 'underline'],
    ['link'],
]);
```

Tools you leave out are hidden, but their keyboard shortcuts still work. To drop a tool completely, remove its plugin
with `withoutPlugins()`. A flat list is treated as one group.

Hovering over a button, or focusing it from the keyboard, shows its name and shortcut. A plugin labels its own tool's
shortcut in TipTap's notation; `Mod` shows as ⌘ on a Mac and Ctrl elsewhere:

```php
Tool::make('highlight')->shortcut('Mod-Shift-h');
```

## Writing a plugin with JavaScript

A plugin that adds editor behaviour ships an ES module. The editor imports it before it builds the editor, and calls
its default export with the shared editor API.

### PHP side

Use the `RegistersPluginAssets` trait in your package's service provider. It registers your built module and
stylesheet with Filament so `filament:assets` publishes them, and `moduleUrl()` tells the editor where to load the
module from:

```php
use Hollyit\RichEditorPlus\Support\RegistersPluginAssets;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class HighlightServiceProvider extends PackageServiceProvider
{
    use RegistersPluginAssets;

    public function configurePackage(Package $package): void
    {
        $package->name('acme-highlight');
    }

    public function packageBooted(): void
    {
        $this->registerPluginAssets();
    }

    public static function assetPackage(): string
    {
        return 'acme/highlight';
    }

    public static function assetId(): string
    {
        return 'acme-highlight';
    }
}
```

```php
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;

class HighlightPlugin extends Plugin
{
    public function getId(): string
    {
        return 'acme/highlight';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), ['color' => 'yellow'])
            ->module(HighlightServiceProvider::moduleUrl());
    }
}
```

The trait expects the service provider in `src/` and, by default:

| | |
| --- | --- |
| Built files | `dist/{assetId}.js` and, if you ship one, `dist/{assetId}.css` |
| Dev server hot file | `public/{assetId}.hot` |
| Dev server entry | `resources/js/index.js` |

While the hot file exists in a local environment, `moduleUrl()` returns the dev server's entry and the panel loads
its HMR client; otherwise it returns the published asset. Override `assetsDistPath()`, `devServerEntry()` or
`assetsMissingMessage()` to change the defaults. See `RichEditorPlusTableServiceProvider` in
`hollyit/rich-editor-plus-table` for a complete example.

### JS side

```js
import { Mark } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export default function ({ registerExtension, extendExtension, registerActionArguments, tiptap }) {
    registerExtension('acme/highlight', ({ color }) =>
        Mark.create({
            name: 'highlight',
            parseHTML: () => [{ tag: 'mark' }],
            renderHTML: () => ['mark', { style: `background: ${color}` }, 0],
            addProseMirrorPlugins: () => [new Plugin({ key: new PluginKey('acme-highlight') })],
        }),
    )
}
```

`registerExtension()` takes the id your `JsExtension` uses and a factory that gets its options. To change one of the
editor's own extensions, decorate it with `extendExtension()` instead of importing it again.

### Bundling without a second copy of TipTap

Never bundle `@tiptap/core` or `@tiptap/pm`. The editor already ships them, and ProseMirror breaks in subtle ways when
two copies run on one page. The editor shares its copies on `window.RichEditorPlus.tiptap`, and the `sharedTiptap()`
Vite plugin rewrites your imports to read from there, so your code imports TipTap as usual:

```bash
npm i -D vite @tiptap/core@^3 @tiptap/pm@^3
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import { sharedTiptap } from './vendor/hollyit/rich-editor-plus/vite/shared-tiptap.js'

export default defineConfig({
    // List packages you import that import TipTap themselves (such as `@tiptap/extension-*`), so dev mode doesn't
    // pre-bundle a copy of TipTap into them.
    plugins: [sharedTiptap({ exclude: [] })],
    build: {
        outDir: 'dist',
        cssCodeSplit: false,
        lib: {
            entry: 'resources/js/index.js',
            formats: ['es'],
            fileName: () => 'acme-highlight.js',
            cssFileName: 'acme-highlight',
        },
    },
})
```

Name the output files after your `assetId()` so `RegistersPluginAssets` finds them.

For hot reloading, run a second config with `vite` that serves the entry to the host app and writes the hot file the
trait looks for. Set `root` to the app root, give the entry relative to it, and name the hot file after your
`assetId()`:

```js
// vite.dev.config.js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import { sharedTiptap } from './vendor/hollyit/rich-editor-plus/vite/shared-tiptap.js'

const appRoot = '../..' // the host app, relative to your package

export default defineConfig({
    root: appRoot,
    plugins: [
        sharedTiptap({ exclude: [] }),
        laravel({
            input: ['packages/acme-highlight/resources/js/index.js'],
            hotFile: `${appRoot}/public/acme-highlight.hot`,
        }),
    ],
})
```

The entry must match `devServerEntry()`, which defaults to your package's `resources/js/index.js` relative to the app
root. The dev server is only used in a `local` environment. `vite.config.js` in `hollyit/rich-editor-plus-table`
shows both modes in one file.

The local `@tiptap/core` and `@tiptap/pm` are only read for their export names; they are never bundled. Use the same
major version as the editor (3). If your build expects an export the editor's copy doesn't have, the browser console
warns with the missing names.

These imports are shared, under either name:

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

Anything else you import, such as an `@tiptap/extension-*` package, is bundled, but its own TipTap imports are
rewritten too, so only that package's code is added. The table plugin's bundle is about 18 KB, against about 650 KB
for the editor. To check a build, look at its size and search it for `Duplicate use of selection JSON ID`, which only
appears in a bundled copy of ProseMirror.

### Without a build step

A small plugin can skip Vite and read the shared modules from the `tiptap` argument:

```js
export default function ({ registerExtension, tiptap }) {
    const { Mark } = tiptap.core

    registerExtension('acme/highlight', () => Mark.create({ name: 'highlight' /* ... */ }))
}
```

Save it as `dist/{assetId}.js` and `RegistersPluginAssets` registers it like a built file. This can't import
packages from npm, so anything beyond the shared modules needs the Vite setup above.

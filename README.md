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

A field has a floating toolbar by default, above the selection in the active block. It can have a fixed toolbar
above the editor too, or instead:

```php
RichEditorPlus::make('body')->fixedToolbar();                          // both
RichEditorPlus::make('body')->fixedToolbar()->floatingToolbar(false);  // fixed only
RichEditorPlus::make('body')->floatingToolbar(false);                  // neither: slash menu and shortcuts only
```

The fixed toolbar stays in place. Tools that can't be used at the cursor are disabled rather than hidden, and its block
tools section shows the active block's own tools, such as the table tools while the cursor is in a table. It sticks to
the top of the screen while the editor scrolls past, below a Filament panel's topbar. Turn that off with
`->stickyFixedToolbar(false)`, or move it with the `--rep-fixed-toolbar-offset` CSS variable. Sticky has no effect
inside a container that scrolls on its own, such as a modal or slide-over.

### Arranging a toolbar

Choose what a toolbar shows, and in what order, by name. Each inner array is a group, with a divider between groups;
a flat list is one group. `toolbarTools()` arranges the floating toolbar and `fixedToolbarTools()` the fixed one, which
uses the floating arrangement when it has none of its own. To keep the fixed toolbar's default layout instead, for
example next to a formatting-only bubble, use `->fixedToolbarTools(inherit: false)`.

A list of tool names only arranges the formatting tools, and the controls stay where they are:

```php
RichEditorPlus::make('body')->toolbarTools([
    ['bold', 'italic', 'underline'],
    ['link'],
]);
```

Name a control, or the `blockTools` slot, and the list becomes the whole toolbar, so only what it names is shown:

| Name | What it is |
|---|---|
| `dragHandle` | Drag to move the block (floating toolbar only) |
| `blockSwitcher` | Change the block type |
| `moveUp`, `moveDown` | Move the block |
| `listOptions` | List type and level, inside a list |
| `blockTools` | The active block's own tools |
| `more` | The more menu |

For example, structure in the fixed toolbar, and formatting tools only in a small floating one:

```php
RichEditorPlus::make('body')
    ->fixedToolbar()
    ->fixedToolbarTools([['blockSwitcher'], ['listOptions', 'blockTools'], ['more']])
    ->toolbarTools([['bold', 'italic', 'link']], onlyListed: true);
```

A list becomes the whole toolbar when it names a control or `blockTools`, or when you pass `onlyListed: true` (to either
method). Without one of those, a list of tool names alone is an old-style list, and the toolbar keeps all its controls.
`onlyListed: true` is what makes a formatting-only floating toolbar possible. A fixed toolbar with no list of its own
inherits the floating flag along with the list. A toolbar whose list shows nothing is not rendered.

Tools you leave out are hidden, but their keyboard shortcuts still work. To drop a tool completely, remove its plugin
with `withoutPlugins()`. These names are reserved, so a plugin can't name a tool after one.

Hovering over a button, or focusing it from the keyboard, shows its name and shortcut. A plugin labels its own tool's
shortcut in TipTap's notation; `Mod` shows as ⌘ on a Mac and Ctrl elsewhere:

```php
Tool::make('highlight')->shortcut('Mod-Shift-h');
```

Alt+F10 moves focus into the floating toolbar, or into the fixed toolbar when there is no floating one.

## Optional plugins

These plugins ship with the package but aren't in the default set. Add them to a field, or to every field from a
service provider:

```php
use Hollyit\RichEditorPlus\Plugins\Core\CodePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\SubscriptPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\SuperscriptPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TrailingNodePlugin;

RichEditorPlus::make('body')->addPlugins([CodePlugin::make(), TaskListPlugin::make()]);

RichEditorPlus::registerDefaultPlugins([CodePlugin::class, TaskListPlugin::class]);
```

| Plugin | Adds |
|---|---|
| `CodePlugin` | Inline code (`Mod-e`). Code text can't have other marks. |
| `SubscriptPlugin`, `SuperscriptPlugin` | Subscript (`Mod-,`) and superscript (`Mod-.`), in the more menu. Each replaces the other. |
| `TaskListPlugin` | A checkbox list, in the list menu next to bulleted and numbered lists. Saved and rendered checkboxes are `disabled`; style them with `ul[data-type="taskList"]` and `li[data-checked="true"]`. |
| `TrailingNodePlugin` | Keeps an empty paragraph at the end of the document. The editor adds a trailing `<p></p>` when content ends with anything other than a paragraph (a heading, list, quote, table or code block), on the first interaction with it, which can mark a form as changed. |

## Global attributes

A plugin can add an attribute to nodes and marks that other plugins own, such as an alignment on paragraphs and
headings. Declare it once in PHP: the server parses and renders it, and the editor gets a matching TipTap extension,
so no JavaScript is needed.

```php
use Hollyit\RichEditorPlus\Content\GlobalAttribute;
use Hollyit\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;

class AlignmentPlugin extends Plugin implements ProvidesGlobalAttributes
{
    public function getGlobalAttributes(): array
    {
        return [
            GlobalAttribute::style('textAlign', 'text-align')
                ->types(['paragraph', 'heading'])
                ->values(['left', 'center', 'right', 'justify']),
        ];
    }

    // getId(), getJsExtension(), ...
}
```

To add one to an existing plugin, such as anchors on headings, extend it from a service provider:

```php
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginExtension;

RichEditorPlus::extendPlugin('core/heading', fn (PluginExtension $extension) => $extension->addGlobalAttributes([
    GlobalAttribute::html('anchor', 'id')->types(['heading'])->pattern('[A-Za-z][A-Za-z0-9_-]*'),
]));
```

- `style($name, $property)` reads and writes one CSS property of the `style` attribute. Several style attributes on
  one element are merged into one `style`. `html($name, $attribute)` reads and writes a plain HTML attribute; `class`
  values are merged.
- `types()` takes node and mark names, or `'*'`, `'nodes'` or `'marks'`. Names the field doesn't have are ignored.
- Every attribute must validate its value with `values([...])` (matched without regard to case, stored as listed) or
  `pattern('...')` (anchored for you; use regex syntax PHP and JavaScript share). Invalid values are dropped when
  content is parsed and when it is rendered, so stored JSON can't smuggle CSS or markup through.
- Values are strings, the default is `null`, and `null` is not rendered. `keepOnSplit(false)` stops Enter from copying
  the value to the new block.
- `html()` refuses `style`, event handlers (`on*`) and URL attributes such as `href` and `src`.
- If a TipTap extension you load already declares the attribute in the browser, call `providedByJsExtension()` so
  only the server side is generated.
- The editor writes `style` values in the browser's normalized form (a colour such as `#F00` is saved as
  `rgb(255, 0, 0)`), and that HTML is parsed again when the field loads. A `style()` pattern must accept that form
  too, or the value is dropped.

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

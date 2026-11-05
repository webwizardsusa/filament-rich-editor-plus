# Rich Editor Plus

A rich editor field for Filament, built on TipTap. Each block gets its own toolbar, Gutenberg style. Type `/` to insert
blocks from the slash menu. Everything the editor can do comes from a plugin, so you can turn features off one by one
or write your own. Optional plugins add tables, images, file attachments, mentions and Markdown storage.

## Requirements

- PHP 8.3 or later
- Filament 5

## Installation

```bash
composer require hollyit/rich-editor-plus
php artisan filament:assets
```

`filament:assets` copies the editor's JavaScript and CSS into `public/`. Run it again after every update of the
package, or add it to the `post-autoload-dump` scripts in your `composer.json`:

```json
"post-autoload-dump": [
    "Illuminate\\Foundation\\ComposerScripts::postAutoloadDump",
    "@php artisan package:discover --ansi",
    "@php artisan filament:assets"
]
```

## Quick start

Use the field in a form like any other Filament field:

```php
use Hollyit\RichEditorPlus\RichEditorPlus;

public static function configure(Schema $schema): Schema
{
    return $schema->components([
        RichEditorPlus::make('body')->required(),
    ]);
}
```

To show the content outside the panel, render it with the same plugins the field uses (see [Rendering](#rendering)):

```blade
{!! \Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer::make($post->body)->toHtml() !!}
```

Coming from Filament's own `RichEditor`? See [Coming from Filament's RichEditor](#coming-from-filaments-richeditor).

## Coming from Filament's RichEditor

| `RichEditor` | `RichEditorPlus` |
|---|---|
| `->toolbarButtons([...])` | `->toolbarTools([...])` (see [Arranging a toolbar](#arranging-a-toolbar)) |
| `->json()` | `->storeAs(StateFormat::Json)`. On this field `->json()` is only Filament's JSON validation rule, so don't call it. |
| `->mentions([...])` | `MentionPlugin` |
| `->getFileAttachmentUrlUsing()` | `ImagePlugin::make()->urlUsing(fn (string $disk, string $path) => ...)` |
| `->saveUploadedFileAttachmentUsing()` | Not supported: the plugins store files themselves. |

The other file attachment settings carry over. The field passes them to `ImagePlugin` and `AttachmentPlugin` as
defaults, and anything set on a plugin wins:

| Field setting | Used by |
|---|---|
| `fileAttachmentsDisk()`, `fileAttachmentsDirectory()`, `fileAttachmentsVisibility()`, `fileAttachmentsMaxSize()` | both plugins |
| `fileAttachmentsAcceptedFileTypes()` | `ImagePlugin` only, since Filament's editor attachments are images |
| `fileAttachments(false)` | turns `ImagePlugin` uploads off, and the field takes no uploads at all |

These settings belong to the field, so a renderer outside the form doesn't know them. Give the plugins you render
with the same disk and directory, or set them on the plugins in the first place:

```php
RichContentPlusRenderer::make($post->body)
    ->plugins([ImagePlugin::make()->disk('s3')->directory('posts')])
    ->toHtml();
```

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

### Content formats

HTML and JSON are the built-in storage formats. A `ContentFormat` stores the field's content as something else, such as
Markdown (see [Markdown](#markdown)). The editor still edits a document;
the format converts it on the way in and out of the model.

```php
RichEditorPlus::make('body')->storeAs(MarkdownFormat::make());

$field->getContentFormat(); // the ContentFormat, or null
```

- `storeAs()` takes a `StateFormat`, a `ContentFormat` or a closure returning either. With a `ContentFormat`,
  `getStateFormat()` still answers `StateFormat::Json`, because the browser keeps editing a document.
- A plugin can choose the format by implementing `ProvidesContentFormat`; the field uses the first format from its
  explicit plugins (never the defaults). A plugin format that differs from the one given to `storeAs()` throws at boot.
- A format's `assertSupports()` throws an `UnsupportedContentFormatException` naming every plugin it can't keep. Default
  plugins the format can't keep are dropped quietly; plugins you add throw. `getHiddenTools()` names tools the field
  removes from every toolbar and the slash menu.
- A plugin that implements `ChecksFieldPlugins` is asked to check the field's final plugin list when the field builds
  its registry, so it can throw when the combination doesn't suit it. `PluginRegistry::withoutTools()` builds a
  registry with some tools removed.
- `RichContentPlusRenderer` reads string content with a format through `->format($format)`, and writes with
  `->toFormat($format)`. `->toMarkdown()` exports any content as Markdown. The renderer is `Macroable`, so a package can add methods of its own.
- A tool marked `Tool::availableWhileReadOnly()` stays enabled while the editor is read-only; the toolbar, the More menu
  and the block controls disable every other tool. A tool's active state can also come from an extension's
  `editor.storage[name].isActive` boolean.

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
`->stickyFixedToolbar(false)`, or move it with the `--rep-fixed-toolbar-offset` CSS variable. In a modal or
slide-over it sticks to the top of the modal's own scrolling area instead.

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

## Links

`LinkPlugin` is in the default set. To change it for a field, add it again with your settings:

```php
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;

RichEditorPlus::make('body')->addPlugins([
    LinkPlugin::make()
        ->protocols(['http', 'https', 'mailto', 'tel']) // the default; links with other schemes keep only their text
        ->defaultProtocol('https')                      // the default, for links typed without a scheme
        ->openInNewTab()                                // the default for new links; the link modal can change it
        ->autolink()                                    // the default: typed and pasted URLs become links
        ->allowedClasses([]),                           // the default: links keep no classes
]);
```

Stored content comes from the browser, so link attributes are checked whenever content is parsed or rendered:

- `class` keeps only the names given to `allowedClasses()`, so content can't borrow your site's own utility classes
  (`fixed inset-0 z-50`, for example) to lay a link over the page.
- `target` is kept only when it is `_blank` or `_self`.
- A link that opens in a new tab always gets `rel="noopener"`, and `opener` is never kept, so the page it opens
  can't reach back to yours.

## Optional plugins

These plugins ship with the package but aren't in the default set. Add them to a field, or to every field from a
service provider:

```php
use Hollyit\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\CodePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\SubscriptPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\SuperscriptPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextAlignPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TrailingNodePlugin;

RichEditorPlus::make('body')->addPlugins([CodePlugin::make(), TaskListPlugin::make()]);

RichEditorPlus::make('body')->addPlugins([
    TextAlignPlugin::make()
        ->alignments(['left', 'center', 'right', 'justify']) // the default
        ->types(['paragraph', 'heading'])                    // the default
        ->defaultAlignment('left'),                          // the default; choosing it clears the alignment
]);

RichEditorPlus::registerDefaultPlugins([CodePlugin::class, TaskListPlugin::class]);
```

The colour plugins take a palette of named colours. Each entry has a label for the menu and a CSS colour:

```php
use Hollyit\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextColorPlugin;

RichEditorPlus::make('body')->addPlugins([
    TextColorPlugin::make()->colors([
        'brand' => ['label' => 'Brand', 'color' => '#7c3aed'],
        'muted' => ['label' => 'Muted', 'color' => '#6b7280'],
    ]),
    BackgroundColorPlugin::make(), // the default palette
]);
```

- Colours are stored as classes: `has-brand-color` and `has-yellow-background-color` by default. Change the names with
  `classUsing(fn (string $name) => …)`.
- Each plugin has a default eight-colour palette, and `colors()` replaces it.
- Palette names are lower-case letters, digits and hyphens, and don't start with a hyphen. `default` is reserved for the
  menu's "Default" item. Every label must be non-empty.
- A colour may not contain `;`, `{`, `}`, `<`, `>`, `"`, `'`, `\`, `/*`, `*/` or a control character such as a line break or tab.
- `BackgroundColorPlugin` entries take an optional `'text'` colour, validated the same way, for the text inside the
  highlight. The default palette sets dark text (`#1f2937`) so highlights stay readable in dark mode. It is written as a
  zero-specificity `:where()` rule, so a text colour on the same span always wins. `TextColorPlugin` ignores `'text'`.
- The field includes the palette CSS itself, but a page that displays content must include it too. Configure each
  plugin exactly as on the field, or the classes and colours won't match:

  ```blade
  @php
      use Hollyit\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
      use Hollyit\RichEditorPlus\Plugins\Core\FontFamilyPlugin;
      use Hollyit\RichEditorPlus\Plugins\Core\FontSizePlugin;
      use Hollyit\RichEditorPlus\Plugins\Core\LineHeightPlugin;
      use Hollyit\RichEditorPlus\Plugins\Core\TextColorPlugin;
  @endphp

  <style>
      {!! TextColorPlugin::make()->getStylesheet() !!}
      {!! BackgroundColorPlugin::make()->getStylesheet() !!}
      {!! FontFamilyPlugin::make()->getStylesheet() !!}
      {!! FontSizePlugin::make()->getStylesheet() !!}
      {!! LineHeightPlugin::make()->getStylesheet() !!}
  </style>
  ```

  Or copy the rules into the site CSS. Content shown without them appears unstyled. The same applies to the font,
  size and line height plugins below.
- A class means one colour site-wide: two fields that give the same class different colours clash on a page that shows both.
- Removing an entry from a palette strips that colour from content the next time it is saved; until then the class stays in
  stored HTML.
- The field prints its palette CSS in an inline `<style>`, so a Content-Security-Policy must allow inline styles.

The font, size and line height plugins store their choice on the same `textStyle` span as the colours, so they combine
with them and with each other. They take a palette of named values, and each has a default:

```php
use Hollyit\RichEditorPlus\Plugins\Core\FontFamilyPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\FontSizePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LineHeightPlugin;

RichEditorPlus::make('body')->addPlugins([
    FontFamilyPlugin::make()->fonts([
        'brand' => ['label' => 'Brand', 'family' => '"Inter", sans-serif'],
        'serif' => ['label' => 'Serif', 'family' => 'ui-serif, Georgia, serif'],
    ]),
    FontSizePlugin::make()->sizes([
        'small' => ['label' => 'Small', 'size' => '0.875em'],
        'large' => ['label' => 'Large', 'size' => 'clamp(1.125rem, 2vw, 1.5rem)'],
    ]),
    LineHeightPlugin::make(), // the default palette: tight, relaxed, loose
]);
```

- Classes are `has-{name}-font-family`, `has-{name}-font-size` and `has-{name}-line-height` by default. Change them with
  `classUsing()`, as for the colours.
- The default palettes are fonts `sans`, `serif` and `mono`; sizes `small` (`0.875em`), `large` (`1.25em`), `x-large`
  (`1.5em`) and `xx-large` (`2em`); and line heights `tight` (`1.25`), `relaxed` (`1.75`) and `loose` (`2`). `fonts()`,
  `sizes()` and `heights()` replace them. Palette names follow the colour rules above.
- A font is a comma-separated list of names, such as `ui-serif, Georgia, serif`. Quote a name that needs it, as in
  `"Open Sans"`. Names with characters other than ASCII letters, digits, hyphens and spaces (for example
  `"游ゴシック"`) must be quoted. A bare name may start with a hyphen, as in `-apple-system`. Quoted names may not
  contain quotes, backslashes or line breaks.
- A size is a length (`1.25rem`, `120%`), `0`, a size keyword (`large`), `var(--name)`, or one `clamp()`, `min()`,
  `max()` or `calc()`. Those hold only numbers with units `px`, `rem`, `em`, `%`, `pt`, `vw`, `vh`, `ch`, `ex`, `lh`, `vmin`, `vmax`, `svw`, `svh`, `dvw`, `dvh`, `lvw`, `lvh`, `cqi` or
  `cqb` (also allowed on plain lengths), the operators
  `+ - * /`, commas, spaces, `var(--name)` and nested math functions, with balanced parentheses.
- A line height is a number (`1.5`), or a number with `px`, `rem`, `em`, `%` or one of the letter units above, `normal` or
  `var(--name)`.
- The colour and type menus come after the formatting buttons in the default inline toolbar.
- No value may contain `;`, `{`, `}`, `<`, `>`, `\`, `/*`, `*/` or a control character. Only font names may contain
  quotes.
- The font menu shows each font's swatch in its own typeface. The size and line height menus are plain lists. Every menu
  starts with a "Default" item that clears the value.
- Line height applies to the selected text, so it can make lines taller but not tighter. To tighten whole paragraphs,
  set it in the site's CSS.
- The plugins name fonts only: web fonts must be loaded by the site, for example in its own stylesheet.

| Plugin | Adds |
|---|---|
| `CodePlugin` | Inline code (`Mod-e`). Code text can't have other marks. |
| `SubscriptPlugin`, `SuperscriptPlugin` | Subscript (`Mod-,`) and superscript (`Mod-.`), in the more menu. Each replaces the other. |
| `TaskListPlugin` | A checkbox list, in the list menu next to bulleted and numbered lists. Saved and rendered checkboxes are `disabled`; style them with `ul[data-type="taskList"]` and `li[data-checked="true"]`. |
| `TextAlignPlugin` | An alignment menu on the block toolbar, for paragraphs and headings. It stores `style="text-align: …"`. Configure it with the alignments on offer, the node types it applies to, and the default alignment, which is never stored: choosing it clears the attribute. On a right-to-left site, use `defaultAlignment('right')`. The menu appears in every block toolbar and is disabled where nothing can be aligned. Shortcuts: `Mod-Shift-l`, `Mod-Shift-e`, `Mod-Shift-r` and `Mod-Shift-j` for left, center, right and justify (Ctrl on Windows and Linux, Cmd on macOS), bound only for the configured alignments. |
| `TextColorPlugin` | A text colour menu on the toolbar, from a palette of eight colours by default. It stores the colour as a class on a span. |
| `BackgroundColorPlugin` | A highlight menu on the toolbar, from a palette of eight pale colours by default. It stores the highlight as a class on a span. |
| `FontFamilyPlugin` | A font menu on the toolbar, from three font stacks by default (sans, serif and mono). It stores the font as a class on a span. |
| `FontSizePlugin` | A size menu on the toolbar, from four sizes by default. It stores the size as a class on a span. |
| `LineHeightPlugin` | A line height menu on the toolbar, from three values by default (tight, relaxed and loose). It stores the line height as a class on a span. |
| `TrailingNodePlugin` | Keeps an empty paragraph at the end of the document. The editor adds a trailing `<p></p>` when content ends with anything other than a paragraph (a heading, list, quote, table or code block), on the first interaction with it, which can mark a form as changed. |

## Mentions

`MentionPlugin` lets editors mention records by typing a trigger, such as `@` for people or `#` for tags. Each trigger
has a `MentionProvider` that finds and labels its records. The plugin is opt-in, since it does nothing without one:

```php
use App\Models\User;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Support\MentionItem;
use Hollyit\RichEditorPlus\Support\MentionProvider;

RichEditorPlus::make('body')->addPlugins([
    MentionPlugin::make()->providers([
        MentionProvider::make('@')
            ->getSearchResultsUsing(fn (string $query, int $limit) => User::query()
                ->where('team_id', auth()->user()->team_id)
                ->where('name', 'like', "%{$query}%")
                ->limit($limit)
                ->get()
                ->map(fn (User $user): MentionItem => MentionItem::make($user->id, $user->name)
                    ->description($user->email)
                    ->avatar($user->avatar_url)))
            ->getLabelsUsing(fn (array $ids): array => User::query()
                ->where('team_id', auth()->user()->team_id)
                ->whereKey($ids)
                ->pluck('name', 'id')
                ->all())
            ->getUrlUsing(fn (string $id): string => route('users.show', $id)),

        MentionProvider::make('#')->items(['news' => 'News', 'releases' => 'Releases']),
    ]),
]);
```

- A search returns `id => label`, a list of `MentionItem`s, or a Collection of either. `items()` is a fixed list, searched
  on the server.
- `getLabelsUsing()` gets the ids of every mention in the content and returns `id => label`. Labels are looked up again
  whenever content is rendered, so a renamed user shows their new name. Leave out ids that no longer exist.
- `getUrlUsing()` links a rendered mention. Use `getUrlsUsing(fn (array $labels) => [...])` instead when building the
  links needs a query: it gets `id => label` for every mention at once. Only `http`, `https` and relative URLs are used.
- A mention whose provider looks labels up but no longer returns its id keeps the label stored in the content and is
  never linked. That covers deleted records, and ids someone made up by editing the content by hand.
- To keep the code in one place, extend `MentionProvider` and override `search()`, `labels()` and `url()`. Pass the
  class name to `providers()`.

Other options, with their defaults:

```php
MentionProvider::make('@')
    ->allowSpaces(false)        // let a query run on past a space, for full names
    ->minQueryLength(0)         // shorter queries show the search prompt instead of searching
    ->maxQueryLength(100)       // longer queries find nothing and never reach your search
    ->limit(50)                 // the most results shown; the search callback gets it as `$limit`
    ->displayFormat('@:label')  // how a mention reads; defaults to the trigger followed by the label
    ->searchPrompt('...')       // the messages in the menu; each defaults to a translation
    ->searchingMessage('...')
    ->noResultsMessage('...');
```

**Scope every lookup yourself.** The search and label callbacks run for anyone who can open the page, with any
input the browser sends, so they must only return records that user may see, for example by filtering to the current
tenant as above. In a `MentionProvider` subclass, `$this->getField()` gives you the field, or `null` when content is
being rendered outside a form.

Give the renderer `MentionPlugin` with the same providers, or mentions are left out of its output:

```php
RichContentPlusRenderer::make($post->body)->plugins([MentionPlugin::make()->providers([...])])->toHtml();
```

## Tables

`TablePlugin` adds tables, inserted from the slash menu ("Table") or the block menu with a dialog that asks for the
size and whether there is a header row. While the cursor is in a table, the toolbar shows its tools: add or delete
columns and rows, merge or split cells, toggle the header row and delete the table.

```php
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;

RichEditorPlus::make('body')->addPlugins([
    TablePlugin::make()
        ->resizable()              // the default: column widths can be dragged
        ->defaultSize(3, 3, true), // the default: rows, columns and a header row in the insert dialog
]);
```

Render content with the same plugins as the field. A field that stores Markdown needs `->resizable(false)`, because
Markdown has no column widths (see [Markdown](#markdown)).

## Images and attachments

`ImagePlugin` adds images: upload a file to a Laravel disk or link to a web image,
then give it alt text, a caption, an alignment and a width. Images are blocks, added from the slash menu ("Image") or
the block menu, and edited from the block toolbar.

```php
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;

RichEditorPlus::make('body')->addPlugins([ImagePlugin::make()]);
```


### Image options

Every option is shown with its default:

```php
ImagePlugin::make()
    ->disk(null)                                  // Filament's default disk; `public` in place of `local`
    ->directory('editor-images')
    ->visibility('public')                        // 'public' or 'private'
    ->maxSize(5120)                               // kilobytes
    ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    ->allowUrls()                                 // let editors link to an external image
    ->allowUploads()                              // let editors upload, paste and drop image files
    ->altRequired()                               // alt text is required unless the image is marked decorative
    ->widths(['25' => '25%', '50' => '50%', '75' => '75%', '100' => '100%'])
    ->defaultWidth('100')
    ->defaultAlignment('center')                  // 'left', 'center', 'right' or 'wide'
    ->temporaryUrlMinutes(30)
    ->urlUsing(fn (string $disk, string $path): string => ...); // not set by default
```

- `widths()` maps a key, which is stored in the content, to a CSS length (`%`, `px`, `rem`, `em`), `auto` or a CSS
  variable. The default width must be one of the keys.
- `acceptedFileTypes()` takes MIME types and `type/*` wildcards such as `image/*`, in the modal and for pasted and
  dropped files alike. A type the plugin refuses (such as `AttachmentPlugin`'s HTML and scripts) stays refused even
  when a wildcard matches it, and a wildcard never matches SVG, HTML, XML or JavaScript (`image/*` does not take
  `image/svg+xml`): those are taken only when listed by name.
- `allowUploads(false)` leaves the URL field only: the modal has no upload, the editor stops taking pasted and dropped
  image files, and the server refuses image uploads. Use it with `allowUrls()` when the content can only hold links to
  images, as on a field that stores Markdown.
- An invalid configuration, such as an unknown disk, throws an `InvalidArgumentException` when the plugin is used.

### Where images are stored

An uploaded image is saved to the plugin's disk, in the directory, and the content stores the **disk and path**, never
the URL:

```html
<figure class="rep-image" data-type="image" data-disk="public" data-path="editor-images/cat.jpg" data-align="center" data-width="100"><img alt="A cat"><figcaption>Napping</figcaption></figure>
```

Whether it comes from the modal or a paste or drop, the file is stored under a random name with the extension of its
real type, detected from its contents; the name and type the browser reports are never used for it. A file whose
contents are not an accepted type is refused.

The URL is resolved when content is rendered and when the editor shows the image:

- With `visibility('public')` it is the disk's `url()`. A `public` disk needs `php artisan storage:link`.
  Each upload is also made public on the disk when the disk allows it. An S3 bucket that refuses ACLs keeps the file
  as its bucket policy says, so give such a bucket a policy that lets readers fetch the directory.
- With `visibility('private')` it is a temporary URL that lasts `temporaryUrlMinutes()`. The disk must support
  temporary URLs, such as S3.
- `urlUsing(fn ($disk, $path) => ...)` replaces both, for a CDN or a signed route.

Because stored content comes from the browser, a path is only used when it is safe: the plugin's own disk, a relative
path inside the plugin's directory, with no `.`, `..` or empty segments, no leading `/`, no `\` or `%` anywhere, and no
control characters. Anything else, such as `../../.env`, `%2e%2e/.env` or a path on another disk, renders without a
`src` and is never signed. The same rule applies to the directory you configure.

The editor asks the server for the URLs of the uploaded images it shows, in batches of up to 100 paths, and keeps them
while the editor is open. A lookup that fails is asked for again the next time the image renders. In a very long
editing session, a temporary URL on a private disk can expire before the page is reloaded and the image stops showing;
reloading the page fixes it.

On a private disk, anyone who can open the field can get a temporary URL for any file in the plugin's directory, not
only the images in the record they are editing. Give private images a directory per tenant (or per record), such as
`->directory('editor-images/'.$tenant->getKey())`, so one tenant cannot reach another's files.

### External images

With `allowUrls()` (the default), the image modal offers a "URL" source for `http` and `https` images and for relative
URLs (`/images/logo.png`, `images/logo.png`, `//cdn.example.com/logo.png`). They are stored as `data-url` and rendered
with that URL as their `src`; other schemes, such as `javascript:` or `data:`, are never accepted. The URL is loaded
straight from its site by every reader's browser.

A relative URL is resolved against the page showing the content, so the editor (inside your panel) and your public pages
may load different files. A root-relative URL (`/images/logo.png`) gives the same file on both when they share a domain.

With `allowUrls(false)`, only uploads can be added. External images already in stored content keep their URL when they
are edited.

### Alt text and captions

Alt text is required unless you call `altRequired(false)`. Then the modal offers a "Decorative image" checkbox, which
saves an empty `alt` so screen readers skip the image. The caption is optional and renders as a `<figcaption>`.

### Editing images

Select an image to see its block toolbar: edit (reopens the modal), alignment (`left`, `center`, `right`, `wide`) and
width (from `widths()`). When editing, leaving the upload empty keeps the current image, but only while it is still
valid: if its stored path is not a safe path on the plugin's disk (see above), a new upload is required. Choosing a new
file replaces the image.

Deleting an image from the editor does **not** delete its file. The same file may be used by other content or by an
older version of it, so remove files that nothing uses with your own cleanup.

### Pasting and dropping files

With `ImagePlugin` on a field, images pasted into the editor (screenshots, copied image files) or dropped onto it are
uploaded and inserted. With `AttachmentPlugin` too, other accepted files become file cards. Each file shows an
"Uploading…" placeholder with its progress; the form waits to save until every file of the paste or drop is stored
and in the content.

- One pasted or dropped image opens the image modal for its alt text and caption. Several are inserted directly and
  show a "Needs alt text" badge in the editor until they have alt text (with `->altRequired(false)` there is no badge).
- A paste that contains HTML (from a web page or a word processor) is pasted as content, not uploaded.
- At most 10 files are added per paste or drop.
- The editor routes each file by the type the browser reports, knowing its other names (a ZIP reported as
  `application/x-zip-compressed` or `application/x-zip`, a CSV as `text/x-csv` or `application/csv`, a JPEG as
  `image/jpg` or `image/pjpeg`). A file the browser reports no type for goes to `AttachmentPlugin`, when the field
  has it.
- Each plugin checks the file's real type from its contents and its size before storing it on its own disk and
  directory. The browser only ever sends a temporary upload.
- A file that is rejected or fails to upload loses its placeholder and shows a Filament notification. If the content
  around a placeholder is deleted while it uploads, the file is still saved to the disk but not added to the content,
  and a notification says so. Nothing uses that file, so your own cleanup can remove it.
- Uploads finish without moving the caret, so you can keep typing while they run.
- Livewire's temporary uploads have their own limit (12 MB by default). For a larger `maxSize`, raise
  `livewire.temporary_file_upload.rules` (for example `['required', 'file', 'max:51200']`).

### Attachments

```php
use Hollyit\RichEditorPlus\Plugins\Image\AttachmentPlugin;

RichEditorPlus::make('content')
    ->addPlugins([
        ImagePlugin::make()->disk('public'),
        AttachmentPlugin::make()
            ->disk('public')                    // default: Filament's default disk; `public` in place of `local`
            ->directory('editor-attachments')   // default
            ->visibility('public')              // default; anything else renders temporary URLs
            ->maxSize(10240)                    // KB, default
            ->acceptedFileTypes([...])          // default: PDF, Word, Excel, PowerPoint, OpenDocument, text, CSV, ZIP
            ->temporaryUrlMinutes(30)
            ->urlUsing(fn (string $disk, string $path): string => ...),
    ]);
```

Attachments are block cards with the file's name, its size and a download link, inserted from the slash menu's
"File" block or by pasting or dropping a file. Like images, they store their disk and path and get their link when the
content is shown, so private disks work. Include `AttachmentPlugin::make()->getStylesheet()` on pages that show
content, as for images.

HTML, XHTML, SVG, XML, JavaScript, PHP, shell scripts and executables are never accepted, even when configured: a file
on a public disk is served from your own domain, so one of these could run script there.

Deleting an attachment or image from the content does not delete its file. Run `php artisan storage:link` before using
the `public` disk locally.

### Showing images and attachments

Rendered content needs the plugin's CSS for alignment and width. Include it on every page that shows the content:

```blade
<style>{!! \Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin::make()->getStylesheet() !!}</style>
```

Use the same `widths()` as the field, because the stylesheet has one rule per width. The editor loads it by itself.

Render content with the same plugins as the field, so images get their URLs:

```php
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;

RichContentPlusRenderer::make($post->body)
    ->plugins([ImagePlugin::make()])
    ->toHtml();
```

### SVG images

SVG is not accepted by default, because an SVG file can carry script, and `image/*` never includes it: the type is read
from the file's contents, so an SVG renamed to `.png` is still refused. If you add `image/svg+xml` to
`acceptedFileTypes()` by name, only do so for trusted editors, and serve the files from a disk or domain that does not
share cookies with your application.

## Markdown

`MarkdownPlugin` and `MarkdownFormat` add Markdown: store a field's content as Markdown, paste Markdown as
formatted content, switch to a Markdown source view while editing, and export any content to Markdown. Conversion
happens in PHP in both directions (CommonMark with the GitHub-flavoured extensions to read, a rules-based serializer to
write), so stored content, pasted content and the source view always agree. The editor itself keeps editing a document.


### Storing Markdown

```php
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownPlugin;

RichEditorPlus::make('body')->addPlugins([MarkdownPlugin::make()->store()]);
```

The same, without the plugin's other features being involved:

```php
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownFormat;

RichEditorPlus::make('body')->storeAs(MarkdownFormat::make());
```

The model column holds Markdown, so use a `text` or `longText` column. A value that was stored as HTML or JSON before
is read as Markdown, so convert existing rows first (see [Exporting Markdown](#exporting-markdown)).

A Markdown field only allows plugins whose content has a Markdown form:

- **Default plugins** Markdown can't keep (`UnderlinePlugin`) are left out quietly.
- **Plugins you add** that Markdown can't keep throw when the field boots, naming all of them at once:

  ```
  Markdown storage can't keep: UnderlinePlugin (no Markdown syntax for underline), TablePlugin (column widths: call ->resizable(false)).
  ```

- Tables and images need one setting each:

  ```php
  TablePlugin::make()->resizable(false);
  ImagePlugin::make()->allowUrls()->allowUploads(false);
  ```

- The tools Markdown can't express (`mergeOrSplit`, `toggleHeaderRow`, `imageAlign`, `imageWidth`) are removed from every
  toolbar and the slash menu. Images use the plugin's default alignment and width.

### Which plugins work

| Plugin | Allowed | Markdown |
|---|---|---|
| Document (`paragraph`, `text`, `hardBreak`) | Yes | Paragraphs separated by one blank line. Hard break: `\` + newline. |
| Bold, Italic, Strikethrough, Code | Yes | `**b**`, `*i*`, `~~s~~`, `` `c` ``. A code span's fence is one backtick longer than the longest run inside it, padded with a space when the code starts or ends with a backtick. |
| Link | Yes | `[text](url)`, plus `"title"` when present. URLs containing spaces or parentheses are written in `<...>`. |
| Heading | Yes | `#` to `######`. |
| Blockquote | Yes | `> ` on every line, nested. |
| Bullet list, Ordered list | Yes | `- ` and `1.`; an ordered list's start number is kept. Nested content is indented to the marker width. Multi-paragraph items are written loose. |
| Task list | Yes | `- [ ] ` and `- [x] `. |
| Code block | Yes | Fenced with the language (`` ```php ``); the fence is longer than any backtick run in the code. |
| Divider | Yes | `---` |
| Find & replace, Trailing node | Yes | No content of their own. |
| Table | With `->resizable(false)` | GFM table, see below. |
| Image | With `->allowUploads(false)` and `allowUrls()` on | `![alt](url "caption")`, see below. |
| Attachment | No | Stores disk and path, which Markdown can't hold. |
| Underline, Subscript, Superscript | No | No Markdown syntax. |
| Text colour, Background colour, Text align, Font family, Font size, Line height, Palette colour, Palette style | No | No Markdown syntax. |
| Mention | No | No Markdown syntax. |

Escaping is minimal: characters are escaped only where they would otherwise start Markdown syntax in their position
(`\*`, `\_`, `` \` ``, `\[`, `\]`, `\<`, a leading `#`, `>`, `-`, `+`, `1.` or `|` inside table cells). Plain prose
round-trips without added backslashes. Where CommonMark's flanking rules would not honour `**`, `*` or `~~` (for example
bold text that starts with punctuation next to a letter), the serializer writes `<strong>`, `<em>` or `<del>` instead,
so the emphasis survives.

**Tables.** The first row is written as the GFM header row, whatever its cell type; read back, the first row's cells are
headers. Column alignment comes from each header cell (`:--`, `:-:`, `--:`) and applies to the whole column. A cell is
one line: several paragraphs join with `<br>` (read back as hard breaks), and `|` is escaped.

**Images.** The caption is written as the title: `![Our cat](https://example.com/cat.jpg "Our cat sleeping")`. A
paragraph holding only an image becomes an image block when read; an image inside text splits the paragraph. Relative
URLs (`![Logo](/img/logo.png)`) are kept as written; an image whose URL has another scheme (`javascript:`, `data:`) is
read as its alt text.

### Pasting Markdown

On by default, on any field whatever its storage format. Pasted plain text that looks like Markdown is converted to
formatted content on the server, against the field's own schema, so what the field doesn't support comes back as plain
paragraphs.

- It converts when the clipboard has `text/plain` and any line starts with a heading, quote, list marker, task marker,
  numbered item or code fence, or holds a table, `[text](url)`, `**bold**` or `` `code` ``.
- Copied HTML wins: a paste that carries HTML is left to the normal paste, except from code editors (such as VS Code)
  that mark their clipboard.
- Pasting with Shift (Ctrl/Cmd+Shift+V) pastes the text as it is. Nothing converts inside a code block.
- A failed conversion inserts the original text and shows a notice.

Turn it off with `MarkdownPlugin::make()->pasteMarkdown(false)`.

### Markdown source view

A "Markdown source" item in the toolbar's More menu swaps the editor for a Markdown textarea. It is on
by default when the field stores Markdown. On other fields call `->sourceToggle()`; the field's plugins must all have
a Markdown form, or it throws at boot with the same message as above.

- Edits convert back to the document after a short pause, so the form's state stays current, and the form waits for a
  conversion in flight before saving.
- A "Done" bar returns to the editor. While the source view is open the editor is read-only, and the toolbar, the More
  menu and the block controls are locked, except tools marked `Tool::availableWhileReadOnly()`.
- Undo after returning walks back through the source edits to the document as it was before the switch.

### Exporting Markdown

Any content can be written as Markdown, whatever the field stores:

```php
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;

$markdown = RichContentPlusRenderer::make($post->body)->plugins([...])->toMarkdown();
```

Export is lenient: a node without a Markdown form writes its text, and a mark without one is dropped. Storage is strict
and throws an `UnsupportedContentFormatException`. `MarkdownFormat::make()->lenient()` gives the lenient format for
direct use. To migrate a column of HTML to Markdown, run each row through `toMarkdown()`.

To render stored Markdown:

```php
RichContentPlusRenderer::make($post->body)->plugins([...])->format(MarkdownFormat::make())->toHtml();
```

Raw HTML in Markdown is kept only as far as the field's schema parses it. Input over 1 MB is refused.

### What Markdown can't keep

Content arriving outside the editor's tools (paste, programmatic content) is normalised when the field saves. Nothing is
dropped in the browser.

- Merged table cells (the content stays in the first cell; the covered cells are empty).
- Different alignments within one column (the header cell's wins).
- Blocks other than paragraphs inside table cells (they are reduced to their text).
- Image alignment and width.
- Empty paragraphs.
- Headings outside the field's levels move to the nearest level (with levels 2 and 3, `#` becomes a level 2 heading
  and `####` a level 3 heading).
- Soft line breaks inside a paragraph become spaces.
- Leading spaces at the start of a line are dropped.
- Bare URLs and email addresses become links (GFM autolinks).
- An image inside a table cell is written as its alt text.
- Bold or italic on inline code (the code mark excludes other marks).
- Whitespace at the edge of a marked run moves outside it.

### Markdown for your own plugins

A plugin gives Markdown forms for its nodes and marks by implementing `ProvidesMarkdownRules`. A plugin with no rules is
not allowed on a Markdown field. Reading uses the plugin's existing HTML parse rules, because Markdown is parsed to
HTML first.

```php
use Hollyit\RichEditorPlus\Plugins\Markdown\Contracts\ProvidesMarkdownRules;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownWriter;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;

class CalloutPlugin extends Plugin implements ProvidesMarkdownRules
{
    // getId(), getJsExtension() and getNodes() (an `aside` node named `callout`) as usual.

    public function getMarkdownNodeRules(): array
    {
        return ['callout' => NodeRule::using(
            static fn (array $node, MarkdownWriter $writer) => $writer->write('> **Note:** '.$writer->textOf($node)),
        )];
    }

    public function getMarkdownMarkRules(): array
    {
        return []; // MarkRule::using($open, $close) rules, keyed by mark type
    }
}
```

A node rule writes through the `MarkdownWriter`, which handles indentation, blank lines and escaping. A mark rule
gives the text that opens and closes the mark.

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
use Hollyit\RichEditorPlus\Content\GlobalAttribute;
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
- `html()` refuses `style`, event handlers (`on*`) and URL or embedding attributes such as `href`, `src` and `srcdoc`.
- A global attribute can't share its name with an attribute the node or mark already has, or with another global
  attribute on the same type.
- If a TipTap extension you load already declares the attribute in the browser, call `providedByJsExtension()` so
  only the server side is generated.
- `classes($name, ['value' => 'class', …])` sets one class per value, such as `has-red-color` for `red`. Other classes on
  the element are left alone. Keys are lower-case letters, digits and hyphens.
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
`assetsMissingMessage()` to change the defaults. The package's own table, image and Markdown modules are registered
this way: see `src/Support/BundledPluginAssets.php`.

### Tools with a menu

A tool with `menu()` opens a list of items instead of running a command of its own. Its button shows the current
item's label through `currentLabel()`:

```php
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;

Tool::make('textAlign')
    ->label('Text align')
    ->icon('mdi-format-align-left')
    ->currentLabel('Text align: :item')
    ->menu([
        ToolMenuItem::make('center')
            ->label('Center')
            ->icon('mdi-format-align-center')
            ->command('setTextAlign', ['center'])
            ->active(attributes: ['textAlign' => 'center']),
    ])
    ->block();
```

- A menu tool runs its items, not a command of its own.
- `active()` without a name matches any node or mark with those attributes.
- Menu tools can be inline or block tools, not in the more menu.
- `swatch($class, $text = null)` shows a small box filled by the class (a palette colour, say) instead of an icon, with optional text such as `'A'`.
- `fallback()` marks the item that is current when no other item is active, such as "Default" in a colour menu.
- A plugin whose content needs CSS in the editor, such as palette classes, implements `ProvidesEditorStyles` and
  returns the CSS from `getEditorStyles()`. The field prints it in a `<style>` element, so return only validated CSS.
- A palette plugin for another CSS property extends `PaletteStylePlugin`, which the colour and font plugins share. It
  implements the hooks that differ, such as `attributeName()`, `cssProperty()`, `valueKey()`, `defaultPalette()` and
  `assertValue()`, and gets the menu, classes, stylesheet and shared checks from the base.

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

### Asking the server from the editor

A plugin whose JS needs data from the server while editing, such as the URLs of stored files, implements
`AnswersEditorRequests`. The factory gets the editor's context as a third argument, and `callPlugin()` sends a request
to the plugin's `answerEditorRequest()`:

```js
registerExtension('acme/files', (options, tiptap, { callPlugin }) => {
    const answer = callPlugin('acme/files', 'urls', { paths: ['a.png'] }) // a promise of the PHP method's array
})
```

```php
public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
{
    // urlsFor() stands for your own lookup.
    return $request === 'urls' ? ['urls' => $this->urlsFor($payload['paths'] ?? [])] : [];
}
```

- The payload comes from the browser. Validate it and cap its size; never trust a path or an id in it.
- The method runs as a method of the field, under the page's own authorization, so a request is only answered for
  someone who can use the page. A plugin that does not implement the interface answers `[]`.
- Requests are answered for a disabled (read-only) field too, because a read-only editor still loads what it shows.
  A request that changes anything, such as storing a file, must return early when `$field->isDisabled()`.
  `$field->pullTemporaryUpload()` already returns `null` for a disabled field.
- A plugin that throws answers `[]` too, silently: the error is not reported, so log it yourself if you need it.

The context also has `upload(file, { onProgress })`, which sends a file to the field's Livewire temporary uploads and
resolves with a key, `processing(promise, message)`, which keeps the form from saving until the promise settles and resolves or
rejects as it does (the optional message is what the form says while it waits, instead of the upload wording), and `runAction(action)`, which opens a field action with its registered arguments. `upload()` holds
the form only while the file uploads, so wrap the whole job (upload, `store` request and inserting the result) in
`processing()` to keep the form from saving before the file is in the document; calls may nest. A plugin that takes
uploads implements `AcceptsEditorUploads` (without it the field refuses uploads) and answers
`acceptsEditorUploads(): bool`, which lets it turn uploads off through its own settings (upgrading: the interface
used to be a marker with no methods, so an existing implementation must add `acceptsEditorUploads()`, returning
`true` to keep accepting uploads). In its
`answerEditorRequest()`, it takes the file with `$field->pullTemporaryUpload($key)`, which returns it once and then forgets it. Check the file's
type from its contents and store it yourself; the browser chose nothing but the key.

### Plugins that render markup

A plugin that renders a node as an element with markup inside, such as a `<figure>` with an `<img>`, implements
`PatchesRenderedMarkup` (on top of `PatchesRenderedHtml`) and returns those node names from
`getRenderedMarkupNodes()`. Stored HTML is then patched without parsing every document. The patcher finds such an
element from its opening tag, which carries `data-type="<node name>"`, to the first closing tag of the same name, so:

- the element should never contain another element with its own tag name (a `<figure>` should not hold a `<figure>`).
  A document where one does, or where an element is not closed, is rendered by parsing the whole document;
- a document whose element does not parse back to exactly one node of that type, such as hand-edited markup, is rendered
  by parsing the whole document. Other documents in the same batch are still patched.

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
root. The dev server is only used in a `local` environment. The package's `vite.modules.config.js`, which builds the
table, image and Markdown modules, shows both modes in one file.

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

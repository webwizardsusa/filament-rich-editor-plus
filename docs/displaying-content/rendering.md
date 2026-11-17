---
title: Rendering
weight: 10
description: Turn stored content into HTML, text or Markdown with RichContentPlusRenderer, one document or many at once.
---

`RichContentPlusRenderer` converts stored content on the server. It reads anything the field stores (HTML, a JSON
string, a document array, or a content format such as Markdown) and writes HTML for display, HTML for storage, a
document array, plain text or Markdown.

```php
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

$html = RichContentPlusRenderer::make($post->body)->toHtml();
```

## Use the field's plugins

The renderer only knows the nodes and marks of the plugins it is given. Give it the **same plugins as the field**, with
the same settings. Content from a missing plugin renders without its markup when it is rendered from a document (a
table becomes loose text), and data that plugins fill in at render time is missing: an image gets no `src`, and a
mention keeps the label it was saved with, or disappears.

- With no `plugins()` call, the renderer uses the default set, including anything added with
  `RichEditorPlus::registerDefaultPlugins()`. That matches a field with no plugin configuration.
- `plugins([...])` **replaces** that set, as the field's `plugins()` does. The document plugin is added for you; nothing
  else is.

So to render a field that adds a table to the defaults:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

$plugins = PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [TablePlugin::make()]);

RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml();
```

Keep that list in one place, such as a static method on a class of your own, and pass it to both the field's
`plugins()` and the renderer. See the [quick start](../quick-start.md#show-the-content) for an example.

> [!NOTE]
> Settings given to the field rather than to a plugin, such as `fileAttachmentsDisk()`, are not known to a renderer.
> Set them on the plugins instead. See [file attachment settings](../using-the-field/coming-from-filament.md#file-attachment-settings).

## Output

| Method | Returns |
|---|---|
| `toHtml()` | HTML for display, with data plugins look up (mention labels, image URLs) filled in. Don't store it. |
| `toStorableHtml()` | HTML that is safe to store and print: only what is in the document, with nothing looked up. |
| `toArray()` | The TipTap document as an array. An array given to `make()` is returned as it is. |
| `toText()` | Plain text, for search indexes, previews and notifications. |
| `toMarkdown()` | Markdown, for export. Nodes with no Markdown form are written as their text. |
| `toFormat($format)` | The content in any `ContentFormat`. |

`toHtml()` is the only output that plugins can [rewrite](../writing-plugins/render-hooks.md#rewriting-rendered-html),
for example to highlight code. Store `toStorableHtml()`, never `toHtml()`: looked-up values such as image URLs and
mention links would be frozen into the column.

## Reading other formats

String content is read as HTML or JSON (a JSON string whose `type` is `doc`). To read stored Markdown, or any other
content format, name the format:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\MarkdownFormat;

RichContentPlusRenderer::make($post->body)
    ->plugins($plugins)
    ->format(MarkdownFormat::make())
    ->toHtml();
```

Arrays are always read as documents, whatever the format.

## Trusted and untrusted HTML

Stored HTML is rendered by **patching** it: only the elements plugins fill in at render time, such as mentions and
images, are rebuilt, and every other byte is printed as stored. That makes rendering fast, but it means stored HTML
is **trusted**.

That is safe for HTML the field wrote: it is rebuilt from the field's plugins before it is saved, so it only holds
declared nodes, marks and attributes. Keep it that way:

- Only write the column through the field, or through `toStorableHtml()`, which removes anything unsafe:

  ```php
  $post->body = RichContentPlusRenderer::make($importedHtml)->plugins($plugins)->toStorableHtml();
  ```

- To render HTML that came from anywhere else, parse it instead of patching it:

  ```php
  RichContentPlusRenderer::make($untrustedHtml)->plugins($plugins)->parseHtml()->toHtml();
  ```

`parseHtml()` reads the HTML into a document with the plugins' parse rules and renders that, so only declared content
survives. Documents stored as JSON are always rendered from the document.

> [!WARNING]
> If anything other than the field or `toStorableHtml()` can write the column (an API, an import, a database
> console), either normalise what it writes with `toStorableHtml()` or render with `parseHtml()`.

## Many documents at once

`many()` renders a batch of documents together. Plugins make their lookups once for the whole batch, so a list of 50
posts with mentions costs one label query per mention trigger, not 50:

```php
$bodies = RichContentPlusRenderer::many($posts->pluck('body', 'id'))
    ->plugins($plugins)
    ->toHtml();

// ['12' => '<p>…</p>', '15' => '<p>…</p>', ...]
```

`many()` takes any iterable and keeps its keys. The batch renderer has `plugins()`, `format()` and `parseHtml()` like
the single one, and two outputs: `toHtml()` and `toText()`, each returning an array.

## Caching

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
expires. Temporary URLs for images on a private disk expire too: keep the cache lifetime shorter than
`temporaryUrlMinutes()`.

## Adding methods

`RichContentPlusRenderer` is `Macroable`, so your app or a package can add methods of its own:

```php
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

RichContentPlusRenderer::macro('toExcerpt', function (int $words = 30): string {
    return str($this->toText())->words($words)->toString();
});

RichContentPlusRenderer::make($post->body)->toExcerpt();
```

The batch renderer returned by `many()` is not macroable.

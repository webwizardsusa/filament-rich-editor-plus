---
title: In panels and on your pages
weight: 20
description: Show rendered content in a Filament infolist or table, and on your own Blade pages with the plugin stylesheets.
---

## In an infolist

The package has no infolist entry of its own. Use a `TextEntry` and give it the rendered HTML as an `HtmlString`:

```php
use Filament\Infolists\Components\TextEntry;
use Illuminate\Support\HtmlString;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

TextEntry::make('body')
    ->html()
    ->state(fn (Post $record): HtmlString => new HtmlString(
        RichContentPlusRenderer::make($record->body)->plugins(PostEditor::plugins())->toHtml(),
    ))
    ->columnSpanFull();
```

`PostEditor::plugins()` stands for the list of plugins your field uses (see
[use the field's plugins](rendering.md#use-the-fields-plugins)).

> [!IMPORTANT]
> Wrap the HTML in an `HtmlString`. A plain string with `->html()` goes through Filament's HTML sanitizer, which
> drops attributes the plugins rely on, such as an image's `data-align` and `data-width` or a task item's
> `data-checked`. The renderer's output is already safe for content written by the field (see
> [trusted and untrusted HTML](rendering.md#trusted-and-untrusted-html)), so it doesn't need sanitizing again.

For a table column, show plain text instead, which is shorter and needs no styles:

```php
use Filament\Tables\Columns\TextColumn;

TextColumn::make('body')
    ->formatStateUsing(fn (string|array|null $state): string => RichContentPlusRenderer::make($state)->toText())
    ->limit(80);
```

Infolists and tables are not form fields, so the editor's own content styles (headings, lists, quotes inside
`.rep-editor`) don't apply there. Style the rendered HTML as you would any HTML in your panel, for example with a
`prose` class from your theme.

## On your own pages

Print the renderer's HTML unescaped:

```blade
<article class="prose">
    {!! \Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml() !!}
</article>
```

The editor's stylesheet only styles content inside the editor, so your site styles the rendered HTML itself. The
HTML is plain and semantic (`<p>`, `<h2>`, `<ul>`, `<blockquote>`, `<pre><code>`, `<table>`), so a typography
stylesheet such as Tailwind's `prose` covers most of it.

### Plugin stylesheets

Some plugins store their choices as classes and data attributes, and their look comes from CSS the plugin generates
from its settings. The field includes that CSS itself, but a page that displays content must include it too.

| Plugin | What the CSS styles |
|---|---|
| `TextColorPlugin`, `BackgroundColorPlugin` | The palette classes, such as `has-red-color` |
| `FontFamilyPlugin`, `FontSizePlugin`, `LineHeightPlugin` | The palette classes, such as `has-large-font-size` |
| `ImagePlugin` | Alignment, width and caption of `.rep-image` figures |
| `AttachmentPlugin` | The `.rep-attachment` file card |

Each has `getStylesheet()`. Configure each plugin exactly as on the field, or the classes and values won't match:

```blade
<style>
    {!! \Webwizardsusa\RichEditorPlus\Plugins\Core\TextColorPlugin::make()->getStylesheet() !!}
    {!! \Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin::make()->getStylesheet() !!}
</style>
```

If you build your plugin list in one place, print every stylesheet it has:

```blade
<style>
    @foreach (PostEditor::plugins() as $plugin)
        @if (method_exists($plugin, 'getStylesheet'))
            {!! $plugin->getStylesheet() !!}
        @endif
    @endforeach
</style>
```

Or copy the rules into your site's CSS, and update them when you change a palette or the image widths.

Notes:

- Content shown without these rules appears unstyled: the colours, fonts and image sizes are missing, but nothing
  breaks.
- A class means one value site-wide. Two fields that give the same palette name different colours clash on a page that
  shows both.
- The CSS is printed in an inline `<style>`. Under a Content-Security-Policy, allow inline styles, use a nonce, or move
  the rules into a stylesheet file. The field prints its own plugin CSS inline too.

### Other elements to style

- **Mentions** render as `<a class="rep-mention" data-type="mention">` when they have a URL, or `<span>` otherwise.
- **Task lists** render as `ul[data-type="taskList"]`, with `li[data-checked="true"]` on checked items. Their checkboxes
  are `disabled`, since ticking one on a page couldn't save anything.
- **Tables** render as `<table><tbody>…</tbody></table>`. Header cells are `<th>`, and cell alignment is an inline
  `text-align` style.
- **Code blocks** render as `<pre><code class="language-php">`, ready for a client-side highlighter. The
  [Rich Editor Plus Code](docs:rich-editor-plus-code/introduction) plugin highlights them on the server instead.

---
title: Markdown and content formats
weight: 110
description: Give a plugin's nodes and marks a Markdown form, choose a field's format from a plugin, and write a content format of your own.
---

## Markdown rules

A plugin is allowed on a field that stores [Markdown](../plugins/markdown.md) when every node and mark it declares has
a Markdown form. Give them one by implementing `ProvidesMarkdownRules`. A plugin without rules for its nodes or marks
is refused on a Markdown field, and its content is written as plain text by `toMarkdown()`.

```php
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Contracts\ProvidesMarkdownRules;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkRule;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;

class KeyboardPlugin extends Plugin implements ProvidesMarkdownRules
{
    public function getMarkdownNodeRules(): array
    {
        return [];
    }

    public function getMarkdownMarkRules(): array
    {
        // Markdown has no syntax for keys, but keeps inline HTML.
        return ['keyboard' => MarkRule::using('<kbd>', '</kbd>')];
    }

    // getId(), getMarks(), getJsExtension()...
}
```

Rules are keyed by node or mark type. Rules from your plugin override the built-in ones for the same type.

### Reading comes free, writing is yours

Markdown is read by converting it to HTML (CommonMark with the GitHub-flavoured extensions) and parsing that HTML with
the field's plugins. So reading needs nothing from you: your plugin's existing [parse rules](schema.md) handle it.

That means a rule should only write Markdown that **converts back to HTML your parse rules match**, or content changes
each time it is saved. The `<kbd>` rule above round-trips, because CommonMark keeps inline HTML and the plugin parses
`<kbd>`. A rule that writes a callout as a quote would turn every callout into a quote on the next save: leave such a
node without a rule, so the field refuses Markdown storage rather than losing content.

### Node rules

`NodeRule::using(fn (array $node, MarkdownWriter $writer) => ...)` writes one node through the writer. Block rules
write their block, and the writer puts blank lines between blocks; inline rules write their text.

```php
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownWriter;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;

'emoji' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write(
    ':'.($node['attrs']['shortcode'] ?? '').':',
)),

'aside' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write(
    $writer->indent($writer->renderBlocks($node['content'] ?? []), '> ', '> '),
)),
```

The writer's helpers:

| Method | Does |
|---|---|
| `write($markdown)` | Writes Markdown for the current node. |
| `renderBlocks($nodes, $separator = "\n\n")` | Renders child blocks with their rules, joined by the separator. Blocks that write nothing are skipped. |
| `renderInline($nodes)` | Renders inline children with their marks, moving spaces at the edge of marked text outside the delimiters. |
| `indent($text, $first, $rest)` | Prefixes the first line with `$first` and the others with `$rest`, as for quotes and list items. |
| `escape($text)`, `escapeLineStarts($markdown)` | Escapes characters that would start Markdown syntax inside a line, or at the start of one. |
| `linkDestination($url)`, `linkTitle($title)` | A link or image destination (in `<…>` when needed) and a `"title"`. |
| `isAllowedUrl($url, $type, $attribute, $protocols)` | Whether a URL may be written, by the schema's rules for that attribute. |
| `textOf($node)` | A node's plain text. |
| `depth()`, `previousSibling()` | Where the rule is: how deeply nested, and the block written just before at the same level. |
| `remember($key, $value)`, `recall($key)` | State shared by rules while writing one document. |
| `isStrict()` | `false` when exporting leniently with `toMarkdown()`. |

### Mark rules

| Constructor | Does |
|---|---|
| `MarkRule::using($open, $close)` | Delimiters around the marked text, such as `'**'`. Each can be a string or a closure that gets the mark and the writer, for delimiters that depend on attributes, as links do. |
| `MarkRule::wrapping(fn (string $text, array $mark) => ...)` | For marks whose text is written verbatim, like inline code: the closure gets the text and returns it wrapped. |

Then:

- `->withHtmlFallback('<strong>', '</strong>')` writes the mark as HTML where CommonMark wouldn't honour the
  delimiters, such as bold text starting with punctuation next to a letter. Use it for emphasis-like delimiters.
- `->when(fn (array $mark, MarkdownWriter $writer): bool => ...)` writes the mark only when the callback agrees, such
  as a link whose URL is allowed. Otherwise the text is written without it.

### Global attributes

A plugin that provides [global attributes](global-attributes.md) is never allowed on a Markdown field: Markdown has
nowhere to put an attribute on someone else's node.

## Choosing the format from a plugin

A plugin can choose the field's stored format, as `MarkdownPlugin::make()->store()` does, by implementing
`ProvidesContentFormat`:

```php
use Webwizardsusa\RichEditorPlus\Content\Contracts\ContentFormat;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesContentFormat;

public function getContentFormat(): ?ContentFormat
{
    return $this->stores ? MyFormat::make() : null;
}
```

Only plugins added to the field with `plugins()` or `addPlugins()` are asked, never the defaults, and the first one
that returns a format wins. If it differs from the format given to `storeAs()`, the field throws an
`InvalidArgumentException`.

## Writing a content format

A `ContentFormat` stores a field's content as text in some format. The editor keeps editing a document; the field
converts with the format on the way in and out of the model. Implement
`Webwizardsusa\RichEditorPlus\Content\Contracts\ContentFormat`:

| Method | Does |
|---|---|
| `getId(): string` | A short id, such as `markdown`. |
| `toDocument(string $content, PluginRegistry $registry): array` | Reads stored text into a TipTap document. |
| `fromDocument(array $document, PluginRegistry $registry): string` | Writes a document as stored text. |
| `assertSupports(array $plugins): void` | Throws an `UnsupportedContentFormatException` naming every plugin the format can't keep, with the reason for each. |
| `unsupportedPlugins(array $plugins): array` | Of the given plugins, those the field drops quietly when they came from the defaults. |
| `getHiddenTools(): array` | Tool names the field removes from every toolbar and the slash menu. |

The registry gives you the field's plugins and their settings. To read HTML, build the schema from it and parse:

```php
use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Content\HtmlParser;
use Webwizardsusa\RichEditorPlus\Content\HtmlSerializer;

public function toDocument(string $content, PluginRegistry $registry): array
{
    return (new HtmlParser(ContentSchema::fromRegistry($registry)))->parse($this->convertToHtml($content));
}

public function fromDocument(array $document, PluginRegistry $registry): string
{
    $html = (new HtmlSerializer(ContentSchema::fromRegistry($registry), forStorage: true))->serialize($document);

    return $this->convertFromHtml($html);
}
```

Build the exception with `UnsupportedContentFormatException::forPlugins('Textile', ['UnderlinePlugin' => 'no syntax
for underline'])`, which writes the "Textile storage can't keep: …" message.

Use the format on a field with `storeAs(MyFormat::make())`, and in the renderer with `->format(MyFormat::make())` to
read and `->toFormat(MyFormat::make())` to write.

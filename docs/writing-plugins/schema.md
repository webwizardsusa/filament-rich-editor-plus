---
title: Schema
weight: 30
description: Declare a plugin's nodes and marks for the server with NodeSpec and MarkSpec.
---

The browser has TipTap's schema; the server has its own, built from the `NodeSpec`s and `MarkSpec`s plugins return
from `getNodes()` and `getMarks()`. The server uses it to parse HTML into documents (pasted content, imports, stored
HTML), to write HTML for storage, and to render content for display.

## Undeclared content is stripped

The server only ever outputs what a spec declares. That is the package's main safety guarantee, and it has a
consequence for every plugin:

> [!IMPORTANT]
> A plugin that adds a node or mark in JavaScript must declare it in PHP too. Otherwise its tag disappears from stored
> HTML and from rendered output, and only its text is kept. Attributes work the same way: an attribute the spec
> doesn't declare is never written.

So the browser's TipTap extension and the PHP spec must agree on the name, the tag and the attributes, and should
render the same HTML in the same attribute order, so content saved by the editor and content rendered by the server
are identical.

## Nodes

A block that holds other blocks, from the example's callout:

```php
use DOMElement;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;

public function getNodes(): array
{
    $allowed = fn (mixed $value): string => in_array($value, ['info', 'warning'], true) ? $value : 'info';

    return [
        NodeSpec::make('callout')
            ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'div'
                && $element->getAttribute('data-type') === 'callout')
            ->attribute(
                'variant',
                parse: static fn (DOMElement $element): string => $allowed($element->getAttribute('data-variant')),
                render: static fn (array $attributes): array => [
                    'data-variant' => $allowed($attributes['variant']),
                    'class' => 'callout callout-'.$allowed($attributes['variant']),
                ],
                default: 'info',
            )
            ->htmlAttributes(['data-type' => 'callout'])
            ->renderTag('div'),
    ];
}
```

It renders `<div data-variant="info" class="callout callout-info" data-type="callout"><p>…</p></div>`. The node's
children (here, its paragraphs) are parsed and rendered by their own specs.

### Matching elements

| Method | Does |
|---|---|
| `parseTags(['kbd'])` | Matches elements by tag name. |
| `parseUsing(fn (DOMElement $element) => ...)` | For matches a tag name can't express. Return `true` to match, an array of attributes to match with those values, or `false` to leave the element to `parseTags()`. |
| `priority(60)` | The order rules are tried in, highest first. The default is 50. Give a node that matches a more specific `<ul data-type="…">` a higher priority than the one matching any `<ul>`. |

### Attributes

| Method | Does |
|---|---|
| `attribute($name, parse: …, render: …, default: …)` | Declares an attribute. `parse` gets the `DOMElement` and returns the value; without it, the HTML attribute of the same name is read. `render` gets all the node's attributes and returns HTML attributes; without it, the attribute is written under its own name. `default` is used when parsing finds nothing. |
| `urlAttribute($name, $protocols)` | An attribute holding a URL, written only when it is relative or uses one of the protocols. |
| `transientAttribute($name, $protocols)` | A URL that exists only while rendering for display, filled in by a [render hook](render-hooks.md). It is never parsed from HTML or written to stored HTML. Images use it for `src`. |
| `htmlAttributes([...])` | Fixed attributes on every rendered element, such as `data-type`. They win over declared attributes. |

A `null` value is never rendered. Rendered `class` and `style` values are merged the way TipTap's `mergeAttributes`
does, so several attributes can each add a class.

> [!WARNING]
> Attribute values come from the browser and from stored content. Validate them in **both** `parse` and `render`, as
> the callout does with `$allowed`: a JSON document is rendered without being parsed, so a check only in `parse` lets
> a crafted document through.

### Rendering

| Method | Does |
|---|---|
| `renderTag('div')` | Renders the node as one element with its children inside. |
| `renderUsing(fn (array $node, array $attributes) => [...])` | Renders a ProseMirror-style array: `['tag', $attributes, ...$children]`. `0` is where the node's children go, a nested array is an inner element, and a string is escaped text. |
| `textUsing(fn (array $node) => ...)` | Plain text for `toText()`. For an inline node it is the node's text; for a block it goes before the text of its children, such as a task item's `[x] `. |

A table, which wraps its rows in a `<tbody>`:

```php
NodeSpec::make('table')
    ->parseTags(['table'])
    ->renderUsing(static fn (array $node, array $attributes): array => ['table', $attributes, ['tbody', 0]]);
```

### Node kinds

| Method | Does |
|---|---|
| `inline()` | An inline node, such as a mention or a hard break. Nodes are blocks by default. |
| `atom()` | A node with no children. Anything inside its element is ignored when parsing. |
| `preserveWhitespace()` | Keeps whitespace as written, as in a code block. |
| `withoutMarks()` | Text inside can't have marks. |

## Marks

```php
use Webwizardsusa\RichEditorPlus\Content\MarkSpec;

public function getMarks(): array
{
    return [
        MarkSpec::make('keyboard')
            ->parseTags(['kbd'])
            ->excludes(['code'])
            ->renderTag('kbd'),
    ];
}
```

Marks have the same parsing, attribute and rendering methods as nodes, plus:

| Method | Does |
|---|---|
| `excludes(['code'])` | Marks that can't share text with this one, as in TipTap. `'_'` means every other mark. Mirror the `excludes` of the JS mark, so the server keeps the same marks the editor would. |
| `priority(1000)` | Also ranks marks: higher priority marks wrap lower ones in rendered HTML. Links use 1000. |

`MarkSpec::styleValue($element, 'font-weight')` reads one CSS property from an element's `style`, for parse rules such
as "a span with bold weight is bold".

## Sharing nodes

Several plugins may declare the same node, as both list plugins declare `listItem`. The first declaration wins, so
declare a shared node identically everywhere.

## Checking it

Round-trip your HTML through the renderer in a test, with `parseHtml()` so it is parsed rather than patched:

```php
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

$html = '<div data-variant="warning" class="callout callout-warning" data-type="callout"><p>Mind the gap</p></div>';

expect(RichContentPlusRenderer::make($html)->plugins([CalloutPlugin::make()])->parseHtml()->toHtml())
    ->toBe($html);
```

See [testing plugins](testing.md) for more.

---
title: Global attributes
weight: 40
description: Add an attribute to nodes and marks other plugins own, declared once in PHP for both the server and the browser.
---

A plugin can add an attribute to nodes and marks that other plugins own, such as an alignment on paragraphs and
headings, or an anchor on headings. Declare it once in PHP with `GlobalAttribute`: the server parses and renders it,
and the editor gets a matching TipTap extension generated from the same declaration, so the attribute itself needs no
JavaScript.

## Declaring one

Implement `ProvidesGlobalAttributes`:

```php
use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;

class IndentPlugin extends Plugin implements ProvidesGlobalAttributes
{
    public function getId(): string
    {
        return 'acme/indent';
    }

    public function getGlobalAttributes(): array
    {
        return [
            GlobalAttribute::style('indent', 'padding-left')
                ->types(['paragraph', 'heading'])
                ->values(['1.5rem', '3rem', '4.5rem']),
        ];
    }

    // getJsExtension(), and the tools that set the attribute.
}
```

Stored HTML then carries it as `<p style="padding-left: 3rem">…</p>`, and the document as `attrs.indent`.

The attribute is in the schema, but nothing sets it yet. Give the plugin a tool or menu that does, with a command from
a JS extension of yours, or TipTap's own `updateAttributes`:

```php
use Webwizardsusa\RichEditorPlus\Support\Tool;
use Webwizardsusa\RichEditorPlus\Support\ToolMenuItem;

Tool::make('indent')
    ->label('Indent')
    ->icon('mdi-format-indent-increase')
    ->menu([
        ToolMenuItem::make('none')->label('None')->command('resetAttributes', ['paragraph', 'indent'])->fallback(),
        ToolMenuItem::make('one')->label('One step')
            ->command('updateAttributes', ['paragraph', ['indent' => '1.5rem']])
            ->active(attributes: ['indent' => '1.5rem']),
    ])
    ->block();
```

## The three kinds

| Constructor | Reads and writes |
|---|---|
| `GlobalAttribute::style($name, $property)` | One CSS property of the `style` attribute. Several style attributes on one element are merged into one `style`. |
| `GlobalAttribute::html($name, $attribute)` | A plain HTML attribute, such as `id` or `data-level`. `class` values are merged. |
| `GlobalAttribute::classes($name, ['value' => 'class', …])` | One CSS class per value, such as `has-red-color` for `red`. The document stores the key, the HTML its class. Other classes on the element are left alone. |

`html()` refuses `style`, event handlers (`on*`) and URL or embedding attributes such as `href`, `src` and `srcdoc`.

## Options

| Method | Does |
|---|---|
| `types([...])` | Node and mark names it applies to, or `'*'`, `'nodes'` or `'marks'`. Names the field doesn't have are ignored. Required. |
| `values([...])` | The allowed values, matched without regard to case and stored as listed. |
| `pattern('...')` | A regular expression the whole value must match, without delimiters. It is anchored for you and runs with the `u` flag in PHP and JavaScript, so use syntax both support. |
| `keepOnSplit(false)` | Stops Enter from copying the value to the new block. Values are kept on split by default. |
| `providedByJsExtension()` | For an attribute a TipTap extension you load already declares in the browser: only the server side is generated. |

Rules:

- Every attribute must validate its value with exactly one of `values()` or `pattern()` (`classes()` validates with its
  map). Patterns using syntax JavaScript lacks, such as possessive quantifiers, are refused. Invalid
  values are dropped when content is parsed and when it is rendered, so a stored document can't smuggle CSS or markup
  through.
- Values are strings, the default is `null`, and `null` is not rendered.
- Names are letters, digits and underscores, starting with a letter. A global attribute can't share its name with an
  attribute the node or mark already has, or with another global attribute on the same type.
- `classes()` keys are lower-case letters, digits and hyphens.
- The editor writes `style` values in the browser's normalised form (a colour such as `#F00` is saved as
  `rgb(255, 0, 0)`), and that HTML is parsed again when the field loads. A `style()` pattern must accept that form
  too, or the value is dropped.

## Adding one to an existing plugin

To add an attribute to a plugin you don't own, such as anchors on headings, extend it from a service provider instead
of writing a plugin:

```php
use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginExtension;

RichEditorPlus::extendPlugin('core/heading', fn (PluginExtension $extension) => $extension->addGlobalAttributes([
    GlobalAttribute::html('anchor', 'id')->types(['heading'])->pattern('[A-Za-z][A-Za-z0-9_-]*'),
]));
```

See [extending existing plugins](extending-plugins.md).

## Examples in the package

- `TextAlignPlugin` declares `GlobalAttribute::style('textAlign', 'text-align')` with `values()` from its settings.
- The colour and font plugins declare `GlobalAttribute::classes()` on the `textStyle` mark, one class per palette
  entry.

A global attribute has no Markdown syntax, so a plugin that provides one can't be used on a
[Markdown](../plugins/markdown.md) field.

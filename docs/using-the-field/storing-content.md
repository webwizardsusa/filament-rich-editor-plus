---
title: Storing content
weight: 10
description: Store the field's content as HTML, as a TipTap JSON document, or in a content format such as Markdown.
---

The editor always edits a TipTap document in the browser. What reaches your model depends on the storage format you
choose with `storeAs()`.

| Format | Set with | Column | Model cast |
|---|---|---|---|
| HTML (the default) | nothing, or `storeAs(StateFormat::Html)` | `text` / `longText` | none |
| TipTap JSON | `storeAs(StateFormat::Json)` | `json` | `array` |
| Markdown | `storeAs(MarkdownFormat::make())` | `text` / `longText` | none |

## HTML

HTML is the default, and the right choice for most fields: it renders fast, it can be searched and indexed as it is,
and other tools can read it.

```php
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body');
```

Before it is saved, the HTML is rebuilt on the server from the field's plugins, so it only ever contains the nodes,
marks and attributes those plugins declare. Anything else the browser sends is dropped, and a tag no plugin declares
loses its tag but keeps its text.

## JSON

To store the TipTap document instead, opt in with `StateFormat::Json`:

```php
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\StateFormat;

RichEditorPlus::make('body')->storeAs(StateFormat::Json);
```

Use a `json` column with an `array` cast. The form's state and `getState()` give you the document as an array, and
you can fill the field with an array, a JSON string or HTML.

JSON is useful when you process the document yourself, for example to extract headings for a table of contents. It is
always rendered from the document, never printed as stored.

> [!WARNING]
> Don't call Filament's `->json()` on this field. On `RichEditorPlus` it is only Filament's JSON validation rule, and
> it does not change what is stored.

## Switching between HTML and JSON

Each field reads both. Rows already stored as JSON keep working on an HTML field: they load, render, and are saved as
HTML the next time they are edited. HTML rows on a JSON field are parsed into documents the same way.

## Content formats

A `ContentFormat` stores the content as text in some other format. The package ships one, `MarkdownFormat`:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\MarkdownFormat;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->storeAs(MarkdownFormat::make());
```

The editor still edits a document; the format converts it on the way in and out of the model. Some things to know:

- `storeAs()` takes a `StateFormat`, a `ContentFormat`, or a closure returning either.
- `getContentFormat()` returns the field's `ContentFormat`, or `null`. With a content format, `getStateFormat()` answers
  `StateFormat::Json`, because the browser keeps editing a document.
- A plugin can choose the format itself by implementing `ProvidesContentFormat`, as `MarkdownPlugin::make()->store()`
  does. Only plugins you add with `plugins()` or `addPlugins()` are asked, never the defaults. If a plugin and
  `storeAs()` choose different formats, the field throws.
- A format only allows plugins whose content it can keep. **Default** plugins it can't keep are dropped quietly;
  plugins **you add** that it can't keep make the field throw an `UnsupportedContentFormatException` at boot, naming
  every one of them with the reason.
- A format can hide tools it can't express from every toolbar and the slash menu.
- Saving content the format can't keep fails validation with a message, rather than losing data silently.

See [Markdown](../plugins/markdown.md) for what Markdown keeps, and
[content formats](../writing-plugins/markdown-and-content-formats.md#writing-a-content-format) for writing your own.

## Programmatic content

To write the column yourself, for example in a seeder or an import, give it what the field would store. For an HTML
field, run the HTML through `toStorableHtml()` with the field's plugins, which keeps only what the plugins declare:

```php
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

$post->body = RichContentPlusRenderer::make($importedHtml)
    ->plugins($plugins)
    ->toStorableHtml();
```

This matters because stored HTML is trusted when it is rendered. See
[trusted and untrusted HTML](../displaying-content/rendering.md#trusted-and-untrusted-html).

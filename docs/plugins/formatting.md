---
title: Text formatting and basic blocks
weight: 10
description: Bold, italic, underline, strikethrough, inline code, subscript and superscript, quotes, code blocks, dividers and the trailing paragraph.
---

## Marks

Marks format selected text. The first four are in the default set; the others are optional.

| Plugin | Tool | Shortcut | HTML | Default |
|---|---|---|---|---|
| `BoldPlugin` | `bold` | `Mod-b` | `<strong>` | yes |
| `ItalicPlugin` | `italic` | `Mod-i` | `<em>` | yes |
| `UnderlinePlugin` | `underline` | `Mod-u` | `<u>` | yes |
| `StrikethroughPlugin` | `strikethrough` | `Mod-Shift-s` | `<s>` | yes |
| `CodePlugin` | `code` | `Mod-e` | `<code>` | no |
| `SubscriptPlugin` | `subscript` | `Mod-,` | `<sub>` | no |
| `SuperscriptPlugin` | `superscript` | `Mod-.` | `<sup>` | no |

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\CodePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\SubscriptPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\SuperscriptPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->addPlugins([
    CodePlugin::make(),
    SubscriptPlugin::make(),
    SuperscriptPlugin::make(),
]);
```

- Inline code can't have other marks on the same text, as in TipTap: making code bold removes the bold.
- Subscript and superscript are in the More menu rather than the toolbar. Each replaces the other.
- Pasted HTML keeps its formatting where it can. A `<b>` or a `font-weight: bold` span is read as bold, and a
  `vertical-align: sub` span as subscript.

## Quotes

`BlockquotePlugin` (default) adds a "Quote" block. Several selected paragraphs become one quote. Inside a quote, the
block toolbar has decrease and increase level buttons that lift blocks out of the quote and nest quotes.

## Code blocks

`CodeBlockPlugin` (default) adds a "Code block" block, stored as `<pre><code>`. Text in a code block keeps its
whitespace and has no marks.

A language, when the content has one, is stored as a `language-*` class on the `<code>`:

```html
<pre><code class="language-php">echo 'Hello';</code></pre>
```

The core plugin has no language picker and doesn't highlight code. For both, use the
[Rich Editor Plus Code](docs:rich-editor-plus-code/introduction) plugin, which replaces this one.

## Dividers

`DividerPlugin` (default) adds a "Divider" block, a horizontal rule stored as `<hr>`.

## Trailing paragraph

`TrailingNodePlugin` (optional) keeps an empty paragraph at the end of the document, so there is always somewhere to
type after a table, a code block or an image:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\TrailingNodePlugin;

RichEditorPlus::make('body')->addPlugins([TrailingNodePlugin::make()]);
```

Content that ends with anything other than a paragraph (a heading, list, quote, table or code block) gets a trailing
`<p></p>`. The editor adds it on the first interaction with the content, which can mark a form as changed.

## Paragraphs and line breaks

The document plugin is always present. It provides paragraphs (`<p>`), hard line breaks (`<br>`, with Shift+Enter),
undo and redo, and the "Paragraph" block in the slash menu and block switcher.

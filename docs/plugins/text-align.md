---
title: Text align
weight: 50
description: An alignment menu for paragraphs and headings, stored as an inline text-align style.
---

`TextAlignPlugin` adds an alignment menu to the block toolbar. Every option is shown with its default:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\TextAlignPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->addPlugins([
    TextAlignPlugin::make()
        ->alignments(['left', 'center', 'right', 'justify'])
        ->types(['paragraph', 'heading'])
        ->defaultAlignment('left'),
]);
```

| Option | Does |
|---|---|
| `alignments()` | The alignments on offer, in menu order: any of `left`, `center`, `right` and `justify`. |
| `types()` | The node types that can be aligned. Names the field doesn't have are ignored. |
| `defaultAlignment()` | The alignment text has without the attribute. It must be one of `alignments()`. |

The alignment is stored as an inline style on the block:

```html
<p style="text-align: center">Centred text</p>
```

- The default alignment is never stored: choosing it clears the attribute. On a right-to-left site, use
  `defaultAlignment('right')`.
- The plugin needs at least one alignment besides the default, and throws an `InvalidArgumentException` otherwise.
- Only the configured alignments are kept when content is parsed or rendered, so stored content can't carry any other
  `text-align` value, or any other CSS.
- The menu appears in every block toolbar and is disabled where nothing can be aligned.

## Shortcuts

| Alignment | Shortcut |
|---|---|
| Left | `Mod-Shift-l` |
| Center | `Mod-Shift-e` |
| Right | `Mod-Shift-r` |
| Justify | `Mod-Shift-j` |

Only the configured alignments are bound.

## Markdown

Markdown has no syntax for alignment, so this plugin can't be used on a [Markdown](markdown.md) field.

The plugin is built on a [global attribute](../writing-plugins/global-attributes.md): a good model for a plugin that
adds an attribute to nodes other plugins own.

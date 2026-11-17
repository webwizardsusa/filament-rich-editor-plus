---
title: Coming from Filament's RichEditor
weight: 40
description: How the options of Filament's own RichEditor map to Rich Editor Plus.
---

`RichEditorPlus` is a separate field, not a subclass of Filament's `RichEditor`, so some options have different names.

| `RichEditor` | `RichEditorPlus` |
|---|---|
| `->toolbarButtons([...])` | `->toolbarTools([...])`. See [arranging a toolbar](toolbars.md#arranging-a-toolbar). |
| `->json()` | `->storeAs(StateFormat::Json)`. On this field `->json()` is only Filament's JSON validation rule, so don't call it. |
| `->mentions([...])` | `MentionPlugin`. See [mentions](../plugins/mentions.md). |
| `->getFileAttachmentUrlUsing()` | `ImagePlugin::make()->urlUsing(fn (string $disk, string $path) => ...)` |
| `->saveUploadedFileAttachmentUsing()` | Not supported: the plugins store files themselves. |
| Rendering with `RichContentRenderer` | `RichContentPlusRenderer`. See [rendering](../displaying-content/rendering.md). |

## File attachment settings

Filament's other file attachment settings carry over. The field passes them to `ImagePlugin` and `AttachmentPlugin`
as defaults, and anything set on a plugin wins:

| Field setting | Used by |
|---|---|
| `fileAttachmentsDisk()`, `fileAttachmentsDirectory()`, `fileAttachmentsVisibility()`, `fileAttachmentsMaxSize()` | both plugins |
| `fileAttachmentsAcceptedFileTypes()` | `ImagePlugin` only, since Filament's editor attachments are images |
| `fileAttachments(false)` | turns `ImagePlugin` uploads off, and the field takes no uploads at all |

```php
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')
    ->addPlugins([ImagePlugin::make()])
    ->fileAttachmentsDisk('s3')
    ->fileAttachmentsDirectory('posts');
```

These settings belong to the field, so a renderer outside the form doesn't know them. Give the plugins you render
with the same disk and directory, or set them on the plugins in the first place:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

RichContentPlusRenderer::make($post->body)
    ->plugins(PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [
        ImagePlugin::make()->disk('s3')->directory('posts'),
    ]))
    ->toHtml();
```

## Content

Filament's `RichEditor` and this field both use TipTap, but their plugins are not the same, so stored content may not
match one to one. HTML written by Filament's editor is read like any other HTML: what the field's plugins support is
kept, and anything else loses its tags and keeps its text. Run existing content through
[`toStorableHtml()`](../displaying-content/rendering.md#output) once, with the field's plugins, to normalise it.

---
title: Quick start
weight: 30
description: Add the field to a form, save HTML, and show it on a page.
---

## Add the field

Use `RichEditorPlus` in a form like any other Filament field:

```php
use Filament\Schemas\Schema;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

public static function configure(Schema $schema): Schema
{
    return $schema->components([
        RichEditorPlus::make('body')
            ->required()
            ->columnSpanFull(),
    ]);
}
```

With no other configuration the field has the default plugins: bold, italic, underline, strikethrough, links, quotes,
headings (levels 2 and 3), bulleted and numbered lists, code blocks, dividers, and find and replace. It stores HTML.

## Try the editor

- Select text to see the floating toolbar with the block switcher, the formatting tools and the More menu.
- Type `/` on an empty line for the slash menu, and keep typing to filter it.
- Drag a block by its handle, or move it with Alt+Shift+Up and Alt+Shift+Down.
- Press Alt+F10 to move focus into the toolbar from the keyboard.

## Add a plugin

Optional plugins are added with `addPlugins()`. A table, for example:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->addPlugins([
    TablePlugin::make(),
]);
```

See [plugin sets](using-the-field/plugin-sets.md) for the full list, and for removing or reconfiguring plugins.

## Show the content

To show the content outside the form, render it with the **same plugins the field uses**:

```blade
{!! \Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer::make($post->body)->toHtml() !!}
```

With no `plugins()` call the renderer uses the default set, which matches a field with no plugin configuration. Once
a field adds or removes plugins, define the list once and use it in both places:

```php
namespace App\Support;

use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

class PostEditor
{
    /**
     * The default plugins plus a table.
     */
    public static function plugins(): array
    {
        return PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [
            TablePlugin::make(),
        ]);
    }
}
```

```php
RichEditorPlus::make('body')->plugins(PostEditor::plugins());

RichContentPlusRenderer::make($post->body)->plugins(PostEditor::plugins())->toHtml();
```

Some plugins also need their stylesheet on the page that shows the content, such as colours, images and attachments.
See [displaying content](displaying-content/rendering.md) and [on your own pages](displaying-content/on-your-pages.md).

## Next steps

- [Storing content](using-the-field/storing-content.md): HTML, JSON or Markdown.
- [Toolbars](using-the-field/toolbars.md): floating, fixed, and choosing the tools.
- [Coming from Filament's RichEditor](using-the-field/coming-from-filament.md).

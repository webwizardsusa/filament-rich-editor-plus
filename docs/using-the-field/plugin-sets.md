---
title: Plugin sets
weight: 30
description: Add, remove, replace and configure the plugins a field runs, per field or for every field.
---

Every feature of the editor is a plugin. A field starts from the **default set**, and you change it per field with
`addPlugins()`, `withoutPlugins()` and `plugins()`, or for every field from a service provider.

## Built-in plugins

### Default set

These plugins are on every field unless you remove them. Each has an id, used to remove or extend it.

| Plugin | Class | Id | Adds |
|---|---|---|---|
| Document | `Plugins\Core\DocumentPlugin` | `core/document` | Paragraphs, text, hard breaks, undo and redo. Always present. |
| Bold | `Plugins\Core\BoldPlugin` | `core/bold` | Bold (`Mod-b`) |
| Italic | `Plugins\Core\ItalicPlugin` | `core/italic` | Italic (`Mod-i`) |
| Underline | `Plugins\Core\UnderlinePlugin` | `core/underline` | Underline (`Mod-u`) |
| Strikethrough | `Plugins\Core\StrikethroughPlugin` | `core/strikethrough` | Strikethrough (`Mod-Shift-s`) |
| Link | `Plugins\Core\LinkPlugin` | `core/link` | Links, with a modal. See [links](../plugins/links.md). |
| Quote | `Plugins\Core\BlockquotePlugin` | `core/blockquote` | Block quotes |
| Heading | `Plugins\Core\HeadingPlugin` | `core/heading` | Headings, levels 2 and 3 by default. See [headings](../plugins/headings.md). |
| Bulleted list | `Plugins\Core\BulletListPlugin` | `core/bullet-list` | Bulleted lists |
| Numbered list | `Plugins\Core\OrderedListPlugin` | `core/ordered-list` | Numbered lists |
| Code block | `Plugins\Core\CodeBlockPlugin` | `core/code-block` | Preformatted code blocks |
| Divider | `Plugins\Core\DividerPlugin` | `core/divider` | Horizontal rules |
| Find and replace | `Plugins\Core\FindReplacePlugin` | `core/find-replace` | A find and replace panel. See [find and replace](../plugins/find-and-replace.md). |

All classes are under the `Webwizardsusa\RichEditorPlus` namespace.

### Optional plugins

These ship with the package but are off until you add them.

| Plugin | Class | Id | Adds |
|---|---|---|---|
| Inline code | `Plugins\Core\CodePlugin` | `core/code` | Inline code (`Mod-e`) |
| Subscript | `Plugins\Core\SubscriptPlugin` | `core/subscript` | Subscript (`Mod-,`), in the More menu |
| Superscript | `Plugins\Core\SuperscriptPlugin` | `core/superscript` | Superscript (`Mod-.`), in the More menu |
| Task list | `Plugins\Core\TaskListPlugin` | `core/task-list` | Checkbox lists. See [lists](../plugins/lists.md). |
| Text align | `Plugins\Core\TextAlignPlugin` | `core/text-align` | Alignment for paragraphs and headings. See [text align](../plugins/text-align.md). |
| Text colour | `Plugins\Core\TextColorPlugin` | `core/text-color` | Text colour from a palette |
| Highlight | `Plugins\Core\BackgroundColorPlugin` | `core/background-color` | Background colour from a palette |
| Font | `Plugins\Core\FontFamilyPlugin` | `core/font-family` | Font family from a palette |
| Font size | `Plugins\Core\FontSizePlugin` | `core/font-size` | Font size from a palette |
| Line height | `Plugins\Core\LineHeightPlugin` | `core/line-height` | Line height from a palette |
| Mentions | `Plugins\Core\MentionPlugin` | `core/mention` | `@` mentions and other triggers. See [mentions](../plugins/mentions.md). |
| HTML source | `Plugins\Core\HtmlSourcePlugin` | `core/html-source` | An HTML source modal. See [HTML source](../plugins/html-source.md). |
| Trailing node | `Plugins\Core\TrailingNodePlugin` | `core/trailing-node` | Keeps an empty paragraph at the end of the document |
| Table | `Plugins\Table\TablePlugin` | `webwizardsusa/table` | Tables. See [tables](../plugins/tables.md). |
| Image | `Plugins\Image\ImagePlugin` | `webwizardsusa/image` | Uploaded and linked images. See [images](../plugins/images.md). |
| Attachment | `Plugins\Image\AttachmentPlugin` | `webwizardsusa/attachment` | File attachments. See [attachments](../plugins/attachments.md). |
| Markdown | `Plugins\Markdown\MarkdownPlugin` | `webwizardsusa/markdown` | Markdown storage, paste and source view. See [Markdown](../plugins/markdown.md). |

The colour and font plugins are described together under [colours and fonts](../plugins/colours-and-fonts.md).

## Adding plugins

`addPlugins()` adds plugins to the field's set, whether that is the defaults or a list given to `plugins()`. Each
entry is a plugin instance or a class name:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\CodePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->addPlugins([
    CodePlugin::make(),
    TaskListPlugin::class,
]);
```

A plugin **replaces** one with the same id, in the same position. That is how you configure a default plugin
differently for one field:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\HeadingPlugin;

RichEditorPlus::make('body')->addPlugins([
    HeadingPlugin::make()->levels([2, 3, 4]),
]);
```

## Removing plugins

`withoutPlugins()` removes plugins by id or by class name. A class name also removes its subclasses:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\UnderlinePlugin;

RichEditorPlus::make('body')->withoutPlugins([
    UnderlinePlugin::class,
    'core/find-replace',
]);
```

It applies after `plugins()` and `addPlugins()`. The document plugin is always added back, since every editor needs
paragraphs and text.

Removing a plugin from a field whose stored content uses it has consequences:

- On an **HTML** field, the content loses what the plugin added the next time it is saved. The text of an underlined
  word stays, the `<u>` goes; a heading without the heading plugin becomes a paragraph.
- On a **JSON** field, the editor refuses to load a document that uses a node or mark it no longer has, and shows an
  error instead, so a save can't overwrite the stored content with an empty document.

To hide a tool but keep the feature and its shortcut, use [`toolbarTools()`](toolbars.md#arranging-a-toolbar) instead.

## Replacing the set

`plugins()` replaces the default set with your own list. The document plugin is added if you leave it out:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\LinkPlugin;

RichEditorPlus::make('comment')->plugins([
    BoldPlugin::make(),
    ItalicPlugin::make(),
    LinkPlugin::make(),
]);
```

To build on the defaults rather than start from nothing, merge them:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

$plugins = PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [TablePlugin::make()]);
```

`mergePlugins()` adds plugins to a list, replacing any with the same id. A list built this way is handy when the same
plugins must also go to the [renderer](../displaying-content/rendering.md).

Notes:

- `plugins()`, `addPlugins()` and `withoutPlugins()` each take an array or a closure. Calling one again replaces what
  it was given before; it doesn't add to it.
- Two plugins with the same id in one list throw an `InvalidArgumentException`.
- A plugin can name other plugins it needs by id. A field without them throws a `LogicException` naming the missing
  one.
- Plugins given to `plugins()` count as plugins you chose, so a [content format](storing-content.md#content-formats)
  that can't keep one of them throws instead of dropping it.

## Changing the defaults for every field

From a service provider, `registerDefaultPlugins()` adds plugins to the default set of every field and every renderer
that uses the defaults. A registered plugin replaces a default with the same id:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\CodePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

public function boot(): void
{
    RichEditorPlus::registerDefaultPlugins([
        CodePlugin::class,
        TaskListPlugin::make(),
        fn () => [/* a closure may return one plugin or a list */],
    ]);
}
```

Packages that provide plugins can call it too. Entries are applied in the order they were registered.

## Configuring a plugin everywhere

`configureUsing()` configures every plugin of a class (and its subclasses) as it is made, wherever it is made: in the
default set, in `addPlugins()`, or in a renderer.

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\LinkPlugin;

public function boot(): void
{
    LinkPlugin::configureUsing(fn (LinkPlugin $plugin) => $plugin->openInNewTab(false));
    HeadingPlugin::configureUsing(fn (HeadingPlugin $plugin) => $plugin->levels([2, 3, 4]));
}
```

Settings made on a field afterwards still win, because they are applied to the configured plugin. Only plugins made
with `make()`, or given by class name, are configured; an instance made with `new` is not.

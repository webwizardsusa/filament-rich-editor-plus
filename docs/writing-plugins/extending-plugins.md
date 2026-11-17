---
title: Extending existing plugins
weight: 120
description: Add tools, actions, schema, global attributes and JS to a plugin you don't own, configure it everywhere, or replace it.
---

There are four ways to change a plugin you don't own, from the lightest to the heaviest:

| Want to | Use |
|---|---|
| Change its settings everywhere | `configureUsing()` |
| Add tools, block types, actions, nodes, marks, attributes or JS to it | `RichEditorPlus::extendPlugin()` |
| Change its TipTap extension in the browser | `extendExtension()` in a JS module |
| Change how it works | Subclass it, or write a plugin with the same id to replace it |

## Configuring it everywhere

`configureUsing()` runs a callback on every plugin of a class (and its subclasses) as it is made:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\LinkPlugin;

LinkPlugin::configureUsing(fn (LinkPlugin $plugin) => $plugin->allowedClasses(['button']));
```

Settings made on a field afterwards still win. See [configuring a plugin everywhere](../using-the-field/plugin-sets.md#configuring-a-plugin-everywhere).

## Adding to a plugin

`RichEditorPlus::extendPlugin()` adds to an existing plugin without subclassing it. Call it from a service provider,
with the plugin's id or class. The callback gets a `PluginExtension` to add to, and the plugin itself:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

public function boot(): void
{
    RichEditorPlus::extendPlugin('core/document', function (PluginExtension $extension, EditorPlugin $plugin): void {
        $extension->addTool(
            Tool::make('clearFormatting')
                ->label('Clear formatting')
                ->icon('mdi-format-clear')
                ->command('unsetAllMarks')
                ->overflow(),
        );
    });
}
```

`PluginExtension` collects:

| Method | Adds |
|---|---|
| `addTool($tool)`, `addTools([...])` | Toolbar tools |
| `addBlockType($blockType)`, `addBlockTypes([...])` | Block types |
| `addActions([...])` | Filament actions |
| `addNodes([...])`, `addMarks([...])` | `NodeSpec`s and `MarkSpec`s for the server |
| `addGlobalAttributes([...])` | [Global attributes](global-attributes.md), such as an `id` on headings |
| `addModule($url)` | An ES module loaded with the plugin, typically one that calls `extendExtension()` |

What you add counts as part of the plugin: it is on every field that has the plugin, removed with it by
`withoutPlugins()`, and ignored on fields that don't have it. Tools you add follow the same rules as the plugin's own,
including [reserved names](tools-and-block-types.md#reserved-names).

The callback runs each time a field or renderer builds its plugin registry, which is often, so keep it cheap and
don't let it fail when it runs twice. You may also call methods on the plugin it gets, as long as they can run
repeatedly: `MentionPlugin::addProviders()` exists for exactly that.

> [!NOTE]
> A node or mark added this way needs a TipTap extension in the browser too: add a module with `addModule()` that
> registers or extends one.

## Changing another plugin's JS

To change one of the editor's TipTap extensions, decorate it with `extendExtension()` from a JS module, rather than
registering a second copy:

```js
export default function ({ extendExtension }) {
    extendExtension('core/code-block', (extension, { options, tiptap }) =>
        extension.extend({
            addKeyboardShortcuts() {
                return {
                    ...this.parent?.(),
                    Tab: () => this.editor.commands.insertContent('    '),
                }
            },
        }),
    )
}
```

- The id is the plugin's **JS extension id**, the one its `JsExtension::make()` uses.
- The decorator runs on every extension that plugin's factory produces. Some produce several (the bulleted list
  plugin returns the list, the list item and a keymap), so check `extension.name` when you mean one of them.
- It gets the extension and `{ options, tiptap }`, and returns the extension to use, or nothing to keep it.
- Several decorators for one id run in the order they were registered.

Load the module with the plugin it changes:

```php
RichEditorPlus::extendPlugin('core/code-block', fn (PluginExtension $extension) => $extension->addModule(
    MyServiceProvider::moduleUrl(),
));
```

## Replacing a plugin

A plugin with the same id as another replaces it when added to a field (`addPlugins()`) or to the defaults
(`registerDefaultPlugins()`). Subclass the original to keep most of it:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\HeadingPlugin;

class AnchoredHeadingPlugin extends HeadingPlugin
{
    public function getNodes(): array
    {
        // ...
    }
}
```

```php
RichEditorPlus::registerDefaultPlugins([AnchoredHeadingPlugin::class]);
```

Because the id stays `core/heading`, content stored before keeps working, and `withoutPlugins(['core/heading'])` and
`extendPlugin('core/heading', …)` still apply. Keep the node and mark names, and accept the HTML the original wrote.

A plugin that replaces a core plugin but brings its own JS keeps the plugin id and registers its JS under a new
JS extension id, as the [Rich Editor Plus Code](docs:rich-editor-plus-code/introduction) plugin does for
`core/code-block`.

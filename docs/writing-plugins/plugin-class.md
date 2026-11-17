---
title: The plugin class
weight: 20
description: The Plugin base class and the EditorPlugin contract every plugin implements.
---

A plugin is a class implementing `Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin`. Extend the abstract
`Webwizardsusa\RichEditorPlus\Plugins\Plugin`, which implements the contract with empty defaults, so you only write
what your plugin has.

The smallest plugin, a `<kbd>` mark with a toolbar button, from the
[example plugin](docs:rich-editor-plus-example/introduction):

```php
namespace Acme\Keyboard;

use Webwizardsusa\RichEditorPlus\Content\MarkSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

class KeyboardPlugin extends Plugin
{
    protected string $shortcut = 'Mod-Shift-k';

    public function shortcut(string $shortcut): static
    {
        $this->shortcut = $shortcut;

        return $this;
    }

    public function getId(): string
    {
        return 'acme/keyboard';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('keyboard')->parseTags(['kbd'])->excludes(['code'])->renderTag('kbd'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), ['shortcut' => $this->shortcut])
            ->module(KeyboardServiceProvider::moduleUrl());
    }

    public function getTools(): array
    {
        return [
            Tool::make('keyboard')
                ->label(__('acme-keyboard::plugin.label'))
                ->icon('mdi-keyboard-outline')
                ->shortcut($this->shortcut)
                ->command('toggleKeyboard')
                ->active('keyboard')
                ->inline()
                ->group('format')
                ->order(70),
        ];
    }
}
```

Passing the shortcut to the JS as an option keeps the key the editor binds and the key the tooltip shows in step.

## The contract

| Method | Default in `Plugin` | Returns |
|---|---|---|
| `getId()` | (required) | A unique id, such as `acme/keyboard` |
| `getDependencies()` | `[]` | Ids of plugins that must be on the field too |
| `getPriority()` | `100` | Registration order: lower numbers first |
| `getNodes()` | `[]` | `NodeSpec`s for the server. See [schema](schema.md). |
| `getMarks()` | `[]` | `MarkSpec`s for the server |
| `getJsExtension()` | (required) | The `JsExtension` the browser loads |
| `getTools()` | `[]` | Toolbar `Tool`s. See [tools and block types](tools-and-block-types.md). |
| `getBlockTypes()` | `[]` | `BlockType`s for the slash menu and block switcher |
| `getActions()` | `[]` | Filament `Action`s, such as modals. See [actions](actions.md). |
| `getEditorHtml()` | `null` | Markup rendered once inside the editor, for a panel your JS binds |

### Ids

The id identifies the plugin everywhere: in `withoutPlugins()`, in `extendPlugin()`, as a dependency, and in editor
requests from the browser. Prefix it with your vendor (`acme/…`); `core/…` and `webwizardsusa/…` are the package's
own.

A plugin with the **same id as another replaces it** when added to a field. That is how a plugin takes over a built-in
feature: the [Rich Editor Plus Code](docs:rich-editor-plus-code/introduction) plugin keeps the id `core/code-block`, so
adding it swaps out the core code block, and content stored before keeps working.

### The JS extension

`getJsExtension()` returns a `JsExtension`: an id the browser looks up in its extension registry, and options for the
factory registered under that id. Options must be JSON-serializable.

```php
JsExtension::make('acme/keyboard', ['shortcut' => 'Mod-Shift-k'])
    ->module(KeyboardServiceProvider::moduleUrl());
```

`module()` adds the URL of an ES module the browser imports before it builds the editor; see
[assets](assets.md). The JS id usually equals the plugin id, but doesn't have to: a plugin that replaces a core plugin
keeps the core id and registers its JS under an id of its own.

> [!IMPORTANT]
> The editor refuses to start, and shows an error naming the plugin, when a JS extension id has no registered
> factory. Starting without a plugin's schema would make ProseMirror drop its content, which a save would persist.

### Dependencies and priority

`getDependencies()` lists ids of plugins yours can't work without. A field missing one throws a `LogicException`:
"The editor plugin [acme/table-caption] requires [webwizardsusa/table], which is not registered."

`getPriority()` orders plugins, lowest first. The order decides which extension the browser registers first, which
plugin's render hooks run first, and the order of global attributes. The document plugin has `0`; everything else
defaults to `100`. Toolbar order is set per tool with `order()`, not by priority.

### Editor HTML

`getEditorHtml()` returns markup rendered once inside each editor, for a panel or popover your JS finds and binds, as
the find and replace panel does. It is printed as it is, so escape everything you put in it, and it isn't rendered on a
disabled field.

## Settings

Give your plugin fluent setters, like the built-ins, and read them in the `get…()` methods. Every method is called
each time a field builds its plugin registry, which happens on every render and request, so keep them cheap and free
of side effects.

```php
KeyboardPlugin::make()->shortcut('Mod-Alt-k');
```

### `make()` and `configureUsing()`

`Plugin::make()` resolves the plugin from the container, so constructor dependencies are injected, and then applies
any `configureUsing()` callbacks registered for its class or a parent class:

```php
KeyboardPlugin::configureUsing(fn (KeyboardPlugin $plugin) => $plugin->shortcut('Mod-Alt-k'));
```

Apps use this to set defaults for your plugin everywhere. A class name given to `addPlugins()` is resolved with
`make()` too.

### Validating settings

Settings end up in the browser and in rendered HTML, so check them. The built-in plugins throw an
`InvalidArgumentException` with a clear message from the getters that use a bad setting, so a misconfigured field
fails when it boots rather than producing broken content:

```php
public function getNodes(): array
{
    if ($this->variants === []) {
        throw new InvalidArgumentException('CalloutPlugin needs at least one variant.');
    }

    // ...
}
```

### Translations

Labels come from your package's own translation files, loaded with `hasTranslations()` in the service provider:
`__('acme-keyboard::plugin.label')`.

## Optional contracts

A plugin implements more interfaces for more abilities:

| Interface | Page |
|---|---|
| `ProvidesGlobalAttributes` | [Global attributes](global-attributes.md) |
| `AnswersEditorRequests`, `AcceptsEditorUploads`, `InheritsFieldFileAttachments` | [Server requests and uploads](server-requests-and-uploads.md) |
| `PreparesRenderedContent`, `PatchesRenderedHtml`, `PatchesRenderedMarkup`, `TransformsRenderedHtml`, `ProvidesEditorStyles` | [Render hooks](render-hooks.md) |
| `ChecksFieldPlugins` | [Below](#checking-the-other-plugins) |
| `ProvidesMarkdownRules`, `ProvidesContentFormat` | [Markdown and content formats](markdown-and-content-formats.md) |

All of them are in `Webwizardsusa\RichEditorPlus\Plugins\Contracts`, except `ProvidesMarkdownRules`, which is in
`Webwizardsusa\RichEditorPlus\Plugins\Markdown\Contracts`.

### Checking the other plugins

A plugin that only works with certain other plugins, or not with some, implements `ChecksFieldPlugins`. The field
calls `checkFieldPlugins()` with its final plugin list each time it builds its registry; throw to refuse the set. The
renderer doesn't call it.

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ChecksFieldPlugins;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;

class CaptionPlugin extends Plugin implements ChecksFieldPlugins
{
    public function checkFieldPlugins(array $plugins): void
    {
        $ids = array_map(fn (EditorPlugin $plugin): string => $plugin->getId(), $plugins);

        if (! in_array('webwizardsusa/image', $ids, true) && ! in_array('webwizardsusa/table', $ids, true)) {
            throw new LogicException('CaptionPlugin needs ImagePlugin or TablePlugin on the same field.');
        }
    }
}
```

For a plain "requires X", use `getDependencies()` instead. The Markdown plugin uses this check to refuse a source
view on a field whose plugins have no Markdown form.

---
title: Headings
weight: 30
description: Choose which heading levels a field offers.
---

`HeadingPlugin` is in the default set, with levels 2 and 3. Each level is a block type in the slash menu and the
block switcher ("Heading 2", "Heading 3"), and typing `## ` at the start of a line makes a level 2 heading.

## Levels

Choose the levels with `levels()`, from 1 to 6:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->addPlugins([
    HeadingPlugin::make()->levels([2, 3, 4]),
]);
```

Level 1 is left out by default because a page usually has its own `<h1>`, such as the post's title.

- The first level in the list is the default for content that names none.
- Stored content with a level the field doesn't offer is rendered at the first level in the list. An `<h1>` on a field
  with levels 2 and 3 matches no rule, so it loses its heading (and keeps its text) when the field next saves.
- On a [Markdown](markdown.md) field, headings outside the field's levels move to the nearest level when the content is
  read.

To offer the same levels on every field:

```php
HeadingPlugin::configureUsing(fn (HeadingPlugin $plugin) => $plugin->levels([2, 3, 4]));
```

## Anchors

The plugin doesn't add `id` attributes. To let headings carry an anchor, extend the plugin with a global attribute
from a service provider:

```php
use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginExtension;

RichEditorPlus::extendPlugin('core/heading', fn (PluginExtension $extension) => $extension->addGlobalAttributes([
    GlobalAttribute::html('anchor', 'id')->types(['heading'])->pattern('[A-Za-z][A-Za-z0-9_-]*'),
]));
```

The attribute is kept when content is parsed and rendered, but the editor has no UI for it. See
[global attributes](../writing-plugins/global-attributes.md).

---
title: Tools and block types
weight: 50
description: Toolbar buttons, menus and More menu items with Tool and ToolMenuItem, and slash menu entries with BlockType.
---

A **tool** is a button that acts on content: bold, add a table row, open the link modal. A **block type** is a kind of
content: a paragraph, a heading, a callout. Plugins return them from `getTools()` and `getBlockTypes()`.

## Tools

```php
use Webwizardsusa\RichEditorPlus\Support\Tool;

public function getTools(): array
{
    return [
        Tool::make('keyboard')
            ->label(__('acme-keyboard::plugin.label'))
            ->icon('mdi-keyboard-outline')
            ->shortcut('Mod-Shift-k')
            ->command('toggleKeyboard')
            ->active('keyboard')
            ->inline()
            ->group('format')
            ->order(70),
    ];
}
```

A tool either runs a TipTap command, opens a Filament action, or opens a menu.

| Method | Does |
|---|---|
| `make($name)` | The tool's name, used in `toolbarTools()` arrangements and in the browser. Unique per field. |
| `label()` | The button's accessible name and tooltip. |
| `icon()` | A Blade icon name. The package ships [Material Design Icons](https://pictogrammers.com/library/mdi/) as `mdi-*`; Filament's `heroicon-*` work too. |
| `shortcut()` | The shortcut shown in the tooltip, in TipTap's notation (`Mod-b`, `Mod-Shift-s`). It only labels the button: your JS extension binds the key. |
| `command($name, $arguments)` | The TipTap chain command to run, such as `toggleBold`, with its arguments. |
| `action($name)` | Opens the named Filament action instead, registered in `getActions()`. See [actions](actions.md). |
| `active($name, $attributes)` | When the button shows as pressed: TipTap's `isActive($name, $attributes)`. With no name, the attributes alone are checked. |
| `inline()`, `block()`, `overflow()` | Where the tool goes. See [scopes](#scopes). |
| `nodes([...])` | For a block tool, the node types whose toolbar shows it. `['*']`, the default, means every block. |
| `group()` | Tools are drawn in `order()`, with a divider wherever the group changes. |
| `order()` | Display order, lowest first. |
| `disableWhenUnavailable()` | Greys the button out while its command can't run. The browser checks `can()` after every change, so use it only for commands that often can't run at the cursor. |
| `hideInListItem()` | Hides the button while the cursor is in a list item. |
| `showWithCursor()` | Shows the toolbar holding this tool with only a cursor in its block. Toolbars otherwise wait for a selection, so this is for tools that act on where the cursor is, such as adding a table row. |
| `availableWhileReadOnly()` | Keeps the tool usable while the editor is read-only, for tools that change the view rather than the content, such as a source view. Every other tool is disabled then. |

The built-in inline tools use orders 10 (bold) to 72 (line height); pick an order to place yours among them. Every
setter takes a plain value, not a closure: the plugin's settings decide what it returns.

### Scopes

`Webwizardsusa\RichEditorPlus\Support\ToolScope` has three cases:

| Scope | Shown in | For |
|---|---|---|
| `ToolScope::Inline` (`inline()`, the default) | The formatting group of every toolbar | Acting on the selected text |
| `ToolScope::Block` (`block()`) | The `blockTools` slot of the toolbar on the matching `nodes()` | Acting on the whole block |
| `ToolScope::Overflow` (`overflow()`) | The More menu | Commands that aren't about one block |

An overflow tool must have a `command()` (run with no arguments) or an `action()`; one with neither is left out.

### Active state from the extension

A tool's active state can also come from its extension's storage: when `editor.storage[name].isActive` is a boolean,
for the name given to `active()`, it is used instead of `isActive()`. That suits tools that toggle a view rather than
a mark or node, like the Markdown source view.

### Reserved names

These names belong to the toolbar's own controls, and a plugin that names a tool after one throws an
`InvalidArgumentException`: `dragHandle`, `blockSwitcher`, `moveUp`, `moveDown`, `listOptions`, `blockTools`, `more`
(the `ToolbarControl` enum).

## Menu tools

A tool with `menu()` opens a list of items instead of running a command of its own. Its button shows the current
item's icon, and its accessible name the current item's label through `currentLabel()`:

```php
use Webwizardsusa\RichEditorPlus\Support\Tool;
use Webwizardsusa\RichEditorPlus\Support\ToolMenuItem;

Tool::make('calloutVariant')
    ->label('Callout style')
    ->icon('mdi-information-outline')
    ->currentLabel('Callout style: :item')
    ->menu([
        ToolMenuItem::make('info')
            ->label('Info')
            ->icon('mdi-information-outline')
            ->command('setCalloutVariant', ['info'])
            ->active('callout', ['variant' => 'info']),
        ToolMenuItem::make('warning')
            ->label('Warning')
            ->icon('mdi-alert-outline')
            ->command('setCalloutVariant', ['warning'])
            ->active('callout', ['variant' => 'warning']),
    ])
    ->block()
    ->nodes(['callout'])
    ->showWithCursor();
```

The rules, each checked when the field builds its registry:

- A menu tool has no `command()` or `action()` of its own; its items run.
- A menu needs at least one item.
- Menu tools can be inline or block tools, but not in the More menu.

`ToolMenuItem` has `label()`, `icon()`, `shortcut()` (a hint shown in the menu), `command()` and `active()`, as on a
tool, plus:

| Method | Does |
|---|---|
| `swatch($class, $text = null)` | Shows a small box styled by the class (a palette colour, say) instead of an icon, with optional text such as `'A'`. |
| `fallback()` | Marks the item that is current when no other item is active, such as "Default" in a colour menu, whose "no value" state `active()` can't express. |

## Block types

A block type puts your block in the slash menu, and optionally in the block switcher:

```php
use Webwizardsusa\RichEditorPlus\Support\BlockType;

public function getBlockTypes(): array
{
    return [
        BlockType::make('callout-info')
            ->label('Info callout')
            ->description('A highlighted note')
            ->icon('mdi-information-outline')
            ->keywords(['callout', 'note', 'notice'])
            ->node('callout', ['variant' => 'info'])
            ->command('setCallout', [['variant' => 'info']])
            ->switchable()
            ->multiBlock()
            ->order(60),
    ];
}
```

| Method | Does |
|---|---|
| `make($name)` | A name unique on the field. Two block types with one name throw. |
| `label()`, `description()`, `icon()` | How it appears in the slash menu. The switcher shows the label and icon. |
| `keywords([...])` | Extra words the slash menu matches, besides the label. |
| `node($name, $attributes)` | The top-level node and attributes that identify this block in a document, so the switcher knows which block the cursor is in. |
| `command($name, $arguments)` | The TipTap command that turns the current block into this one, or inserts it. |
| `action($name)` | Opens a Filament action instead, for blocks that need input first, such as a table's size. |
| `switchable()` | Shows it in the block switcher, so other blocks can be switched to it and from it. Needs a `node()`. |
| `listType()` | Offers it in the list button's menu, to switch a list to it in place. Its node must hold `listItem`s, and it needs a `node()`. |
| `multiBlock()` | Offers it in the switcher when several paragraphs are selected. Its command must turn the whole selection into one block, as wrapping commands do. |
| `order()` | Position in the slash menu and switcher, lowest first. |

A block type needs a `command()` or an `action()`, and throws otherwise.

The built-in orders: paragraph 0, headings 11 to 16, lists 20 to 22, quote 30, code block 40, divider 50, and 60 for
tables, images and find and replace.

### Container blocks

A node that holds other blocks the way a quote does, such as the callout (`content: 'block+'`), should join the
`container` group in its TipTap extension: `group: 'block container'`. The editor then treats it like a quote:

- the slash menu opens in paragraphs inside it,
- "Select parent" in the More menu stops at it,
- the decrease and increase level commands (`decreaseBlockLevel`, `increaseBlockLevel`) lift blocks out of it and nest
  it, with the same attributes.

Give its block type `multiBlock()` and a wrapping command, such as one that runs `wrapIn()`, so several selected
paragraphs become one block. The level buttons only show if your plugin adds them as block tools, so a container that
shouldn't nest can leave them out.

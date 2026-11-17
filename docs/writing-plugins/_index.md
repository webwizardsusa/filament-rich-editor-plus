---
title: Writing plugins
weight: 80
---

Everything the editor does comes from plugins, and yours use the same API as the built-in ones. A plugin can add a
mark, a block, a toolbar tool with a Filament modal, data fetched from the server while editing, file uploads,
render-time lookups, or a Markdown form for its content.

## The two halves of a plugin

A plugin that adds content lives on both sides:

- **PHP**, a class extending `Webwizardsusa\RichEditorPlus\Plugins\Plugin`. It declares the nodes and marks for the
  server (how they are parsed from HTML and rendered back), the TipTap extension the browser must load, its tools and
  block types, and any Filament actions. The server only ever outputs what plugins declare.
- **JavaScript**, an ES module your package ships. It registers the TipTap extension under an id, builds it with the
  options PHP passes, and uses the editor's own copy of TipTap. The editor loads the module only on fields that use the
  plugin.

The two must agree on names, tags and attributes: a node the browser creates but PHP doesn't declare loses its tag
when the content is saved or rendered.

Some plugins have no JavaScript at all: a plugin that only adds a [global attribute](global-attributes.md), a tool
running a command an existing extension already has, or a Filament action. Such a plugin returns no JS extension and
ships no module. See [plugins with nothing to add in the browser](javascript.md#plugins-with-nothing-to-add-in-the-browser).

## A working example

The [Rich Editor Plus example plugin](docs:rich-editor-plus-example/introduction) is a complete package with a mark
(a `<kbd>` keyboard key) and a block (a callout box with variants), its own JS module, a Vite build with hot reload,
and tests. These pages refer to it throughout; it is the quickest way to start a plugin package of your own.

## Where to start

1. [Package skeleton](package-skeleton.md): the files a plugin package has.
2. [The plugin class](plugin-class.md): ids, dependencies, priority and the `EditorPlugin` contract.
3. [Schema](schema.md): declaring nodes and marks with `NodeSpec` and `MarkSpec`.
4. [Tools and block types](tools-and-block-types.md): toolbar buttons, menus, and slash menu entries.
5. [The JavaScript module](javascript.md): registering TipTap extensions, and building without a second copy of TipTap.
6. [Assets](assets.md): registering the built files, lazy loading and the dev server.

Then, as your plugin needs them:

- [Global attributes](global-attributes.md): add an attribute to nodes other plugins own.
- [Actions](actions.md): Filament modals that send commands back to the editor.
- [Server requests and uploads](server-requests-and-uploads.md): ask the server from the editor, and take files.
- [Render hooks](render-hooks.md): fill in data at render time, rewrite rendered HTML, and editor CSS.
- [Markdown and content formats](markdown-and-content-formats.md): a Markdown form for your content, or a new storage
  format.
- [Extending existing plugins](extending-plugins.md): add to a plugin you don't own.
- [Testing plugins](testing.md).

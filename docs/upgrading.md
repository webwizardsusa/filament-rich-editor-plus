---
title: Upgrading
weight: 90
description: What to do after updating the package, and changes that need action.
---

## After every update

Publish the new assets, or the browser keeps running the old editor:

```bash
php artisan filament:assets
```

Adding it to your `post-autoload-dump` scripts does this for you; see [installation](installation.md#install-the-package).

If you ship a plugin package with its own JavaScript, rebuild it against the editor's current TipTap major version (3).
The browser console warns when a plugin's bundle expects an export the editor's shared TipTap doesn't have.

## Assets moved to `webwizardsusa/filament-rich-editor-plus`

The editor's assets, and those of its table, image and Markdown plugins, are now registered under the Composer package
name, `webwizardsusa/filament-rich-editor-plus`, so Filament versions their URLs by the installed release and browsers
fetch the new files after each update. Before, they were registered as `webwizardsusa/rich-editor-plus`, which Filament
couldn't find a version for, so the URLs kept Filament's own version and browsers could keep a cached old editor.

Run `php artisan filament:assets` after updating, as after every update. The files now go to
`public/js/webwizardsusa/filament-rich-editor-plus` and `public/css/webwizardsusa/filament-rich-editor-plus`. The old
`public/js/webwizardsusa/rich-editor-plus` and `public/css/webwizardsusa/rich-editor-plus` directories are no longer
used and can be deleted; if you commit published assets, commit the move.

## Plugins without JavaScript

`getJsExtension()` may now return `null`, and `Plugin` does so by default, for a plugin with nothing to add in the
browser. A plugin that shipped a module only to call `registerExtension(id, () => [])` can drop both the module and its
`getJsExtension()`. See [plugins with nothing to add in the browser](writing-plugins/javascript.md#plugins-with-nothing-to-add-in-the-browser).

Plugins that return a `JsExtension` keep working unchanged. Code that calls `getJsExtension()` on plugins it didn't
write should allow for `null`.

## `AcceptsEditorUploads` has a method

The `AcceptsEditorUploads` contract used to be a marker interface with no methods. It now has one,
`acceptsEditorUploads(): bool`, which lets a plugin turn uploads off through its own settings. An existing
implementation must add it; return `true` to keep accepting uploads:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AcceptsEditorUploads;

class MyUploadPlugin extends Plugin implements AcceptsEditorUploads
{
    public function acceptsEditorUploads(): bool
    {
        return true;
    }
}
```

A plugin whose `acceptsEditorUploads()` returns `false` counts as one without the contract: if no other plugin on the
field takes uploads, the field refuses them. See [server requests and uploads](writing-plugins/server-requests-and-uploads.md#taking-uploads).

## Changelog

Each release's changes are listed in the package's
[CHANGELOG](https://github.com/webwizardsusa/filament-rich-editor-plus/blob/main/CHANGELOG.md).

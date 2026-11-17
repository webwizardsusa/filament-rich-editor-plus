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

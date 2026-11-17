---
title: Links
weight: 20
description: Configure the link plugin's protocols, new-tab default, autolinking and allowed classes.
---

`LinkPlugin` is in the default set. Its `link` tool opens a modal to add, edit or remove the link at the selection,
with a URL and an "open in new tab" checkbox. With only a cursor inside a link, the modal edits the whole link.

## Options

To change the plugin for one field, add it again with your settings. Every option is shown with its default:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Core\LinkPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')->addPlugins([
    LinkPlugin::make()
        ->protocols(['http', 'https', 'mailto', 'tel'])
        ->defaultProtocol('https')
        ->openInNewTab()
        ->autolink()
        ->allowedClasses([]),
]);
```

| Option | Does |
|---|---|
| `protocols()` | The URL schemes a link may use. Relative URLs are always allowed. A link with any other scheme keeps only its text, and the modal refuses it. |
| `defaultProtocol()` | The scheme added to a link typed without one, such as `example.com`. |
| `openInNewTab()` | Whether new links open in a new tab. The modal's checkbox starts checked, and editors can change it per link. |
| `autolink()` | Whether typed and pasted URLs become links on their own. |
| `allowedClasses()` | The classes a link may keep. None by default. |

To change the defaults for every field, configure the plugin from a service provider:

```php
LinkPlugin::configureUsing(fn (LinkPlugin $plugin) => $plugin->openInNewTab(false));
```

## What links keep

Stored content comes from the browser, so link attributes are checked whenever content is saved, parsed, or rendered
from a document:

- `href` must use one of the `protocols()`, or be relative. `javascript:` and similar never get through, even with
  spaces or control characters hidden inside the scheme.
- `class` keeps only the names given to `allowedClasses()`, so content can't borrow your site's utility classes
  (`fixed inset-0 z-50`, for example) to lay a link over the page.
- `target` is kept only when it is `_blank` or `_self`.
- A link that opens in a new tab always gets `rel="noopener"`, and `opener` is never kept, so the page it opens can't
  reach back to yours. New links that open in a new tab get `rel="noopener noreferrer nofollow"`.
- `title` is kept as it is.

A rendered link looks like this:

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">Example</a>
```

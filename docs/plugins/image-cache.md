---
title: Image Cache
weight: 115
description: Store images as Laravel Image Cache Images, each shown in an Image Style picked in the editor, and track the Images content uses.
---

With `imageCache()`, the [image plugin](images.md) stores images as [Laravel Image Cache](docs:laravel-image-cache/introduction)
Images instead of plain files:

- Images uploaded in the modal, or pasted and dropped into the editor, become Images.
- Each image in content is a **Placement**: the Image, the **Image Style** it's shown in, and its own alt text,
  caption, alignment and width. Editors pick the style in the modal.
- Content stores the Image's ULID and the style's name, never a file path or URL. The URL is the Variant's, worked out
  when content is shown, with every Image on the page loaded in one query.
- Models can report the Images their content places, so Images no longer placed anywhere are pruned.

Images stored before by disk and path, and images linked by URL, keep working.

## Setup

Install Laravel Image Cache, publish its config and migration, and register your Image Styles:

```bash
composer require webwizardsusa/laravel-image-cache
php artisan vendor:publish --tag=image-cache-config
php artisan vendor:publish --tag=image-cache-migrations
php artisan migrate
```

Then opt in on the field, and render content with the same plugin settings:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;

RichEditorPlus::make('body')->addPlugins([
    ImagePlugin::make()->imageCache(['banner', 'card', 'thumb'], default: 'banner'),
]);
```

Calling `imageCache()` without Laravel Image Cache installed throws an exception that names the package. Fields that
don't call it never use it.

## Options

| Option | Default | What it does |
|---|---|---|
| `imageCache($styles, default: $style)` | Off | Turns Image Cache on. `$styles` are the Image Style names editors pick from (every registered style when null); `default` is the style new images are placed in (the first when null), and the one a Placement with an unknown style is shown in. |
| `privateImages()` | Off | Stores uploads as private Images, shown through temporary URLs. |
| `imageQueryUsing(fn (Builder $query) => …)` | None | Narrows the Images a Placement may show. |

Uploads are stored with `Image::store()` in the plugin's `directory()` (`editor-images` by default), on the disk
Laravel Image Cache uses for their Visibility. The plugin's `disk()` and `visibility()` options apply only to images
stored by disk and path.

> [!WARNING]
> A private Image's URL is temporary (`image-cache.private.url_ttl`, 5 minutes by default). Rendered HTML with
> private Images stops showing them once the URLs expire, so don't cache it for longer than that.

## Which Images a Placement shows

Content is saved from the browser, so a Placement could name any Image. A Placement is only shown when its Image:

- is in the plugin's `directory()`,
- has the field's Visibility (public, or private with `privateImages()`),
- and is allowed by `imageQueryUsing()`, when it's set.

Otherwise the image renders without a `src`. Give each tenant a directory of its own, or scope Images with
`imageQueryUsing()`:

```php
ImagePlugin::make()
    ->imageCache()
    ->directory(fn (): string => 'editor-images/'.auth()->user()->team_id)
    ->imageQueryUsing(fn (Builder $query) => $query->where('team_id', auth()->user()->team_id));
```

## In the editor

The modal adds an **Image style** select beside the alignment and width. The style decides the file that's served
(its size and format); the width decides how wide it's laid out. Editing an image keeps its Image unless a new file
is uploaded. Pasted and dropped images are placed in the default style, and the modal opens for their alt text.

## What content stores

```html
<figure class="rep-image" data-type="image" data-image="01jqz…" data-style="banner" data-align="center" data-width="100">
    <img alt="A cat">
    <figcaption>Our cat</figcaption>
</figure>
```

When content is shown, the `img` gets the URL of the Image's Variant in that style: its disk URL once the Variant
exists, or Laravel Image Cache's route, which generates it, until then. Render many pieces of content with
`RichContentPlusRenderer::many()` to load all of their Images in one query.

## Tracking the Images content uses

`ImageCacheContent::imagesIn()` reads the ULIDs of the Images placed in stored HTML. Return them from a model's
`referencedImages()`, with Laravel Image Cache's `TracksImageUsage` trait:

```php
use Webwizardsusa\ImageCache\Concerns\TracksImageUsage;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImageCache\ImageCacheContent;

class Post extends Model
{
    use TracksImageUsage;

    public function referencedImages(): iterable
    {
        return ImageCacheContent::imagesIn($this->body);
    }
}
```

Saving a post records the Images it places. An Image removed from every post becomes Orphaned, and
`image-cache:prune` deletes it after the grace period. Reading ULIDs needs Laravel Image Cache 0.2 or later.

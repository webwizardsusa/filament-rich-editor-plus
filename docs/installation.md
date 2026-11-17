---
title: Installation
weight: 20
description: Install the package, publish its assets, and prepare a database column for the content.
---

## Install the package

```bash
composer require webwizardsusa/filament-rich-editor-plus
php artisan filament:assets
```

The service provider is discovered automatically. `filament:assets` copies the editor's JavaScript and CSS into
`public/`, where Filament loads them from.

> [!IMPORTANT]
> Run `php artisan filament:assets` again after every update of the package, or the browser keeps running the old
> editor against the new server code.

The simplest way to never forget is to add it to the `post-autoload-dump` scripts in your app's `composer.json`:

```json
"post-autoload-dump": [
    "Illuminate\\Foundation\\ComposerScripts::postAutoloadDump",
    "@php artisan package:discover --ansi",
    "@php artisan filament:assets"
]
```

The editor's own JavaScript loads only on pages that show the field. The optional table, image and Markdown plugins
ship their JavaScript as separate modules, which load only on fields that use them.

## Prepare a column

The field stores **HTML** by default. Use a text column for it:

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->longText('body')->nullable();
    $table->timestamps();
});
```

To store the TipTap JSON document instead, use a `json` column, cast it to `array` on the model, and opt in on the
field with `storeAs(StateFormat::Json)`:

```php
$table->json('body')->nullable();
```

```php
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected function casts(): array
    {
        return ['body' => 'array'];
    }
}
```

A field that stores Markdown also uses a `text` or `longText` column. See
[storing content](using-the-field/storing-content.md) for how to choose between the formats.

## Uploads

The image and attachment plugins store uploaded files on a Laravel disk, `public` by default. If you use the `public`
disk, create the storage link once:

```bash
php artisan storage:link
```

See [images](plugins/images.md#where-images-are-stored) for private disks, S3 and CDNs.

## Translations

The package ships English strings for every label, message and menu item. To change them or add a language, publish
the translation files:

```bash
php artisan vendor:publish --tag=rich-editor-plus-translations
```

They are copied to `lang/vendor/rich-editor-plus/`. Add a folder per locale (for example `lang/vendor/rich-editor-plus/de/`)
with the same files and keys as `en/`; strings you leave out fall back to your app's fallback locale, as with any
Laravel translation.

The field's placeholder defaults to the `blocks.placeholder` string ("Type / for commands"). Filament's
`placeholder()` on the field replaces it for one field.

Continue with the [quick start](quick-start.md).

---
title: Assets
weight: 80
description: Register a plugin package's built module and stylesheet, load them only where needed, and serve them from a Vite dev server.
---

## The service provider

Use the `Webwizardsusa\RichEditorPlus\Support\RegistersPluginAssets` trait in your package's service provider. It
registers your built module and stylesheet with Filament, so `php artisan filament:assets` publishes them, and gives
you `moduleUrl()`, which tells the editor where to load the module from.

```php
namespace Acme\Callout;

use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Webwizardsusa\RichEditorPlus\Support\RegistersPluginAssets;

class CalloutServiceProvider extends PackageServiceProvider
{
    use RegistersPluginAssets;

    public function configurePackage(Package $package): void
    {
        $package->name('acme-callout');
    }

    public function packageBooted(): void
    {
        $this->registerPluginAssets();
    }

    public static function assetPackage(): string
    {
        return 'acme/rich-editor-plus-callout';
    }

    public static function assetId(): string
    {
        return 'acme-callout';
    }
}
```

| Method | Returns |
|---|---|
| `assetPackage()` | The package your assets are registered under with Filament. Use your **Composer package name**. |
| `assetId()` | Names the built files in `dist/`, the hot file in `public/` and the Filament asset, such as `acme-callout`. |
| `moduleUrl()` | Where the browser loads the module from: the dev server's entry while it runs, otherwise the published file. |
| `devServer()` | The `DevServer` the trait uses, for checking `isRunning()` yourself. |

> [!IMPORTANT]
> `assetPackage()` must be your package's Composer name, as in its `composer.json`. Filament adds the installed
> version of that package to the asset's URL, so browsers fetch the new file after an update. With any other name,
> Filament can't find a version and falls back to its own, so browsers can keep a cached copy of your old module.

Call `registerPluginAssets()` from `packageBooted()` (or `boot()` in a plain service provider). The trait expects the
service provider to live in your package's `src/` directory, and finds everything else from there.

## Lazy loading

Then point your plugin's JS extension at the module:

```php
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

public function getJsExtension(): JsExtension
{
    return JsExtension::make('acme/callout', $this->options())
        ->module(CalloutServiceProvider::moduleUrl());
}
```

The module loads only on pages with a field that has the plugin, and once per page however many fields use it. The
built-in table, image and Markdown plugins load their own modules the same way, so a field without them never
downloads their code.

A stylesheet is different: `registerPluginAssets()` registers `dist/{assetId}.css` as a Filament stylesheet, which
loads on every panel page. Keep it small, and scope its rules to `.rep-editor` so they only touch the editor.

## Files and defaults

| | Default | Override |
|---|---|---|
| Built module | `dist/{assetId}.js` | `assetsDistPath()` |
| Built stylesheet (optional) | `dist/{assetId}.css` | `assetsDistPath()` |
| Dev server hot file | `public/{assetId}.hot` in the app | (named after `assetId()`) |
| Dev server entry | your package's `resources/js/index.js`, relative to the app root | `devServerEntry()` |
| Error when neither exists | names the package and its hot file | `assetsMissingMessage()` |

Only files that exist are registered, so a package without a stylesheet needs no empty one. The overrides are
`protected static` methods:

```php
protected static function assetsDistPath(): string
{
    return static::packagePath().'/build';
}
```

## The dev server

While the hot file `public/{assetId}.hot` exists **and** the app runs in the `local` environment:

- `moduleUrl()` returns the dev server's URL for your entry, so the editor imports the module straight from Vite.
- `registerPluginAssets()` adds the dev server's HMR client to every panel page, so CSS changes apply without a reload.

Otherwise `moduleUrl()` returns the published file's URL. If the module is neither built nor served, `moduleUrl()`
throws a `LogicException` explaining that the assets are missing.

The hot file is written by `laravel-vite-plugin`'s `hotFile` option, and removed when the dev server stops. See
[building the module](javascript.md#building-the-module) for a `vite.config.js` with both modes.

> [!TIP]
> If the editor shows "The editor could not load these plugins" after you stop a dev server, a stale hot file may be
> left in `public/`. Delete it, or run `npm run build` and `php artisan filament:assets`.

## Releasing

Apps install your package with Composer and never run your build, so:

1. Run `npm run build` and commit `dist/`.
2. Make sure `dist/` is not `export-ignore`d in `.gitattributes`.
3. Tell users to run `php artisan filament:assets` after installing or updating, as for the editor itself.

The built-in table, image and Markdown modules are registered the same way, through
`Webwizardsusa\RichEditorPlus\Support\BundledPluginAssets`, which uses this trait.

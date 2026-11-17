---
title: Package skeleton
weight: 10
description: The files a Rich Editor Plus plugin package has, walked through with the example plugin.
---

A plugin can live in your app, but most are Composer packages so they can be shared between apps. This page walks
through the layout of the [example plugin](docs:rich-editor-plus-example/introduction), which adds a keyboard key mark
and a callout block.

## Layout

```text
acme/rich-editor-plus-callout/
├── composer.json
├── package.json
├── vite.config.js
├── dist/
│   ├── acme-callout.js          # built module, committed and shipped
│   └── acme-callout.css         # built stylesheet (optional)
├── resources/
│   ├── css/index.css
│   ├── js/index.js              # the module's entry: registers the TipTap extensions
│   ├── js/callout.js
│   └── lang/en/plugins.php
├── src/
│   ├── CalloutServiceProvider.php
│   └── Plugins/CalloutPlugin.php
└── tests/
```

The parts:

- **`src/Plugins/`** holds one class per plugin, each extending `Plugin`. See [the plugin class](plugin-class.md).
- **`src/…ServiceProvider.php`** registers the built assets with the `RegistersPluginAssets` trait, and any
  translations. It must live directly in `src/`, because the trait finds the package root from it.
- **`resources/js/index.js`** is the module the browser imports. Its default export registers your TipTap extensions.
  See [the JavaScript module](javascript.md).
- **`dist/`** holds the built module and stylesheet, named after your asset id. Commit it: apps install the package
  with Composer and never run your build. See [assets](assets.md).

## composer.json

Require the editor and Laravel Package Tools, and register the service provider for discovery:

```json
{
    "name": "acme/rich-editor-plus-callout",
    "require": {
        "php": "^8.3",
        "webwizardsusa/filament-rich-editor-plus": "^0.2",
        "spatie/laravel-package-tools": "^1.92"
    },
    "autoload": {
        "psr-4": {
            "Acme\\Callout\\": "src/"
        }
    },
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\Callout\\CalloutServiceProvider"
            ]
        }
    }
}
```

The `name` matters beyond Composer: it is the package name your assets are registered under. See
[`assetPackage()`](assets.md#the-service-provider).

## package.json

The module is built with Vite. Install TipTap as a **dev** dependency only: it is read for its export names at build
time and never bundled, because the editor shares its own copy.

```json
{
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build"
    },
    "devDependencies": {
        "@tiptap/core": "^3.0.0",
        "@tiptap/pm": "^3.0.0",
        "laravel-vite-plugin": "^3.1",
        "vite": "^8.0.0"
    }
}
```

`laravel-vite-plugin` is only needed for the dev server. See [building the module](javascript.md#building-the-module)
for `vite.config.js`.

## The service provider

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
        $package
            ->name('acme-callout')
            ->hasTranslations();
    }

    public function packageBooted(): void
    {
        $this->registerPluginAssets();
    }

    public static function assetPackage(): string
    {
        return 'acme/rich-editor-plus-callout'; // the Composer package name
    }

    public static function assetId(): string
    {
        return 'acme-callout'; // names dist/acme-callout.js and public/acme-callout.hot
    }
}
```

## The plugin and its module

The PHP plugin points its JS extension at the module, by URL:

```php
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

public function getJsExtension(): JsExtension
{
    return JsExtension::make('acme/callout', ['variants' => ['info', 'warning']])
        ->module(CalloutServiceProvider::moduleUrl());
}
```

And the module registers a factory under the same id:

```js
import { createCallout } from './callout'

export default function ({ registerExtension }) {
    registerExtension('acme/callout', (options) => createCallout(options))
}
```

Several plugins in one package can share one module, as the example's keyboard and callout plugins do: each
registers its own id from the same `index.js`.

## Installing it in an app

An app installs the package and publishes its assets, like the editor's own:

```bash
composer require acme/rich-editor-plus-callout
php artisan filament:assets
```

Then adds the plugin to a field, or to every field:

```php
RichEditorPlus::make('body')->addPlugins([CalloutPlugin::make()]);

RichEditorPlus::registerDefaultPlugins([CalloutPlugin::class]);
```

A package may also call `registerDefaultPlugins()` from its own service provider, so installing it is enough. Leave
that to the app when the plugin needs configuration.

# Rich Editor Plus

[![Latest version on Packagist](https://img.shields.io/packagist/v/webwizardsusa/filament-rich-editor-plus.svg)](https://packagist.org/packages/webwizardsusa/filament-rich-editor-plus)
[![Tests](https://github.com/webwizardsusa/filament-rich-editor-plus/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/webwizardsusa/filament-rich-editor-plus/actions/workflows/tests.yml)
[![Total downloads](https://img.shields.io/packagist/dt/webwizardsusa/filament-rich-editor-plus.svg)](https://packagist.org/packages/webwizardsusa/filament-rich-editor-plus/stats)
[![PHP version](https://img.shields.io/packagist/dependency-v/webwizardsusa/filament-rich-editor-plus/php.svg)](https://packagist.org/packages/webwizardsusa/filament-rich-editor-plus)
[![Filament version](https://img.shields.io/packagist/dependency-v/webwizardsusa/filament-rich-editor-plus/filament/filament.svg?label=Filament)](https://filamentphp.com)
[![License](https://img.shields.io/packagist/l/webwizardsusa/filament-rich-editor-plus.svg)](https://github.com/webwizardsusa/filament-rich-editor-plus/blob/main/LICENSE.md)

A rich editor field for Filament, built on TipTap. Each block gets its own toolbar, Gutenberg style, and typing `/`
opens a menu of blocks to insert. Everything the editor can do comes from a plugin, so you can turn features off one
by one, add the optional plugins for tables, images, attachments, mentions, colours and Markdown storage, or write
your own in PHP and JavaScript.

**Requirements:** PHP 8.3 or later and Filament 5.

## Installation

```bash
composer require webwizardsusa/filament-rich-editor-plus
php artisan filament:assets
```

## Usage

```php
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

RichEditorPlus::make('body')
    ->addPlugins([TablePlugin::make()])
    ->required();
```

Render the stored content with the same plugins:

```blade
{!! \Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml() !!}
```

## Documentation

Read the full documentation in the [`docs` folder](https://github.com/webwizardsusa/filament-rich-editor-plus/tree/main/docs).

## License

The MIT License (MIT). See [LICENSE.md](LICENSE.md).

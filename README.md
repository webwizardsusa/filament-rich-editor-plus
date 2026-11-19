# Rich Editor Plus

> **Under active development.** This package is still changing and may not be ready for production use yet. Until
> 1.0, a minor release can include breaking changes, so check the changelog before you upgrade.

![Rich Editor Plus: the slash menu and the block toolbar in a Filament form](https://raw.githubusercontent.com/webwizardsusa/filament-rich-editor-plus/main/art/rich-editor-plus-banner.webp)

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

<p align="center">
  <img src="https://raw.githubusercontent.com/webwizardsusa/filament-rich-editor-plus/main/art/rich-editor-plus-toolbar.webp" alt="The floating toolbar over a selected passage" width="49%">
  <img src="https://raw.githubusercontent.com/webwizardsusa/filament-rich-editor-plus/main/art/rich-editor-plus-slash-menu.webp" alt="Typing / opens a menu of blocks to insert" width="49%">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/webwizardsusa/filament-rich-editor-plus/main/art/rich-editor-plus-mentions.webp" alt="Typing @ suggests users to mention" width="49%">
  <img src="https://raw.githubusercontent.com/webwizardsusa/filament-rich-editor-plus/main/art/rich-editor-plus-tables.webp" alt="A table with its row and column tools in the toolbar" width="49%">
</p>

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

## About Us

This package is developed and maintained by [WebWizardsUSA](https://webwizardsusa.com/), a top rated web development agency on Upwork.

## License

The MIT License (MIT). See [LICENSE.md](LICENSE.md).

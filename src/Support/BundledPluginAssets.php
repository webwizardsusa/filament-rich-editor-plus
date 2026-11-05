<?php

namespace Webwizardsusa\RichEditorPlus\Support;

use Illuminate\Support\Str;
use Webwizardsusa\RichEditorPlus\RichEditorPlusServiceProvider;

/**
 * The JS module and stylesheet of a plugin that ships inside this package but loads only on fields that use it
 * (tables, images, Markdown). They go through {@see RegistersPluginAssets}, the same path a third-party plugin uses,
 * and are built by `vite.modules.config.js` into `dist/rich-editor-plus-{name}.{js,css}`.
 */
abstract class BundledPluginAssets
{
    use RegistersPluginAssets;

    /**
     * The module's name: its folder in `resources/js/plugins/` and the end of its asset id, for example `table`.
     */
    abstract protected static function name(): string;

    /**
     * Registers the module's built files with Filament. Called by the package's service provider.
     */
    public static function register(): void
    {
        (new static)->registerPluginAssets();
    }

    public static function assetPackage(): string
    {
        return RichEditorPlusServiceProvider::PACKAGE;
    }

    public static function assetId(): string
    {
        return RichEditorPlusServiceProvider::ALPINE_COMPONENT.'-'.static::name();
    }

    protected static function packagePath(): string
    {
        return dirname(__DIR__, 2);
    }

    protected static function devServerEntry(): string
    {
        return Str::after(static::packagePath().'/resources/js/plugins/'.static::name().'/index.js', base_path().'/');
    }

    protected static function assetsMissingMessage(): string
    {
        return __('rich-editor-plus::errors.bundled_assets_missing', [
            'name' => static::name(),
            'hot' => static::assetId().'.hot',
        ]);
    }
}

<?php

namespace Hollyit\RichEditorPlus\Support;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\Str;
use LogicException;
use ReflectionClass;

/**
 * Registers the JS module and stylesheet a package ships for Rich Editor Plus, and works out where the browser loads
 * the module from: the package's Vite dev server while it is running, otherwise the built asset that
 * `filament:assets` publishes.
 *
 * Use it in the package's service provider, which is expected to live in `src/`. By default the built files are
 * `dist/{assetId}.js` and `dist/{assetId}.css`, the dev server writes `public/{assetId}.hot`, and its entry is
 * `resources/js/index.js`. Override the protected methods to change any of these.
 */
trait RegistersPluginAssets
{
    /**
     * The Composer package name the assets are registered under, for example `acme/highlight`.
     */
    abstract public static function assetPackage(): string;

    /**
     * Names the Alpine component, the built files in `dist/` and the hot file in `public/`, for example `acme-highlight`.
     */
    abstract public static function assetId(): string;

    public static function devServer(): DevServer
    {
        return new DevServer(static::assetId().'.hot', static::devServerEntry());
    }

    /**
     * Where the browser loads the module from. Pass it to `JsExtension::module()`.
     */
    public static function moduleUrl(): string
    {
        if ($devUrl = static::devServer()->entryUrl()) {
            return $devUrl;
        }

        try {
            return FilamentAsset::getAlpineComponentSrc(static::assetId(), static::assetPackage());
        } catch (LogicException $exception) {
            throw new LogicException(static::assetsMissingMessage(), previous: $exception);
        }
    }

    /**
     * Registers the built files that exist, and loads the dev server's HMR client while it is running. Call it from
     * the service provider's `packageBooted()` or `boot()`.
     */
    protected function registerPluginAssets(): void
    {
        $distPath = static::assetsDistPath();
        $assetId = static::assetId();

        $assets = [];

        if (is_file("{$distPath}/{$assetId}.js")) {
            $assets[] = AlpineComponent::make($assetId, "{$distPath}/{$assetId}.js");
        }

        if (is_file("{$distPath}/{$assetId}.css")) {
            $assets[] = Css::make("{$assetId}-styles", "{$distPath}/{$assetId}.css");
        }

        FilamentAsset::register($assets, static::assetPackage());

        static::devServer()->registerClient();
    }

    /**
     * The package root: the directory above the one the service provider lives in.
     */
    protected static function packagePath(): string
    {
        return dirname((string) (new ReflectionClass(static::class))->getFileName(), 2);
    }

    protected static function assetsDistPath(): string
    {
        return static::packagePath().'/dist';
    }

    /**
     * The JS entry the dev server serves, relative to the app root.
     */
    protected static function devServerEntry(): string
    {
        return Str::after(static::packagePath().'/resources/js/index.js', base_path().'/');
    }

    protected static function assetsMissingMessage(): string
    {
        return __('rich-editor-plus::errors.plugin_assets_missing', [
            'package' => static::assetPackage(),
            'hot' => static::assetId().'.hot',
        ]);
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus;

use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImageAssets;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\MarkdownAssets;
use Webwizardsusa\RichEditorPlus\Plugins\Table\TableAssets;
use Webwizardsusa\RichEditorPlus\Support\RegistersPluginAssets;

class RichEditorPlusServiceProvider extends PackageServiceProvider
{
    use RegistersPluginAssets;

    public const string PACKAGE = 'webwizardsusa/rich-editor-plus';

    public const string ALPINE_COMPONENT = 'rich-editor-plus';

    public function configurePackage(Package $package): void
    {
        $package
            ->name('rich-editor-plus')
            ->hasTranslations();
    }

    public function packageBooted(): void
    {
        $this->registerPluginAssets();

        TableAssets::register();
        ImageAssets::register();
        MarkdownAssets::register();
    }

    public static function assetPackage(): string
    {
        return self::PACKAGE;
    }

    public static function assetId(): string
    {
        return self::ALPINE_COMPONENT;
    }

    protected static function assetsMissingMessage(): string
    {
        return 'The Rich Editor Plus assets are not available: the package\'s dist/ directory is missing and no Vite dev server '
            .'is running. Reinstall webwizardsusa/filament-rich-editor-plus; when working on the package itself, run its `npm run dev` or `npm run build`.';
    }
}

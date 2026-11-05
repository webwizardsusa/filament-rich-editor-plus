<?php

namespace Hollyit\RichEditorPlus;

use Hollyit\RichEditorPlus\Benchmarks\Console\BenchmarkCommand;
use Hollyit\RichEditorPlus\Plugins\Image\ImageAssets;
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownAssets;
use Hollyit\RichEditorPlus\Plugins\Table\TableAssets;
use Hollyit\RichEditorPlus\Support\RegistersPluginAssets;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class RichEditorPlusServiceProvider extends PackageServiceProvider
{
    use RegistersPluginAssets;

    public const string PACKAGE = 'hollyit/rich-editor-plus';

    public const string ALPINE_COMPONENT = 'rich-editor-plus';

    public function configurePackage(Package $package): void
    {
        $package
            ->name('rich-editor-plus')
            ->hasTranslations()
            ->hasViews();

        if (class_exists(BenchmarkCommand::class)) {
            $package->hasCommand(BenchmarkCommand::class);
        }
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
            .'is running. Reinstall hollyit/rich-editor-plus; when working on the package itself, run its `npm run dev` or `npm run build`.';
    }
}

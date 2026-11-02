<?php

namespace Hollyit\RichEditorPlus;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Benchmarks\Console\BenchmarkCommand;
use Hollyit\RichEditorPlus\Support\DevServer;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class RichEditorPlusServiceProvider extends PackageServiceProvider
{
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
        $this->registerAssets();
        DevServer::forEditor()->registerClient();
    }

    protected function registerAssets(): void
    {
        $distPath = __DIR__.'/../dist';

        $assets = [];

        if (is_file("{$distPath}/rich-editor-plus.js")) {
            $assets[] = AlpineComponent::make(self::ALPINE_COMPONENT, "{$distPath}/rich-editor-plus.js");
        }

        if (is_file("{$distPath}/rich-editor-plus.css")) {
            $assets[] = Css::make(self::ALPINE_COMPONENT.'-styles', "{$distPath}/rich-editor-plus.css");
        }

        FilamentAsset::register($assets, self::PACKAGE);
    }
}

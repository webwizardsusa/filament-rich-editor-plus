<?php

use Filament\Support\Assets\AssetManager;
use Filament\Support\Facades\FilamentAsset;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImageAssets;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\MarkdownAssets;
use Webwizardsusa\RichEditorPlus\Plugins\Table\TableAssets;
use Webwizardsusa\RichEditorPlus\RichEditorPlusServiceProvider;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

require_once __DIR__.'/fixtures/plugin-assets/src/AcmeHighlightAssets.php';

beforeEach(fn (): mixed => FilamentAsset::swap(new AssetManager));

it('registers the built module and stylesheet and loads the module from the published asset', function (): void {
    (new AcmeHighlightAssets)->register();

    expect(AcmeHighlightAssets::moduleUrl())->toContain('/js/acme/highlight/components/acme-highlight.js')
        ->and(FilamentAsset::getStyleHref('acme-highlight-styles', 'acme/highlight'))->toContain('/css/acme/highlight/acme-highlight-styles.css');
});

it('serves the package entry from the running dev server', function (): void {
    app()->detectEnvironment(fn (): string => 'local');
    // The package root stands in for the app, so the entry is relative to it however the package is checked out.
    app()->setBasePath(dirname(__DIR__));
    app()->usePublicPath(sys_get_temp_dir());
    $hotFile = public_path('acme-highlight.hot');
    file_put_contents($hotFile, "http://127.0.0.1:5199\n");

    try {
        $moduleUrl = AcmeHighlightAssets::moduleUrl();
    } finally {
        unlink($hotFile);
    }

    expect($moduleUrl)->toBe('http://127.0.0.1:5199/tests/fixtures/plugin-assets/resources/js/index.js');
});

it('names the package and its hot file when the assets are neither built nor served', function (): void {
    AcmeHighlightAssets::moduleUrl();
})->throws(LogicException::class, 'The assets for acme/highlight are not available: its Vite dev server is not running (no public/acme-highlight.hot)');

it('registers the editor and its bundled plugins under the Composer package name, which Filament versions assets by', function (): void {
    $composerName = json_decode((string) file_get_contents(dirname(__DIR__).'/composer.json'), true)['name'];

    expect(RichEditorPlusServiceProvider::assetPackage())->toBe($composerName)
        ->and(TableAssets::assetPackage())->toBe($composerName)
        ->and(ImageAssets::assetPackage())->toBe($composerName)
        ->and(MarkdownAssets::assetPackage())->toBe($composerName);
});

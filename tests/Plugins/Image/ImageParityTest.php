<?php

use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);
});

dataset('image parity cases', function (): array {
    $cases = json_decode(file_get_contents(__DIR__.'/fixtures/image-parity.json'), true, flags: JSON_THROW_ON_ERROR);

    return collect($cases)->mapWithKeys(fn (array $case): array => [$case['name'] => [$case]])->all();
});

it('stores the same HTML as the browser', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['document'])->plugins([ImagePlugin::make()->disk('media')])->toStorableHtml())->toBe($case['html']);
})->with('image parity cases');

it('parses HTML into the same document as the browser', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['html'])->plugins([ImagePlugin::make()->disk('media')])->toArray())->toEqual($case['document']);
})->with('image parity cases');

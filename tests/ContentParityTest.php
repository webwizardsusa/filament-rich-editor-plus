<?php

use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\CodeBlockPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DividerPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\StrikethroughPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlusTable\TablePlugin;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

/**
 * @return array<mixed>
 */
function parityPlugins(): array
{
    return [
        BoldPlugin::make(),
        ItalicPlugin::make(),
        UnderlinePlugin::make(),
        StrikethroughPlugin::make(),
        LinkPlugin::make()->openInNewTab(false),
        BlockquotePlugin::make(),
        HeadingPlugin::make(),
        BulletListPlugin::make(),
        OrderedListPlugin::make(),
        CodeBlockPlugin::make(),
        DividerPlugin::make(),
        MentionPlugin::make()->providers([MentionProvider::make('@')]),
        TablePlugin::make(),
    ];
}

dataset('parity cases', function (): array {
    $cases = json_decode(file_get_contents(__DIR__.'/fixtures/content-parity.json'), true, flags: JSON_THROW_ON_ERROR);

    return collect($cases)->mapWithKeys(fn (array $case): array => [$case['name'] => [$case]])->all();
});

it('renders the same HTML as the browser', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['document'])->plugins(parityPlugins())->toHtml())->toBe($case['html']);
})->with('parity cases');

it('parses HTML into the same document as the browser', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['html'])->plugins(parityPlugins())->toArray())->toEqual($case['document']);
})->with('parity cases');

it('parses the HTML the browser writes into the same document', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['browserHtml'] ?? $case['html'])->plugins(parityPlugins())->toArray())->toEqual($case['document']);
})->with('parity cases');

it('stores the same HTML however the browser wrote it', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['browserHtml'] ?? $case['html'])->plugins(parityPlugins())->toStorableHtml())->toBe($case['html']);
})->with('parity cases');

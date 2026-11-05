<?php

use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\CodeBlockPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\CodePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\DividerPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\FontFamilyPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\FontSizePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\LineHeightPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\LinkPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\StrikethroughPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\SubscriptPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\SuperscriptPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\TextColorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

/**
 * Declares a parity case's `globalAttributes`, which the JS test sends to `core/global-attributes` as they are.
 */
class ParityGlobalAttributesPlugin extends Plugin implements ProvidesGlobalAttributes
{
    /**
     * @var array<GlobalAttribute>
     */
    public array $attributes = [];

    public function getId(): string
    {
        return 'test/parity-global-attributes';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getGlobalAttributes(): array
    {
        return $this->attributes;
    }
}

/**
 * @param  array{name: string, kind: string, key: string, types: array<string>, values: ?array<string>, pattern: ?string, keepOnSplit: bool}  $shape
 */
function parityGlobalAttribute(array $shape): GlobalAttribute
{
    $attribute = $shape['kind'] === 'style'
        ? GlobalAttribute::style($shape['name'], $shape['key'])
        : GlobalAttribute::html($shape['name'], $shape['key']);

    $attribute->types($shape['types'])->keepOnSplit($shape['keepOnSplit']);

    if ($shape['values'] !== null) {
        $attribute->values($shape['values']);
    }

    if ($shape['pattern'] !== null) {
        $attribute->pattern($shape['pattern']);
    }

    return $attribute;
}

/**
 * @param  array<string, mixed>  $case
 * @return array<mixed>
 */
function parityPlugins(array $case = []): array
{
    $plugins = [
        BoldPlugin::make(),
        ItalicPlugin::make(),
        UnderlinePlugin::make(),
        StrikethroughPlugin::make(),
        CodePlugin::make(),
        SubscriptPlugin::make(),
        SuperscriptPlugin::make(),
        TextColorPlugin::make(),
        BackgroundColorPlugin::make(),
        FontFamilyPlugin::make(),
        FontSizePlugin::make(),
        LineHeightPlugin::make(),
        TaskListPlugin::make(),
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

    if (($case['globalAttributes'] ?? []) !== []) {
        $plugin = ParityGlobalAttributesPlugin::make();
        $plugin->attributes = array_map(parityGlobalAttribute(...), $case['globalAttributes']);
        $plugins[] = $plugin;
    }

    return $plugins;
}

dataset('parity cases', function (): array {
    $cases = json_decode(file_get_contents(__DIR__.'/fixtures/content-parity.json'), true, flags: JSON_THROW_ON_ERROR);

    return collect($cases)->mapWithKeys(fn (array $case): array => [$case['name'] => [$case]])->all();
});

it('renders the same HTML as the browser', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['document'])->plugins(parityPlugins($case))->toHtml())->toBe($case['html']);
})->with('parity cases');

it('parses HTML into the same document as the browser', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['html'])->plugins(parityPlugins($case))->toArray())->toEqual($case['document']);
})->with('parity cases');

it('parses the HTML the browser writes into the same document', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['browserHtml'] ?? $case['html'])->plugins(parityPlugins($case))->toArray())->toEqual($case['document']);
})->with('parity cases');

it('stores the same HTML however the browser wrote it', function (array $case): void {
    expect(RichContentPlusRenderer::make($case['browserHtml'] ?? $case['html'])->plugins(parityPlugins($case))->toStorableHtml())->toBe($case['html']);
})->with('parity cases');

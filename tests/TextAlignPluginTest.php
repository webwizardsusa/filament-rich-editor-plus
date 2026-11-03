<?php

use Hollyit\RichEditorPlus\Content\GlobalAttribute;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextAlignPlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

function alignedHtml(string $html, ?TextAlignPlugin $plugin = null): string
{
    return RichContentPlusRenderer::make($html)->parseHtml()->plugins([HeadingPlugin::make(), $plugin ?? TextAlignPlugin::make()])->toHtml();
}

function textAlignTool(TextAlignPlugin $plugin): Tool
{
    return $plugin->getTools()[0];
}

it('has an id and stays out of the default plugins', function (): void {
    expect(TextAlignPlugin::make()->getId())->toBe('core/text-align')
        ->and(array_map(fn ($plugin): string => $plugin->getId(), PluginRegistry::defaultPlugins()))->not->toContain('core/text-align');
});

it('declares a text-align style attribute without the default alignment', function (): void {
    $attributes = TextAlignPlugin::make()->getGlobalAttributes();

    expect($attributes)->toHaveCount(1)
        ->and($attributes[0])->toBeInstanceOf(GlobalAttribute::class)
        ->and($attributes[0]->toArray())->toMatchArray([
            'name' => 'textAlign',
            'kind' => 'style',
            'key' => 'text-align',
            'types' => ['paragraph', 'heading'],
            'values' => ['center', 'right', 'justify'],
        ]);
});

it('takes its alignments, types and default', function (): void {
    $plugin = TextAlignPlugin::make()->alignments(['right', 'center'])->types(['paragraph'])->defaultAlignment('right');

    expect($plugin->getGlobalAttributes()[0]->toArray())->toMatchArray(['types' => ['paragraph'], 'values' => ['center']])
        ->and($plugin->getJsExtension()->toArray())->toBe([
            'id' => 'core/text-align',
            'options' => ['alignments' => ['right', 'center'], 'types' => ['paragraph'], 'defaultAlignment' => 'right'],
        ]);
});

it('rejects unknown alignments, an empty list, a default outside the list, and nothing besides the default', function (Closure $configure): void {
    expect(fn () => $configure(TextAlignPlugin::make())->getGlobalAttributes())->toThrow(InvalidArgumentException::class, 'TextAlignPlugin');
})->with([
    'unknown' => fn (TextAlignPlugin $plugin): TextAlignPlugin => $plugin->alignments(['left', 'middle']),
    'empty' => fn (TextAlignPlugin $plugin): TextAlignPlugin => $plugin->alignments([]),
    'default outside' => fn (TextAlignPlugin $plugin): TextAlignPlugin => $plugin->alignments(['center', 'right'])->defaultAlignment('left'),
    'only the default' => fn (TextAlignPlugin $plugin): TextAlignPlugin => $plugin->alignments(['left']),
]);

it('offers one block menu tool on the aligned types', function (): void {
    $tool = textAlignTool(TextAlignPlugin::make());

    expect($tool->getName())->toBe('textAlign')
        ->and($tool->isMenu())->toBeTrue()
        ->and($tool->getCommand())->toBeNull()
        ->and($tool->getIcon())->toBe('mdi-format-align-left')
        ->and($tool->getLabel())->toBe('Text align')
        ->and($tool->getCurrentLabel())->toBe('Text align: :item')
        ->and($tool->toArray())->toMatchArray(['scope' => 'block', 'nodes' => ['paragraph', 'heading'], 'group' => 'align']);
});

it('has one item per alignment, the default clearing the attribute', function (): void {
    $items = array_map(fn (ToolMenuItem $item): array => $item->toArray(), textAlignTool(TextAlignPlugin::make())->getMenu());

    expect(array_column($items, 'name'))->toBe(['left', 'center', 'right', 'justify'])
        ->and(array_column($items, 'label'))->toBe(['Left', 'Center', 'Right', 'Justify'])
        ->and(array_column($items, 'icon'))->toBe(['mdi-format-align-left', 'mdi-format-align-center', 'mdi-format-align-right', 'mdi-format-align-justify'])
        ->and(array_column($items, 'shortcut'))->toBe(['Mod-Shift-l', 'Mod-Shift-e', 'Mod-Shift-r', 'Mod-Shift-j'])
        ->and($items[0])->toMatchArray(['command' => 'unsetTextAlign', 'arguments' => []])
        ->and(json_encode($items[0]['active']))->toBe('{"name":null,"attributes":{"textAlign":null}}')
        ->and($items[1])->toMatchArray(['command' => 'setTextAlign', 'arguments' => ['center']])
        ->and(json_encode($items[1]['active']))->toBe('{"name":null,"attributes":{"textAlign":"center"}}');
});

it('follows a right-aligned default', function (): void {
    $tool = textAlignTool(TextAlignPlugin::make()->defaultAlignment('right'));
    $items = array_map(fn (ToolMenuItem $item): array => $item->toArray(), $tool->getMenu());

    expect($tool->getIcon())->toBe('mdi-format-align-right')
        ->and($items[2])->toMatchArray(['name' => 'right', 'command' => 'unsetTextAlign'])
        ->and($items[0])->toMatchArray(['name' => 'left', 'command' => 'setTextAlign', 'arguments' => ['left']]);
});

it('sends its extension and its attribute to the browser', function (): void {
    $ids = array_column(PluginRegistry::make([TextAlignPlugin::make()])->getJsExtensions(), 'id');

    expect($ids)->toContain('core/text-align', 'core/global-attributes');
});

it('keeps allowed alignments and drops the default and unknown ones', function (): void {
    expect(alignedHtml('<p style="text-align: center">a</p><h2 style="text-align: right">b</h2>'))
        ->toBe('<p style="text-align: center">a</p><h2 style="text-align: right">b</h2>')
        ->and(alignedHtml('<p style="text-align: left">a</p><p style="text-align: middle">b</p>'))->toBe('<p>a</p><p>b</p>');
});

it('drops an alignment the field does not offer', function (): void {
    expect(alignedHtml('<p style="text-align: justify">a</p><p style="text-align: center">b</p>', TextAlignPlugin::make()->alignments(['left', 'center'])))
        ->toBe('<p>a</p><p style="text-align: center">b</p>');
});

it('does not align types it was not given', function (): void {
    expect(alignedHtml('<h2 style="text-align: center">a</h2>', TextAlignPlugin::make()->types(['paragraph'])))->toBe('<h2>a</h2>');
});

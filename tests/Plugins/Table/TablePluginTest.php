<?php

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\AssetManager;
use Filament\Support\Facades\FilamentAsset;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Support\Tool;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

// Package tests must not depend on plugins the host app registers globally.
beforeEach(fn (): mixed => PluginRegistry::flush());

beforeEach(function (): void {
    // The module URL comes from the built asset, which only exists once the package has been built.
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus-table', __DIR__.'/../../../resources/js/plugins/table/index.js'),
    ], 'webwizardsusa/rich-editor-plus');
});

afterEach(function (): void {
    PluginRegistry::flush();
    Plugin::flushConfigurations();
});

function toolNames(array $tools): array
{
    return array_map(fn (Tool $tool): string => $tool->getName(), $tools);
}

it('provides the table nodes for rendering on the server', function (): void {
    $names = array_map(fn ($node): string => $node->getName(), TablePlugin::make()->getNodes());

    expect($names)->toBe(['table', 'tableRow', 'tableHeader', 'tableCell']);
});

it('tells the browser which extension to build and where to load it from', function (): void {
    $descriptor = TablePlugin::make()->resizable(false)->getJsExtension()->toArray();

    expect($descriptor['id'])->toBe('webwizardsusa/table')
        ->and($descriptor['options'])->toBe(['resizable' => false])
        ->and($descriptor['modules'])->toHaveCount(1)
        ->and($descriptor['modules'][0])->toContain('/js/webwizardsusa/rich-editor-plus/components/rich-editor-plus-table.js');
});

it('explains what to do when its assets are neither built nor served', function (): void {
    FilamentAsset::swap(new AssetManager);

    TablePlugin::make()->getJsExtension();
})->throws(LogicException::class, 'table assets are not available');

it('uses icons that exist in the mdi set', function (): void {
    foreach (TablePlugin::make()->getTools() as $tool) {
        expect(svg($tool->getIcon())->toHtml())->toContain('<svg');
    }
});

it('declares a table block and a toolbar of its own for tables', function (): void {
    $registry = PluginRegistry::make([TablePlugin::make()]);
    $toolbars = $registry->getBlockToolbars();

    expect(array_keys($toolbars))->toBe(['table'])
        ->and(toolNames($toolbars['table']))->toBe([
            'addColumnBefore', 'addColumnAfter', 'deleteColumn',
            'addRowBefore', 'addRowAfter', 'deleteRow',
            'mergeOrSplit', 'toggleHeaderRow', 'deleteTable',
        ])
        ->and($registry->getBlockTypesConfig())->toHaveKey('table');
});

it('shows its toolbar with a cursor in a table', function (): void {
    $tools = PluginRegistry::make([TablePlugin::make()])->getBlockToolbars()['table'];

    expect(array_filter($tools, static fn (Tool $tool): bool => $tool->showsWithCursor()))->toHaveCount(count($tools));
});

it('opens the insert dialog as an action and runs the other tools as table commands', function (): void {
    $blockType = TablePlugin::make()->getBlockTypes()[0];
    $tools = collect(TablePlugin::make()->getTools())->keyBy(fn (Tool $tool): string => $tool->getName());

    expect($blockType->getAction())->toBe('insertTable')
        ->and($blockType->getCommand())->toBeNull()
        ->and($blockType->isSwitchable())->toBeFalse()
        ->and($blockType->getNodeName())->toBe('table')
        ->and(svg($blockType->getIcon())->toHtml())->toContain('<svg')
        ->and($tools)->not->toHaveKey('insertTable')
        ->and($tools['deleteRow']->getCommand())->toBe('deleteRow')
        ->and($tools['deleteRow']->getAction())->toBeNull();
});

it('lists the table last among the default block types', function (): void {
    $names = array_keys(RichEditorPlus::make('content')->addPlugins([TablePlugin::make()])->getPluginRegistry()->getBlockTypesConfig());

    expect(end($names))->toBe('table');
});

it('can be added to a single field', function (): void {
    $field = RichEditorPlus::make('content')->addPlugins([TablePlugin::make()]);

    $descriptors = collect($field->getPluginRegistry()->getJsExtensions())->keyBy('id');

    expect($descriptors)->toHaveKey('webwizardsusa/table')
        ->and(collect(RichEditorPlus::make('content')->getPluginRegistry()->getJsExtensions())->pluck('id')->all())->not->toContain('webwizardsusa/table');
});

it('can be added to every editor', function (): void {
    RichEditorPlus::registerDefaultPlugins([TablePlugin::class]);

    expect(collect(RichEditorPlus::make('any')->getPluginRegistry()->getJsExtensions())->pluck('id')->all())->toContain('webwizardsusa/table');
});

it('registers its insert action with the editor', function (): void {
    $actions = RichEditorPlus::make('content')->addPlugins([TablePlugin::make()])->getDefaultActions();

    expect(collect($actions)->map->getName()->all())->toBe(['link', 'insertTable']);
});

it('renders tables to HTML on the server', function (): void {
    $cell = fn (string $type, string $text): array => [
        'type' => $type,
        'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]],
    ];

    $html = RichContentPlusRenderer::make([
        'type' => 'doc',
        'content' => [[
            'type' => 'table',
            'content' => [
                ['type' => 'tableRow', 'content' => [$cell('tableHeader', 'Name'), $cell('tableHeader', 'Role')]],
                ['type' => 'tableRow', 'content' => [$cell('tableCell', 'Ada'), $cell('tableCell', 'Engineer')]],
            ],
        ]],
    ])->plugins([TablePlugin::make()])->toHtml();

    expect($html)
        ->toContain('<table>')
        ->toContain('<th ')
        ->toContain('<p>Name</p>')
        ->toContain('<td ')
        ->toContain('<p>Engineer</p>');
});

it('parses a table from HTML into a document', function (): void {
    $document = RichContentPlusRenderer::make('<table><tbody><tr><td><p>x</p></td></tr></tbody></table>')
        ->plugins([TablePlugin::make()])
        ->toArray();

    expect($document['content'][0]['type'])->toBe('table')
        ->and($document['content'][0]['content'][0]['type'])->toBe('tableRow');
});

it('drops tables it has no plugin for when parsing or storing', function (): void {
    $renderer = fn (): RichContentPlusRenderer => RichContentPlusRenderer::make('<table><tbody><tr><td><p>x</p></td></tr></tbody></table>');

    expect($renderer()->parseHtml()->toHtml())->not->toContain('<table>')
        ->and($renderer()->toStorableHtml())->not->toContain('<table>');
});

it('says whether columns can be resized', function (): void {
    expect(TablePlugin::make()->isResizable())->toBeTrue()
        ->and(TablePlugin::make()->resizable(false)->isResizable())->toBeFalse();
});

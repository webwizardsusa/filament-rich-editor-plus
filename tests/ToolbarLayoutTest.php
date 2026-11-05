<?php

use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolbarControl;
use Hollyit\RichEditorPlus\Support\ToolbarLayout;
use Hollyit\RichEditorPlus\Support\ToolbarPlacement;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

// Package tests must not depend on plugins the host app registers globally.
beforeEach(fn (): mixed => PluginRegistry::flush());

/**
 * Each group as names: a tool's name or a control's value.
 *
 * @return array<int, array<string>>
 */
function layoutNames(ToolbarLayout $layout): array
{
    return array_map(
        static fn (array $group): array => array_map(
            static fn (Tool|ToolbarControl $item): string => $item instanceof Tool ? $item->getName() : $item->value,
            $group,
        ),
        $layout->getGroups(),
    );
}

function formattingRegistry(): PluginRegistry
{
    return PluginRegistry::make([BoldPlugin::make(), ItalicPlugin::make(), LinkPlugin::make()]);
}

it('uses the floating default layout without an arrangement', function (): void {
    $registry = formattingRegistry();
    $inline = collect($registry->getInlineTools())->map->getName()->all();

    expect(layoutNames($registry->getToolbarLayout(null, ToolbarPlacement::Floating)))->toBe([
        ['dragHandle', 'blockSwitcher', 'moveUp', 'moveDown'],
        $inline,
        ['listOptions'],
        ['blockTools'],
        ['more'],
    ]);
});

it('leaves the drag handle and move buttons out of the fixed default layout', function (): void {
    $registry = formattingRegistry();
    $inline = collect($registry->getInlineTools())->map->getName()->all();

    expect(layoutNames($registry->getToolbarLayout(null, ToolbarPlacement::Fixed)))->toBe([
        ['blockSwitcher'],
        $inline,
        ['listOptions'],
        ['blockTools'],
        ['more'],
    ]);
});

it('keeps the default controls around an arrangement that only names tools', function (): void {
    $layout = formattingRegistry()->getToolbarLayout([['link', 'bold'], ['italic', 'missing']], ToolbarPlacement::Floating);

    expect(layoutNames($layout))->toBe([
        ['dragHandle', 'blockSwitcher', 'moveUp', 'moveDown'],
        ['link', 'bold', 'italic'],
        ['listOptions'],
        ['blockTools'],
        ['more'],
    ])
        ->and(collect($layout->getTools())->map->getGroup()->all())->toBe(['toolbar-0', 'toolbar-0', 'toolbar-1']);
});

it('shows only what an arrangement names once it names a control', function (): void {
    $layout = formattingRegistry()->getToolbarLayout([['blockSwitcher', 'bold'], ['blockTools'], ['missing']], ToolbarPlacement::Floating);

    expect(layoutNames($layout))->toBe([['blockSwitcher', 'bold'], ['blockTools']])
        ->and($layout->has(ToolbarControl::More))->toBeFalse()
        ->and($layout->has(ToolbarControl::BlockTools))->toBeTrue();
});

it('gives the tools in a full layout the group they were placed in', function (): void {
    $layout = formattingRegistry()->getToolbarLayout([['bold', 'more'], ['italic']], ToolbarPlacement::Floating);

    expect(collect($layout->getTools())->map->getGroup()->all())->toBe(['toolbar-0', 'toolbar-1']);
});

it('places each item once', function (): void {
    $layout = formattingRegistry()->getToolbarLayout([['bold', 'more'], ['bold', 'more', 'italic']], ToolbarPlacement::Floating);

    expect(layoutNames($layout))->toBe([['bold', 'more'], ['italic']]);
});

it('never puts the drag handle in the fixed toolbar', function (): void {
    $registry = formattingRegistry();

    expect(layoutNames($registry->getToolbarLayout([['dragHandle', 'bold']], ToolbarPlacement::Fixed)))->toBe([['bold']])
        ->and(layoutNames($registry->getToolbarLayout([['dragHandle', 'bold']], ToolbarPlacement::Floating)))->toBe([['dragHandle', 'bold']]);
});

it('has no formatting group when no plugin has a formatting tool', function (): void {
    $layout = PluginRegistry::make([BlockquotePlugin::make()])->getToolbarLayout(null, ToolbarPlacement::Fixed);

    expect(layoutNames($layout))->toBe([['blockSwitcher'], ['listOptions'], ['blockTools'], ['more']]);
});

it('leaves the plugins own tools untouched when building a full layout', function (): void {
    $registry = PluginRegistry::make([BoldPlugin::make()]);

    $registry->getToolbarLayout([['bold', 'more']], ToolbarPlacement::Floating);

    expect($registry->getInlineTools()[0]->getGroup())->toBe('format');
});

it('gives exactly the listed tools when the list is flagged as the whole toolbar', function (): void {
    expect(layoutNames(formattingRegistry()->getToolbarLayout([['bold', 'link']], ToolbarPlacement::Floating, onlyListed: true)))->toBe([['bold', 'link']]);
});

it('gives an empty layout for a flagged empty list', function (): void {
    expect(formattingRegistry()->getToolbarLayout([[]], ToolbarPlacement::Floating, onlyListed: true)->isEmpty())->toBeTrue();
});

it('still gives the default layout for no arrangement when flagged', function (): void {
    $registry = formattingRegistry();

    expect(layoutNames($registry->getToolbarLayout(null, ToolbarPlacement::Floating, onlyListed: true)))
        ->toBe(layoutNames($registry->getToolbarLayout(null, ToolbarPlacement::Floating)));
});

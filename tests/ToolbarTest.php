<?php

use Webwizardsusa\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Rendering\ToolbarRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Support\Tool;
use Webwizardsusa\RichEditorPlus\Support\ToolbarLayout;
use Webwizardsusa\RichEditorPlus\Support\ToolbarPlacement;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

// Package tests must not depend on plugins the host app registers globally.
beforeEach(fn (): mixed => PluginRegistry::flush());

function makeBlockToolPlugin(string $id, Tool ...$tools): Plugin
{
    return new class($id, $tools) extends Plugin
    {
        public function __construct(protected string $id, protected array $tools) {}

        public function getId(): string
        {
            return $this->id;
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make($this->id);
        }

        public function getTools(): array
        {
            return $this->tools;
        }
    };
}

it('shows block tools on every block by default', function (): void {
    $toolbars = PluginRegistry::make([makeBlockToolPlugin('test/quote', Tool::make('blockquote')->icon('mdi-format-quote-open')->block()->order(10))])->getBlockToolbars();

    expect(array_keys($toolbars))->toBe(['*'])
        ->and(collect($toolbars['*'])->map->getName()->all())->toBe(['blockquote']);
});

it('builds a toolbar per node type that includes the tools for every block', function (): void {
    $registry = PluginRegistry::make([
        makeBlockToolPlugin('test/quote', Tool::make('blockquote')->icon('mdi-format-quote-open')->block()->order(10)),
        makeBlockToolPlugin('test/heading', Tool::make('level')->block()->nodes(['heading'])->order(5)),
    ]);

    $toolbars = $registry->getBlockToolbars();

    expect(array_keys($toolbars))->toBe(['*', 'heading'])
        ->and(collect($toolbars['*'])->map->getName()->all())->toBe(['blockquote'])
        ->and(collect($toolbars['heading'])->map->getName()->all())->toBe(['level', 'blockquote']);
});

it('has no block toolbars when no plugin contributes a block tool', function (): void {
    expect(PluginRegistry::make([BoldPlugin::make()])->getBlockToolbars())->toBe([]);
});

it('keeps inline and block tools apart and orders inline tools', function (): void {
    $registry = PluginRegistry::make([ItalicPlugin::make(), BlockquotePlugin::make(), BoldPlugin::make()]);

    expect(collect($registry->getInlineTools())->map->getName()->all())->toBe(['bold', 'italic']);
});

it('describes tools for the browser, with attributes as an object', function (): void {
    $config = PluginRegistry::make([BoldPlugin::make()])->getToolsConfig();

    expect($config['bold'])->toMatchArray(['command' => 'toggleBold', 'arguments' => []])
        ->and($config['bold']['active']['name'])->toBe('bold')
        ->and(json_encode($config['bold']['active']['attributes']))->toBe('{}');
});

it('renders a hidden block toolbar with a button for every tool', function (): void {
    $registry = PluginRegistry::make([makeBlockToolPlugin('test/quote', Tool::make('blockquote')->icon('mdi-format-quote-open')->block()->order(10))]);
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', $registry->getBlockToolbars()['*'], []);

    expect($html)
        ->toContain('data-rep-block-toolbar="*" hidden')
        ->toContain('role="toolbar"')
        ->toContain('data-rep-tool="blockquote"')
        ->toContain('aria-pressed="false"')
        ->toContain('<svg');
});

it('marks a toolbar with a tool that shows with a cursor', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('table', [Tool::make('a')->block(), Tool::make('b')->block()->showWithCursor()], []);

    expect($html)->toContain('data-rep-block-toolbar="table" data-rep-show-with-cursor hidden');
});

it('leaves a toolbar unmarked when no tool shows with a cursor', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('table', [Tool::make('a')->block()->showWithCursor(false)], []);

    expect($html)->not->toContain('data-rep-show-with-cursor');
});

it('merges formatting into the block toolbar and separates groups', function (): void {
    $tools = [
        Tool::make('one')->icon('mdi-format-bold')->group('a'),
        Tool::make('two')->icon('mdi-format-italic')->group('a'),
        Tool::make('three')->icon('mdi-link')->group('b'),
    ];

    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], $tools);

    expect($html)
        ->toContain('data-rep-inline-tools')
        ->and(substr_count($html, 'data-rep-tool='))->toBe(3)
        ->and(substr_count($html, 'rep-toolbar-group-divider'))->toBe(1);
});

it('always renders the block controls, even with no tools', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], []);

    expect($html)
        ->toContain('data-rep-drag-handle')
        ->toContain('draggable="true"')
        ->toContain('data-rep-control="switcher"')
        ->toContain('data-rep-control="moveUp"')
        ->toContain('data-rep-control="moveDown"')
        ->toContain('data-rep-control="more"')
        ->toContain('aria-haspopup="menu"');
});

it('keeps the drag handle out of keyboard navigation', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], []);

    expect($html)->toMatch('/<button[^>]*data-rep-drag-handle[^>]*aria-hidden="true"/');
});

it('escapes tool names and labels', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], [Tool::make('x"><script>')->label('<b>')]);

    expect($html)->not->toContain('<script>')->not->toContain('<b>');
});

it('renders the toolbar, menus and live region from the field', function (): void {
    expect(RichEditorPlus::make('content')->getToolbarsHtml())
        ->toContain('data-rep-block-toolbar="*"')
        ->toContain('data-rep-slash-menu')
        ->toContain('data-rep-switcher-menu')
        ->toContain('data-rep-more-menu')
        ->toContain('data-rep-live')
        ->not->toContain('data-rep-inline-toolbar');
});

it('includes formatting in every node toolbar', function (): void {
    $html = RichEditorPlus::make('content')
        ->addPlugins([makeBlockToolPlugin('test/heading', Tool::make('level')->block()->nodes(['heading']))])
        ->getToolbarsHtml();

    expect(substr_count($html, 'data-rep-tool="bold"'))->toBe(5);
});

it('gives each nesting plugin level tools on its own node', function (string $plugin, string $node): void {
    $toolbars = PluginRegistry::make([$plugin::make()])->getBlockToolbars();

    expect(array_keys($toolbars))->toBe([$node])
        ->and(collect($toolbars[$node])->map->getName()->all())->toBe(["{$node}DecreaseLevel", "{$node}IncreaseLevel"])
        ->and(collect($toolbars[$node])->map->getCommand()->all())->toBe(['decreaseBlockLevel', 'increaseBlockLevel']);

    foreach ($toolbars[$node] as $tool) {
        expect(svg($tool->getIcon())->toHtml())->toContain('<svg');
    }
})->with([
    [BulletListPlugin::class, 'bulletList'],
    [OrderedListPlugin::class, 'orderedList'],
    [BlockquotePlugin::class, 'blockquote'],
]);

it('sends the availability check to the browser', function (): void {
    $config = RichEditorPlus::make('body')->getPluginRegistry()->getToolsConfig();

    expect($config['blockquoteIncreaseLevel']['checksAvailability'])->toBeTrue()
        ->and($config['bold']['checksAvailability'])->toBeFalse();
});

it('puts a hidden list button on every toolbar', function (): void {
    $html = RichEditorPlus::make('body')->getToolbarsHtml();

    expect(substr_count($html, 'data-rep-control="list"'))->toBe(substr_count($html, 'data-rep-block-toolbar='))
        ->and($html)->toContain('data-rep-list-tools hidden')
        ->and($html)->toContain('data-rep-list-menu');
});

it('leaves the list button off a field with no list plugins', function (): void {
    $html = RichEditorPlus::make('body')->plugins([BoldPlugin::make()])->getToolbarsHtml();

    expect($html)->not->toContain('data-rep-control="list"')
        ->not->toContain('data-rep-list-menu');
});

it('offers both core lists as list types', function (): void {
    $types = RichEditorPlus::make('body')->getPluginRegistry()->getListTypes();

    expect(collect($types)->map->getNodeName()->all())->toBe(['bulletList', 'orderedList']);
});

it('hides level tools in a list item but not the quote toolbar config', function (): void {
    $config = RichEditorPlus::make('body')->getPluginRegistry()->getToolsConfig();

    expect($config['bulletListIncreaseLevel']['hidesInListItem'])->toBeTrue()
        ->and($config['blockquoteIncreaseLevel']['hidesInListItem'])->toBeTrue()
        ->and($config['bold']['hidesInListItem'])->toBeFalse();
});

it('wraps block tools in a section the browser can hide', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [Tool::make('a')->block()], []);

    expect($html)->toContain('data-rep-block-tools');
});

it('offers lists and quotes for several selected blocks', function (): void {
    $config = RichEditorPlus::make('body')->getPluginRegistry()->getBlockTypesConfig();

    $names = array_keys(array_filter($config, static fn (array $blockType): bool => $blockType['multiBlock']));

    expect($names)->toEqualCanonicalizing(['bulletList', 'orderedList', 'blockquote']);
});

it('gives the switcher a label for several blocks', function (): void {
    expect((new ToolbarRenderer)->renderBlockToolbar('*', [], []))->toContain('data-rep-multiple-label=":count blocks"');
});

it('renders plugin editor html and overflow tools with the toolbars', function (): void {
    $plugin = new class extends Plugin
    {
        public function getId(): string
        {
            return 'test/extras';
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make($this->getId());
        }

        public function getTools(): array
        {
            return [Tool::make('extra')->command('runExtra')->overflow()];
        }

        public function getEditorHtml(): ?string
        {
            return '<div data-test-panel></div>';
        }
    };

    expect(RichEditorPlus::make('body')->addPlugins([$plugin])->getToolbarsHtml())
        ->toContain('data-test-panel')
        ->toContain('data-rep-more-action="runExtra"');
});

it('renders a tool shortcut for the tooltip instead of a native title', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], [Tool::make('bold')->label('Bold')->shortcut('Mod-b')]);

    expect($html)
        ->toContain('data-rep-tool="bold" aria-label="Bold" data-rep-shortcut="Mod-b"')
        ->toContain('data-rep-control="moveUp" aria-label="Move block up" data-rep-shortcut="Alt-Shift-ArrowUp"')
        ->not->toContain(' title=');
});

it('gives the core formatting tools their shortcuts', function (): void {
    $shortcuts = collect(RichEditorPlus::make('body')->getPluginRegistry()->getInlineTools())
        ->mapWithKeys(fn (Tool $tool): array => [$tool->getName() => $tool->getShortcut()])
        ->all();

    expect($shortcuts)->toMatchArray(['bold' => 'Mod-b', 'italic' => 'Mod-i', 'underline' => 'Mod-u', 'strikethrough' => 'Mod-Shift-s']);
});

it('arranges the formatting tools per field', function (): void {
    $html = RichEditorPlus::make('body')
        ->toolbarTools([['link', 'bold'], ['italic', 'missing']])
        ->getToolbarsHtml();

    $toolbar = str($html)->betweenFirst('data-rep-block-toolbar="*"', '</div>');

    expect($toolbar->matchAll('/data-rep-tool="([^"]+)"/')->all())->toBe(['link', 'bold', 'italic'])
        ->and($toolbar->substrCount('rep-toolbar-group-divider'))->toBe(1);
});

it('treats a flat list of tools as one group', function (): void {
    $tools = RichEditorPlus::make('body')->toolbarTools(['italic', 'bold'])->getToolbarTools();

    expect($tools)->toBe([['italic', 'bold']]);
});

it('keeps the plugins order without a toolbar arrangement', function (): void {
    $field = RichEditorPlus::make('body');

    expect(collect($field->getPluginRegistry()->getInlineTools($field->getToolbarTools()))->map->getName()->all())
        ->toBe(collect($field->getPluginRegistry()->getInlineTools())->map->getName()->all())
        ->and($field->getToolbarTools())->toBeNull();
});

it('leaves the plugins own tools untouched when arranging', function (): void {
    $registry = PluginRegistry::make([BoldPlugin::make()]);

    $registry->getInlineTools([['bold']]);

    expect($registry->getInlineTools()[0]->getGroup())->toBe('format');
});

it('groups block tools for the fixed toolbar without repeating the tools for every block', function (): void {
    $groups = PluginRegistry::make([
        makeBlockToolPlugin('test/table', Tool::make('addRow')->block()->nodes(['table'])->order(5)),
        makeBlockToolPlugin('test/quote', Tool::make('quote')->block()->order(10)),
    ])->getBlockToolGroups();

    expect(array_keys($groups))->toBe(['*', 'table'])
        ->and(collect($groups['*'])->map->getName()->all())->toBe(['quote'])
        ->and(collect($groups['table'])->map->getName()->all())->toBe(['addRow']);
});

it('has no group for every block when every block tool belongs to a node', function (): void {
    $groups = PluginRegistry::make([makeBlockToolPlugin('test/table', Tool::make('addRow')->block()->nodes(['table']))])->getBlockToolGroups();

    expect(array_keys($groups))->toBe(['table']);
});

it('renders the default floating layout in todays order', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [Tool::make('quote')->block()], [Tool::make('bold')->icon('mdi-format-bold')], true);

    expect($html)->toMatch('/data-rep-drag-handle.*data-rep-control="switcher".*data-rep-control="moveUp".*data-rep-control="moveDown".*data-rep-inline-tools.*data-rep-list-tools hidden.*data-rep-block-tools.*data-rep-control="more"/s');
});

it('renders a custom floating layout with only what it names', function (): void {
    $layout = PluginRegistry::make([BoldPlugin::make()])->getToolbarLayout([['bold'], ['blockSwitcher']], ToolbarPlacement::Floating);

    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [Tool::make('quote')->block()], [], true, $layout);

    expect($html)
        ->toContain('data-rep-tool="bold"')
        ->toContain('data-rep-control="switcher"')
        ->not->toContain('data-rep-drag-handle')
        ->not->toContain('data-rep-control="moveUp"')
        ->not->toMatch('/data-rep-control="more"(?![^>]*data-rep-overflow-only)/')
        ->not->toContain('data-rep-list-tools')
        ->not->toContain('data-rep-tool="quote"');
});

it('gives a layout without a more button one for overflow, hidden until something moves into it', function (string $placement): void {
    $registry = PluginRegistry::make([BoldPlugin::make()]);
    $layout = $registry->getToolbarLayout([['bold'], ['blockSwitcher']], ToolbarPlacement::from($placement));

    $html = $placement === 'floating'
        ? (new ToolbarRenderer)->renderBlockToolbar('*', [], [], layout: $layout)
        : (new ToolbarRenderer)->renderFixedToolbar($layout, [], false);

    expect($html)
        ->toMatch('/<button [^>]*data-rep-control="more"[^>]*data-rep-overflow-only hidden><svg/')
        ->toMatch('/data-rep-overflow-only hidden>.*<\/button><\/div>$/s')
        ->and(substr_count($html, 'data-rep-control="more"'))->toBe(1);
})->with(['floating', 'fixed']);

it('adds no overflow-only more button to a layout that has its own', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], [Tool::make('bold')]);

    expect($html)->not->toContain('data-rep-overflow-only')
        ->and(substr_count($html, 'data-rep-control="more"'))->toBe(1);
});

it('puts the divider that starts a group inside the section the browser can hide', function (): void {
    $layout = PluginRegistry::make([BoldPlugin::make()])->getToolbarLayout([['blockSwitcher'], ['bold']], ToolbarPlacement::Floating);

    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [], [], layout: $layout);

    expect($html)->toContain('data-rep-inline-tools><span class="rep-toolbar-divider"')
        ->and(substr_count($html, 'rep-toolbar-divider'))->toBe(1);
});

it('renders the fixed toolbar with a group per node, showing only the one for every block', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(
        ToolbarLayout::default(ToolbarPlacement::Fixed, []),
        ['*' => [Tool::make('quote')->block()], 'table' => [Tool::make('addRow')->block()->nodes(['table'])]],
        hasListTypes: false,
    );

    expect($html)
        ->toContain('data-rep-fixed-toolbar')
        ->toContain('role="toolbar"')
        ->not->toContain('data-rep-block-toolbar')
        ->not->toContain('data-rep-drag-handle')
        ->toContain('<span data-rep-block-tools-for="*"><button')
        ->toContain('<span data-rep-block-tools-for="table" hidden>')
        ->not->toMatch('/<div[^>]*data-rep-fixed-toolbar[^>]*hidden/')
        ->and(substr_count($html, 'data-rep-tool="quote"'))->toBe(1);
});

it('leaves the block tools section out of the fixed toolbar when no plugin has block tools', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(ToolbarLayout::default(ToolbarPlacement::Fixed, []), [], false);

    expect($html)->not->toContain('data-rep-block-tools');
});

it('makes the fixed toolbar sticky unless told not to', function (bool $isSticky): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(ToolbarLayout::default(ToolbarPlacement::Fixed, []), [], false, isSticky: $isSticky);

    expect(str_contains($html, 'rep-fixed-toolbar-sticky'))->toBe($isSticky);
})->with([true, false]);

it('shows the list button in the fixed toolbar, disabled until the cursor is in a list', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(ToolbarLayout::default(ToolbarPlacement::Fixed, []), [], true);

    expect($html)
        ->toContain('data-rep-list-tools>')
        ->toMatch('/data-rep-control="list"[^>]*aria-label="List options"[^>]*aria-disabled="true"/')
        ->toMatch('/data-rep-list-icon><svg/');
});

it('disables every button of a fixed toolbar on a disabled field', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(
        ToolbarLayout::default(ToolbarPlacement::Fixed, [Tool::make('bold')->icon('mdi-format-bold')]),
        [],
        true,
        isDisabled: true,
    );

    expect(substr_count($html, '<button '))->toBeGreaterThan(0)
        ->and(substr_count($html, '<button disabled '))->toBe(substr_count($html, '<button '));
});

it('adds extra attributes to the fixed toolbar', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(ToolbarLayout::default(ToolbarPlacement::Fixed, []), [], false, attributes: 'x-show="! error"');

    expect($html)->toMatch('/<div[^>]*data-rep-fixed-toolbar x-show="! error">/');
});

it('renders the fixed toolbar block tools section hidden when no tools show for every block', function (array $groups): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(
        ToolbarLayout::default(ToolbarPlacement::Fixed, [Tool::make('bold')->icon('mdi-format-bold')]),
        $groups,
        hasListTypes: false,
    );

    expect($html)->toContain('data-rep-block-tools hidden>');
})->with([
    'no group for every block' => [['table' => [Tool::make('addRow')->block()->nodes(['table'])]]],
    'an empty group for every block' => [['*' => [], 'table' => [Tool::make('addRow')->block()->nodes(['table'])]]],
]);

it('leaves the fixed toolbar block tools section showing when tools show for every block', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(
        ToolbarLayout::default(ToolbarPlacement::Fixed, []),
        ['*' => [Tool::make('quote')->block()]],
        hasListTypes: false,
    );

    expect($html)->toContain('data-rep-block-tools>')->not->toContain('data-rep-block-tools hidden');
});

it('names the fixed toolbar switcher generically until the browser knows the block', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(ToolbarLayout::default(ToolbarPlacement::Fixed, []), [], false);

    expect($html)->toContain('data-rep-switcher-label>'.e(__('rich-editor-plus::blocks.generic')).'</span>');
});

it('gives the fixed toolbar list button its generic label for the browser to restore', function (): void {
    $html = (new ToolbarRenderer)->renderFixedToolbar(ToolbarLayout::default(ToolbarPlacement::Fixed, []), [], true);

    expect($html)->toContain('data-rep-generic-label="'.e(__('rich-editor-plus::toolbar.list_menu')).'"');
});

it('does not show a floating table toolbar with only a cursor when the layout has no block tools slot', function (): void {
    $layout = PluginRegistry::make([BoldPlugin::make()])->getToolbarLayout([['bold'], ['blockSwitcher']], ToolbarPlacement::Floating);

    $html = (new ToolbarRenderer)->renderBlockToolbar('table', [Tool::make('b')->block()->showWithCursor()], [], layout: $layout);

    expect($html)->not->toContain('data-rep-show-with-cursor');
});

it('marks tools that work while the editor is read-only', function (): void {
    expect(Tool::make('x')->toArray()['availableWhileReadOnly'])->toBeFalse()
        ->and(Tool::make('x')->availableWhileReadOnly()->toArray()['availableWhileReadOnly'])->toBeTrue()
        ->and(Tool::make('x')->availableWhileReadOnly()->isAvailableWhileReadOnly())->toBeTrue();
});

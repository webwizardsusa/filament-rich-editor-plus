<?php

use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Rendering\ToolbarRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Tests\TestCase;

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

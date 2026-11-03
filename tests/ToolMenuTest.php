<?php

use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Rendering\BlockMenuRenderer;
use Hollyit\RichEditorPlus\Rendering\ToolbarRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

class ToolMenuTestPlugin extends Plugin
{
    /**
     * @var array<Tool>
     */
    public array $tools = [];

    public function getId(): string
    {
        return 'test/tool-menu';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return $this->tools;
    }
}

/**
 * @param  array<Tool>  $tools
 */
function toolMenuPlugin(array $tools): ToolMenuTestPlugin
{
    $plugin = ToolMenuTestPlugin::make();
    $plugin->tools = $tools;

    return $plugin;
}

function levelMenuTool(): Tool
{
    return Tool::make('level')
        ->label('Level')
        ->icon('mdi-format-header-pound')
        ->currentLabel('Level: :item')
        ->menu([
            ToolMenuItem::make('two')->label('Two')->icon('mdi-format-header-2')->shortcut('Mod-Alt-2')
                ->command('setHeading', [['level' => 2]])->active('heading', ['level' => 2]),
            ToolMenuItem::make('plain')->label('Plain')->icon('mdi-format-paragraph')
                ->command('setParagraph')->active(attributes: ['level' => null]),
        ])
        ->block();
}

it('describes a menu item for the browser', function (): void {
    $item = ToolMenuItem::make('two')->label('Two')->icon('mdi-x')->shortcut('Mod-2')
        ->command('setHeading', [['level' => 2]])->active('heading', ['level' => 2])->toArray();

    expect($item)->toMatchArray([
        'name' => 'two',
        'label' => 'Two',
        'icon' => 'mdi-x',
        'shortcut' => 'Mod-2',
        'command' => 'setHeading',
        'arguments' => [['level' => 2]],
    ])
        ->and($item['active']['name'])->toBe('heading')
        ->and(json_encode($item['active']['attributes']))->toBe('{"level":2}')
        ->and(ToolMenuItem::make('x')->toArray()['active'])->toBeNull();
});

it('sends a menu tool and its items to the browser', function (): void {
    $config = PluginRegistry::make([toolMenuPlugin([levelMenuTool()])])->getToolsConfig()['level'];

    expect($config['command'])->toBeNull()
        ->and(array_column($config['menu'], 'name'))->toBe(['two', 'plain'])
        ->and($config['menu'][1]['active']['name'])->toBeNull()
        ->and(json_encode($config['menu'][1]['active']['attributes']))->toBe('{"level":null}');
});

it('sends no menu for an ordinary tool', function (): void {
    $config = PluginRegistry::make([toolMenuPlugin([Tool::make('plain')->command('toggleBold')->active('bold')])])->getToolsConfig()['plain'];

    expect($config['menu'])->toBeNull()
        ->and($config['active']['name'])->toBe('bold');
});

it('lets a tool be active by attributes alone', function (): void {
    $config = PluginRegistry::make([toolMenuPlugin([Tool::make('centred')->command('x')->active(attributes: ['textAlign' => 'center'])])])->getToolsConfig()['centred'];

    expect($config['active']['name'])->toBeNull()
        ->and(json_encode($config['active']['attributes']))->toBe('{"textAlign":"center"}')
        ->and(Tool::make('none')->hasActiveState())->toBeFalse();
});

it('rejects a menu tool that also has a command or an action', function (Tool $tool): void {
    expect(fn () => PluginRegistry::make([toolMenuPlugin([$tool])]))->toThrow(InvalidArgumentException::class, 'menu');
})->with([
    'command' => fn (): Tool => levelMenuTool()->command('toggleBold'),
    'action' => fn (): Tool => levelMenuTool()->action('link'),
]);

it('rejects a menu tool in the more menu', function (): void {
    expect(fn () => PluginRegistry::make([toolMenuPlugin([levelMenuTool()->overflow()])]))
        ->toThrow(InvalidArgumentException::class, 'more menu');
});

it('rejects a menu tool with no items', function (): void {
    expect(fn () => PluginRegistry::make([toolMenuPlugin([Tool::make('level')->menu([])->block()])]))
        ->toThrow(InvalidArgumentException::class, 'level');
});

it('lists the menu tools of a field', function (): void {
    $registry = PluginRegistry::make([toolMenuPlugin([levelMenuTool(), Tool::make('plain')->command('toggleBold')])]);

    expect(array_map(fn (Tool $tool): string => $tool->getName(), $registry->getMenuTools()))->toBe(['level']);
});

it('renders a menu tool as a menu button', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [levelMenuTool()], []);

    expect($html)
        ->toContain('data-rep-tool="level"')
        ->toContain('aria-haspopup="menu"')
        ->toContain('aria-expanded="false"')
        ->toContain('data-rep-label="Level: :item"')
        ->toContain('data-rep-generic-label="Level"');

    preg_match('/<button[^>]*data-rep-tool="level"[^>]*>/', $html, $button);

    expect($button[0])->not->toContain('aria-pressed');
});

it('renders ordinary tools as before', function (): void {
    $html = (new ToolbarRenderer)->renderBlockToolbar('*', [Tool::make('quote')->label('Quote')->block()], []);

    preg_match('/<button[^>]*data-rep-tool="quote"[^>]*>/', $html, $button);

    expect($button[0])->toContain('aria-pressed="false"')->not->toContain('aria-haspopup');
});

it('renders one menu per menu tool', function (): void {
    $html = (new BlockMenuRenderer)->renderToolMenus([levelMenuTool()]);

    expect($html)
        ->toContain('<div class="rep-menu" role="menu" aria-label="Level" data-rep-tool-menu="level" hidden>')
        ->toContain('role="menuitemradio"')
        ->toContain('data-rep-menu-item="two"')
        ->toContain('data-rep-menu-item="plain"')
        ->toContain('<span class="rep-menu-item-label">Two</span>')
        ->toContain('data-rep-shortcut="Mod-Alt-2"')
        ->toContain('<svg')
        ->and((new BlockMenuRenderer)->renderToolMenus([]))->toBe('');
});

it('puts the tool menus in the field markup', function (): void {
    $withMenu = RichEditorPlus::make('body')->addPlugins([toolMenuPlugin([levelMenuTool()])])->getToolbarsHtml('f');
    $without = RichEditorPlus::make('body')->getToolbarsHtml('f');

    expect($withMenu)->toContain('data-rep-tool-menu="level"')
        ->and($without)->not->toContain('data-rep-tool-menu');
});

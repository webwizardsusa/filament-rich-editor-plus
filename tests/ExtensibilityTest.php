<?php

use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Contracts\PreparesRenderedContent;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

// Package tests must not depend on plugins the host app registers globally.
beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(function (): void {
    PluginRegistry::flush();
    Plugin::flushConfigurations();
});

class ExtensibilityTestPlugin extends Plugin
{
    public string $label = 'default';

    public function label(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function getId(): string
    {
        return 'test/extensible';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), ['label' => $this->label])->module('https://cdn.test/own.js');
    }

    public function getTools(): array
    {
        return [Tool::make('own')->inline()->order(1)];
    }
}

function defaultPluginIds(?RichEditorPlus $field = null): array
{
    return array_keys(PluginRegistry::make(($field ?? RichEditorPlus::make('content'))->getPlugins())->getPlugins());
}

it('adds registered plugins to the default set of every editor', function (): void {
    RichEditorPlus::registerDefaultPlugins([ExtensibilityTestPlugin::class]);

    expect(defaultPluginIds())->toContain('test/extensible')
        ->and(defaultPluginIds(RichEditorPlus::make('other')))->toContain('test/extensible');
});

it('accepts instances and closures when registering default plugins', function (): void {
    RichEditorPlus::registerDefaultPlugins([
        fn (): array => [ExtensibilityTestPlugin::make()],
    ]);

    expect(defaultPluginIds())->toContain('test/extensible');
});

it('lets a registered default replace a core plugin with the same id', function (): void {
    RichEditorPlus::registerDefaultPlugins([LinkPlugin::make()->protocols(['https'])]);

    $link = collect(RichEditorPlus::make('content')->getPlugins())->first(fn ($plugin): bool => $plugin->getId() === 'core/link');

    expect($link->getJsExtension()->getOptions()['protocols'])->toBe(['https']);
});

it('does not touch an explicit plugin list', function (): void {
    RichEditorPlus::registerDefaultPlugins([ExtensibilityTestPlugin::class]);

    expect(defaultPluginIds(RichEditorPlus::make('content')->plugins([BoldPlugin::class])))
        ->toBe(['core/document', 'core/bold']);
});

it('adds plugins to one field with addPlugins', function (): void {
    $ids = defaultPluginIds(RichEditorPlus::make('content')->addPlugins([ExtensibilityTestPlugin::class]));

    expect($ids)->toContain('test/extensible')
        ->and(defaultPluginIds())->not->toContain('test/extensible');
});

it('lets addPlugins replace a default plugin and keeps its position', function (): void {
    $plugins = RichEditorPlus::make('content')
        ->addPlugins([LinkPlugin::make()->protocols(['mailto'])])
        ->getPlugins();

    $ids = array_map(fn ($plugin): string => $plugin->getId(), $plugins);

    expect($ids)->toBe(['core/bold', 'core/italic', 'core/underline', 'core/strikethrough', 'core/link', 'core/blockquote', 'core/heading', 'core/bullet-list', 'core/ordered-list', 'core/code-block', 'core/divider', 'core/find-replace'])
        ->and($plugins[4]->getJsExtension()->getOptions()['protocols'])->toBe(['mailto']);
});

it('applies addPlugins on top of an explicit plugin list, and withoutPlugins after both', function (): void {
    $field = RichEditorPlus::make('content')
        ->plugins([BoldPlugin::class])
        ->addPlugins([ExtensibilityTestPlugin::class])
        ->withoutPlugins([BoldPlugin::class]);

    expect(defaultPluginIds($field))->toBe(['core/document', 'test/extensible']);
});

it('configures every plugin of a class as it is made', function (): void {
    ExtensibilityTestPlugin::configureUsing(fn (ExtensibilityTestPlugin $plugin) => $plugin->label('configured'));

    expect(ExtensibilityTestPlugin::make()->label)->toBe('configured')
        ->and(PluginRegistry::resolvePlugin(ExtensibilityTestPlugin::class)->label)->toBe('configured');
});

it('applies configuration meant for a parent class to its subclasses', function (): void {
    Plugin::configureUsing(fn (Plugin $plugin) => $plugin instanceof ExtensibilityTestPlugin ? $plugin->label('from base') : null);

    expect(ExtensibilityTestPlugin::make()->label)->toBe('from base');
});

it('configures the core plugins and lets the field still override', function (): void {
    LinkPlugin::configureUsing(fn (LinkPlugin $plugin) => $plugin->protocols(['https']));

    expect(LinkPlugin::make()->getJsExtension()->getOptions()['protocols'])->toBe(['https'])
        ->and(LinkPlugin::make()->protocols(['tel'])->getJsExtension()->getOptions()['protocols'])->toBe(['tel']);
});

it('leaves plugins alone that no configuration targets', function (): void {
    ExtensibilityTestPlugin::configureUsing(fn (ExtensibilityTestPlugin $plugin) => $plugin->label('configured'));

    expect(BoldPlugin::make()->getId())->toBe('core/bold');
});

it('adds tools to an existing plugin', function (): void {
    RichEditorPlus::extendPlugin('core/bold', fn (PluginExtension $extension) => $extension->addTool(Tool::make('shout')->inline()->order(5)));

    $names = collect(PluginRegistry::make([BoldPlugin::make()])->getInlineTools())->map->getName()->all();

    expect($names)->toBe(['shout', 'bold']);
});

class PreparingTestPlugin extends Plugin implements PreparesRenderedContent
{
    /**
     * @var array<int, array<array-key, array<string, mixed>>>
     */
    public array $batches = [];

    public ?Closure $prepareUsing = null;

    public function getId(): string
    {
        return 'test/preparing';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function prepareRenderedContents(array $documents): array
    {
        $this->batches[] = $documents;

        return $this->prepareUsing ? ($this->prepareUsing)($documents) : $documents;
    }
}

it('hands a preparing plugin every document in one call', function (): void {
    $plugin = PreparingTestPlugin::make();
    $plugin->prepareUsing = fn (array $documents): array => array_map(
        fn (array $document): array => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'prepared']]]]],
        $documents,
    );

    $html = RichContentPlusRenderer::many(['x' => '<p>a</p>', 'y' => '<p>b</p>'])->plugins([$plugin])->toHtml();

    expect($plugin->batches)->toHaveCount(1)
        ->and(array_keys($plugin->batches[0]))->toBe(['x', 'y'])
        ->and($html)->toBe(['x' => '<p>prepared</p>', 'y' => '<p>prepared</p>']);
});

it('rejects a preparing plugin that changes the documents keys', function (): void {
    $plugin = PreparingTestPlugin::make();
    $plugin->prepareUsing = fn (array $documents): array => array_values($documents);

    RichContentPlusRenderer::many(['x' => '<p>a</p>'])->plugins([$plugin])->toHtml();
})->throws(LogicException::class);

it('adds actions, marks and JS modules to an existing plugin', function (): void {
    RichEditorPlus::extendPlugin('core/bold', fn (PluginExtension $extension) => $extension
        ->addMarks([MarkSpec::make('highlight')->parseTags(['mark'])->renderTag('mark')])
        ->addModule('https://cdn.test/extend-bold.js')
        ->addModule('https://cdn.test/extend-bold.js'));

    $registry = PluginRegistry::make([BoldPlugin::make()]);
    $descriptors = collect($registry->getJsExtensions())->keyBy('id');

    expect($descriptors['core/bold']['modules'])->toBe(['https://cdn.test/extend-bold.js'])
        ->and($descriptors['core/document'])->not->toHaveKey('modules')
        ->and(collect($registry->getMarks())->map(fn ($mark): string => $mark->getName())->all())->toContain('highlight');
});

it('renders content made with a mark added to an existing plugin', function (): void {
    RichEditorPlus::extendPlugin('core/bold', fn (PluginExtension $extension) => $extension
        ->addMarks([MarkSpec::make('highlight')->parseTags(['mark'])->renderTag('mark')]));

    $html = RichContentPlusRenderer::make([
        'type' => 'doc',
        'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'hi', 'marks' => [['type' => 'highlight']]]]]],
    ])->plugins([BoldPlugin::make()])->toHtml();

    expect($html)->toContain('<mark>hi</mark>');
});

it('extends a plugin by class name and hands the callback the plugin', function (): void {
    $received = null;

    RichEditorPlus::extendPlugin(BoldPlugin::class, function (PluginExtension $extension, $plugin) use (&$received): void {
        $received = $plugin;
    });

    PluginRegistry::make([BoldPlugin::make()]);

    expect($received)->toBeInstanceOf(BoldPlugin::class);
});

it('ignores extensions for plugins that are not in the editor', function (): void {
    RichEditorPlus::extendPlugin('core/italic', fn (PluginExtension $extension) => $extension->addTool(Tool::make('never')->inline()));

    $names = collect(PluginRegistry::make([BoldPlugin::make()])->getTools())->map->getName()->all();

    expect($names)->toBe(['bold']);
});

it('sends a plugin its own module along with the ones added to it', function (): void {
    RichEditorPlus::extendPlugin('test/extensible', fn (PluginExtension $extension) => $extension->addModule('https://cdn.test/added.js'));

    $descriptor = collect(PluginRegistry::make([ExtensibilityTestPlugin::make()])->getJsExtensions())->firstWhere('id', 'test/extensible');

    expect($descriptor['modules'])->toBe(['https://cdn.test/own.js', 'https://cdn.test/added.js']);
});

<?php

use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DocumentPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Tests\TestCase;

uses(TestCase::class);

// Package tests must not depend on plugins the host app registers globally.
beforeEach(fn (): mixed => PluginRegistry::flush());

function makeTestPlugin(string $id, int $priority = 100, array $dependencies = []): Plugin
{
    return new class($id, $priority, $dependencies) extends Plugin
    {
        public function __construct(
            protected string $id,
            protected int $priority,
            protected array $dependencies,
        ) {}

        public function getId(): string
        {
            return $this->id;
        }

        public function getPriority(): int
        {
            return $this->priority;
        }

        public function getDependencies(): array
        {
            return $this->dependencies;
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make($this->id);
        }
    };
}

it('always includes the document plugin, first', function (): void {
    $registry = PluginRegistry::make([BoldPlugin::make()]);

    expect(array_keys($registry->getPlugins()))->toBe([DocumentPlugin::ID, 'core/bold']);
});

it('does not add a second document plugin when one is supplied', function (): void {
    $registry = PluginRegistry::make([makeTestPlugin(DocumentPlugin::ID)]);

    expect($registry->getPlugins())->toHaveCount(1);
});

it('accepts class names as well as instances', function (): void {
    $registry = PluginRegistry::make([BoldPlugin::class, ItalicPlugin::make()]);

    expect($registry->has('core/bold'))->toBeTrue()
        ->and($registry->has('core/italic'))->toBeTrue();
});

it('rejects duplicate plugin ids', function (): void {
    PluginRegistry::make([BoldPlugin::make(), BoldPlugin::make()]);
})->throws(InvalidArgumentException::class, 'registered more than once');

it('rejects a plugin whose dependency is missing', function (): void {
    PluginRegistry::make([makeTestPlugin('test/child', dependencies: ['test/parent'])]);
})->throws(LogicException::class, 'requires [test/parent]');

it('accepts a plugin whose dependency is registered', function (): void {
    $registry = PluginRegistry::make([
        makeTestPlugin('test/child', dependencies: ['test/parent']),
        makeTestPlugin('test/parent'),
    ]);

    expect($registry->has('test/child'))->toBeTrue();
});

it('orders plugins by priority', function (): void {
    $registry = PluginRegistry::make([
        makeTestPlugin('test/late', priority: 300),
        makeTestPlugin('test/early', priority: 10),
    ]);

    expect(array_keys($registry->getPlugins()))->toBe([DocumentPlugin::ID, 'test/early', 'test/late']);
});

it('describes the JS extensions that have to be loaded', function (): void {
    $registry = PluginRegistry::make([BoldPlugin::make(), ItalicPlugin::make()]);

    expect($registry->getJsExtensions())->toBe([
        ['id' => 'core/document', 'options' => []],
        ['id' => 'core/bold', 'options' => []],
        ['id' => 'core/italic', 'options' => []],
    ]);
});

it('collects tools and PHP extensions from every plugin', function (): void {
    $registry = PluginRegistry::make(PluginRegistry::defaultPlugins());

    expect(collect($registry->getTools())->map->getName()->all())
        ->toEqualCanonicalizing([
            'bold', 'italic', 'underline', 'strikethrough',
            'blockquoteDecreaseLevel', 'blockquoteIncreaseLevel',
            'bulletListDecreaseLevel', 'bulletListIncreaseLevel',
            'orderedListDecreaseLevel', 'orderedListIncreaseLevel',
            'link', 'findReplace',
        ])
        ->and($registry->getNodes())->not->toBeEmpty();
});

it('sends the plugin module URL to the browser only when there is one', function (): void {
    $withModule = new class extends Plugin
    {
        public function getId(): string
        {
            return 'test/with-module';
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make('test/with-module', ['a' => 1])->module('https://cdn.test/plugin.js');
        }
    };

    $descriptors = collect(PluginRegistry::make([BoldPlugin::make(), $withModule])->getJsExtensions())->keyBy('id');

    expect($descriptors['test/with-module'])->toBe(['id' => 'test/with-module', 'options' => ['a' => 1], 'modules' => ['https://cdn.test/plugin.js']])
        ->and($descriptors['core/bold'])->not->toHaveKey('modules');
});

it('gathers overflow tools in display order, leaving out any with no command', function (): void {
    $plugin = new class extends Plugin
    {
        public function getId(): string
        {
            return 'test/overflow';
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make($this->getId());
        }

        public function getTools(): array
        {
            return [
                Tool::make('second')->command('second')->overflow()->order(2),
                Tool::make('first')->command('first')->overflow()->order(1),
                Tool::make('needsAction')->action('open')->overflow(),
                Tool::make('inline')->command('inline'),
            ];
        }
    };

    $registry = PluginRegistry::make([$plugin]);

    expect(collect($registry->getOverflowTools())->map->getName()->all())->toBe(['first', 'second'])
        ->and(collect($registry->getInlineTools())->map->getName()->all())->toBe(['inline'])
        ->and(collect($registry->getBlockToolbars())->flatten()->map->getName()->all())->not->toContain('first');
});

it('joins the editor html from every plugin that has some', function (): void {
    $withHtml = new class extends Plugin
    {
        public function getId(): string
        {
            return 'test/html';
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make($this->getId());
        }

        public function getEditorHtml(): ?string
        {
            return '<div data-test-panel></div>';
        }
    };

    expect(PluginRegistry::make([$withHtml])->getEditorHtml())->toBe('<div data-test-panel></div>')
        ->and(PluginRegistry::make([])->getEditorHtml())->toBe('');
});

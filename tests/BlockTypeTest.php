<?php

use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

/**
 * @param  array<BlockType>  $blockTypes
 * @param  array<mixed>  $nodes
 */
function makeBlockTypePlugin(string $id, array $blockTypes, array $nodes = []): Plugin
{
    return new class($id, $blockTypes, $nodes) extends Plugin
    {
        public function __construct(protected string $id, protected array $blockTypes, protected array $nodes) {}

        public function getId(): string
        {
            return $this->id;
        }

        public function getNodes(): array
        {
            return $this->nodes;
        }

        public function getJsExtension(): JsExtension
        {
            return JsExtension::make($this->id);
        }

        public function getBlockTypes(): array
        {
            return $this->blockTypes;
        }
    };
}

function sampleBlockType(string $name = 'sample', int $order = 0): BlockType
{
    return BlockType::make($name)->label('Sample')->node('sample')->command('setSample')->order($order);
}

it('describes a block type for the browser, with attributes as an object', function (): void {
    $type = BlockType::make('heading2')
        ->label('Heading 2')
        ->keywords(['title', 'h2'])
        ->node('heading', ['level' => 2])
        ->command('setHeading', [['level' => 2]])
        ->switchable();

    $config = PluginRegistry::make([makeBlockTypePlugin('test/a', [$type])])->getBlockTypesConfig();

    expect($config['heading2'])->toMatchArray([
        'label' => 'Heading 2',
        'keywords' => ['title', 'h2'],
        'command' => 'setHeading',
        'arguments' => [['level' => 2]],
        'action' => null,
        'switchable' => true,
    ])->and($config['heading2']['node']['name'])->toBe('heading')
        ->and(json_encode($config['heading2']['node']['attributes']))->toBe('{"level":2}');
});

it('encodes empty node attributes as an object', function (): void {
    $config = PluginRegistry::make([makeBlockTypePlugin('test/a', [sampleBlockType()])])->getBlockTypesConfig();

    expect(json_encode($config['sample']['node']['attributes']))->toBe('{}');
});

it('sorts block types by order across plugins', function (): void {
    $registry = PluginRegistry::make([
        makeBlockTypePlugin('test/a', [sampleBlockType('late', 20)]),
        makeBlockTypePlugin('test/b', [sampleBlockType('early', 5)]),
    ]);

    expect(array_map(fn (BlockType $type): string => $type->getName(), $registry->getBlockTypes()))
        ->toBe(['paragraph', 'early', 'late']);
});

it('includes block types added through extendPlugin', function (): void {
    RichEditorPlus::extendPlugin('core/bold', fn (PluginExtension $extension) => $extension->addBlockType(sampleBlockType('added')));

    expect(PluginRegistry::make([BoldPlugin::make()])->getBlockTypesConfig())->toHaveKey('added');
});

it('rejects duplicate block type names', function (): void {
    PluginRegistry::make([makeBlockTypePlugin('test/a', [sampleBlockType(), sampleBlockType()])]);
})->throws(InvalidArgumentException::class, 'block type [sample] is registered more than once');

it('rejects a switchable block type without a node', function (): void {
    PluginRegistry::make([makeBlockTypePlugin('test/a', [BlockType::make('bad')->command('setBad')->switchable()])]);
})->throws(InvalidArgumentException::class, 'block type [bad] must declare a node');

it('rejects a list block type without a node', function (): void {
    PluginRegistry::make([makeBlockTypePlugin('test/a', [BlockType::make('bad')->command('setBad')->listType()])]);
})->throws(InvalidArgumentException::class, 'block type [bad] must declare a node');

it('allows a block type that only runs a command to have no node', function (): void {
    $registry = PluginRegistry::make([makeBlockTypePlugin('test/a', [BlockType::make('run')->command('runIt')])]);

    expect($registry->getBlockTypesConfig()['run']['node']['name'])->toBeNull();
});

it('rejects a block type with no way to apply it', function (): void {
    PluginRegistry::make([makeBlockTypePlugin('test/a', [BlockType::make('bad')->node('bad')])]);
})->throws(InvalidArgumentException::class, 'block type [bad] needs a command or an action');

it('dedupes nodes shared between plugins', function (): void {
    $registry = PluginRegistry::make([
        makeBlockTypePlugin('test/a', [], [NodeSpec::make('listItem')]),
        makeBlockTypePlugin('test/b', [], [NodeSpec::make('listItem')]),
    ]);

    $names = array_map(fn ($node): string => $node->getName(), $registry->getNodes());

    expect(array_count_values($names)['listItem'])->toBe(1);
});

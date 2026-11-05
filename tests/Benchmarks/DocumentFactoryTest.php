<?php

use Webwizardsusa\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures\DocumentFactory;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

function benchNames(): array
{
    return [1 => 'Ada', 2 => 'Grace', 3 => "Seán O'Brien"];
}

/**
 * @param  array<string, mixed>  $node
 */
function countNodes(array $node, string $type): int
{
    $count = ($node['type'] ?? null) === $type ? 1 : 0;

    foreach ($node['content'] ?? [] as $child) {
        $count += countNodes($child, $type);
    }

    return $count;
}

/**
 * @param  array<string, mixed>  $node
 */
function listDepth(array $node): int
{
    $deepest = 0;

    foreach ($node['content'] ?? [] as $child) {
        $deepest = max($deepest, listDepth($child));
    }

    return $deepest + (($node['type'] ?? null) === 'bulletList' ? 1 : 0);
}

it('builds the same documents for the same seed', function (string $shape): void {
    $first = new DocumentFactory(7, benchNames());
    $second = new DocumentFactory(7, benchNames());

    expect([$first->make($shape), $first->make($shape)])->toBe([$second->make($shape), $second->make($shape)])
        ->and((new DocumentFactory(8, benchNames()))->make($shape))->not->toBe((new DocumentFactory(7, benchNames()))->make($shape));
})->with(DocumentFactory::SHAPES);

it('renders every shape', function (string $shape): void {
    $document = (new DocumentFactory(1, benchNames()))->make($shape);
    $plugins = BenchmarkPlugins::make(BenchmarkPlugins::inMemoryMentions(benchNames()));

    expect(RichContentPlusRenderer::make($document)->plugins($plugins)->toHtml())->toContain('rep-mention')->toContain('<p>');
})->with(DocumentFactory::SHAPES);

it('builds each shape to its size', function (): void {
    $factory = new DocumentFactory(1, benchNames());

    expect(count($factory->make('small')['content']))->toBe(5)
        ->and(count($factory->make('article')['content']))->toBe(40)
        ->and(countNodes($factory->make('article'), 'mention'))->toBe(3)
        ->and(countNodes($factory->make('mention-heavy'), 'mention'))->toBe(30)
        ->and(listDepth($factory->make('deep')))->toBeGreaterThanOrEqual(4);
});

it('builds documents without mentions when there is nobody to mention', function (): void {
    expect(countNodes((new DocumentFactory(1, []))->make('mention-heavy'), 'mention'))->toBe(0);
});

it('rejects an unknown shape', function (): void {
    (new DocumentFactory(1, benchNames()))->make('huge');
})->throws(InvalidArgumentException::class, 'Unknown fixture shape [huge].');

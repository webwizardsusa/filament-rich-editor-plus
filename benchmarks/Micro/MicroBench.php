<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Micro;

use Generator;
use Webwizardsusa\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures\DocumentFactory;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;

/**
 * Shared setup: the benchmark plugin set with mentions looked up in memory, so only the renderer is measured.
 */
abstract class MicroBench
{
    /**
     * @var array<EditorPlugin>
     */
    protected array $plugins = [];

    protected DocumentFactory $factory;

    /**
     * @return Generator<string, array{shape: string}>
     */
    public function provideShapes(): Generator
    {
        foreach (DocumentFactory::SHAPES as $shape) {
            yield $shape => ['shape' => $shape];
        }
    }

    /**
     * @return Generator<string, array{size: int}>
     */
    public function provideBatchSizes(): Generator
    {
        foreach ([1, 10, 50] as $size) {
            yield "{$size} docs" => ['size' => $size];
        }
    }

    protected function boot(): void
    {
        $names = [];

        for ($id = 1; $id <= 200; $id++) {
            $names[$id] = "Person {$id}";
        }

        $this->plugins = BenchmarkPlugins::make(BenchmarkPlugins::inMemoryMentions($names));
        $this->factory = new DocumentFactory(1, $names);
    }
}

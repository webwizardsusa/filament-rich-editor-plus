<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

/**
 * One way of storing, rendering and caching content. Every strategy must render exactly what `json` renders.
 */
interface ContentStrategy
{
    public function name(): string;

    /**
     * The write path. Creates a document when `$id` is null, otherwise updates it.
     *
     * @param  array<string, mixed>  $document
     */
    public function save(array $document, ?int $id = null): int;

    public function renderOne(int $id): string;

    /**
     * @param  array<int, int>  $ids
     * @return array<int, string> HTML keyed by document id, in the order given.
     */
    public function renderMany(array $ids): array;

    /**
     * A mentioned entity was renamed or deleted in `bench_mentionables`.
     */
    public function mentionableChanged(string $id): void;

    /**
     * The average bytes this strategy stores or caches per document.
     */
    public function bytesPerDocument(): float;
}

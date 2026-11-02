<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Illuminate\Cache\Repository;

/**
 * Caches another strategy's HTML. Keys include `updated_at` and the render version, so a save or a plugin change
 * misses; a renamed mention deletes the keys of every document that has it.
 */
class CachedStrategy implements ContentStrategy
{
    public function __construct(
        protected ContentStrategy $inner,
        protected DocumentStore $store,
        protected Repository $cache,
    ) {}

    public function name(): string
    {
        return 'cached';
    }

    public function save(array $document, ?int $id = null): int
    {
        return $this->inner->save($document, $id);
    }

    public function renderOne(int $id): string
    {
        $row = $this->store->row($id, ['updated_at', 'render_version']);

        return $this->cache->rememberForever(static::key($row), fn (): string => $this->inner->renderOne($id));
    }

    public function renderMany(array $ids): array
    {
        $keys = array_map(static::key(...), $this->store->rows($ids, ['updated_at', 'render_version']));
        $cached = $keys === [] ? [] : $this->cache->many(array_values($keys));

        $missing = array_keys(array_filter($keys, static fn (string $key): bool => ! is_string($cached[$key] ?? null)));
        $rendered = $missing === [] ? [] : $this->inner->renderMany($missing);

        if ($rendered !== []) {
            $this->cache->putMany(array_combine(
                array_map(static fn (int $id): string => $keys[$id], array_keys($rendered)),
                array_values($rendered),
            ));
        }

        $html = [];

        foreach ($keys as $id => $key) {
            $html[$id] = $rendered[$id] ?? $cached[$key];
        }

        return $html;
    }

    public function mentionableChanged(string $id): void
    {
        $documentIds = $this->store->documentsMentioning($id);

        if ($documentIds !== []) {
            $keys = array_map(static::key(...), $this->store->rows($documentIds, ['updated_at', 'render_version']));
            $this->cache->deleteMultiple(array_values($keys));
        }

        $this->inner->mentionableChanged($id);
    }

    /**
     * What the wrapped strategy stores, plus the serialized size of the cached HTML measured on the first 20 documents.
     */
    public function bytesPerDocument(): float
    {
        $html = $this->inner->renderMany($this->store->ids(20));

        if ($html === []) {
            return $this->inner->bytesPerDocument();
        }

        return $this->inner->bytesPerDocument()
            + array_sum(array_map(static fn (string $value): int => strlen(serialize($value)), $html)) / count($html);
    }

    public static function key(object $row): string
    {
        return "rep:doc:{$row->id}:{$row->updated_at}:{$row->render_version}";
    }
}

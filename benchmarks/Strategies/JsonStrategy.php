<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Strategies;

/**
 * The baseline: store the document JSON and render it on every read.
 */
class JsonStrategy extends Strategy
{
    public function name(): string
    {
        return 'json';
    }

    public function save(array $document, ?int $id = null): int
    {
        return $this->store->write($id, $document);
    }

    public function renderOne(int $id): string
    {
        return $this->renderer($this->store->row($id, ['body'])->body)->toHtml();
    }

    public function renderMany(array $ids): array
    {
        $bodies = array_map(static fn (object $row): string => $row->body, $this->store->rows($ids, ['body']));

        return $this->batch($bodies)->toHtml();
    }

    public function bytesPerDocument(): float
    {
        return $this->store->averageLength('body');
    }
}

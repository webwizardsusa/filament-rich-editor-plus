<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Strategies;

/**
 * Stores storable HTML next to the JSON, and renders it with the package's default path for HTML, which patches only
 * the nodes plugins refresh at render time.
 */
class StorableHtmlPatchStrategy extends Strategy
{
    public function name(): string
    {
        return 'storable-html:patch';
    }

    public function save(array $document, ?int $id = null): int
    {
        return $this->store->write($id, $document, ['storable_html' => $this->renderer($document)->toStorableHtml()]);
    }

    public function renderOne(int $id): string
    {
        return $this->renderer($this->store->row($id, ['storable_html'])->storable_html)->toHtml();
    }

    public function renderMany(array $ids): array
    {
        $html = array_map(static fn (object $row): string => $row->storable_html, $this->store->rows($ids, ['storable_html']));

        return $this->batch($html)->toHtml();
    }

    /**
     * The JSON body plus the HTML stored next to it.
     */
    public function bytesPerDocument(): float
    {
        return $this->store->averageLength('body') + $this->store->averageLength('storable_html');
    }
}

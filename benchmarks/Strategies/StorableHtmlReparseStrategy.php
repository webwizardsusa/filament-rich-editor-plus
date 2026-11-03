<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

/**
 * Stores storable HTML next to the JSON, and renders it by parsing it back into a document.
 */
class StorableHtmlReparseStrategy extends Strategy
{
    public function name(): string
    {
        return 'storable-html:reparse';
    }

    public function save(array $document, ?int $id = null): int
    {
        return $this->store->write($id, $document, ['storable_html' => $this->renderer($document)->toStorableHtml()]);
    }

    public function renderOne(int $id): string
    {
        return $this->renderer($this->store->row($id, ['storable_html'])->storable_html)->parseHtml()->toHtml();
    }

    public function renderMany(array $ids): array
    {
        $html = array_map(static fn (object $row): string => $row->storable_html, $this->store->rows($ids, ['storable_html']));

        return $this->batch($html)->parseHtml()->toHtml();
    }

    /**
     * The JSON body plus the HTML stored next to it.
     */
    public function bytesPerDocument(): float
    {
        return $this->store->averageLength('body') + $this->store->averageLength('storable_html');
    }
}

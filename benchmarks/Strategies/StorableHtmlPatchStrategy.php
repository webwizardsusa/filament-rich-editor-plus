<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

/**
 * Stores storable HTML next to the JSON, and renders it by patching only the mentions. The patcher is built per call,
 * as a request would build it.
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
        return $this->patcher()->patchMany([$this->store->row($id, ['storable_html'])->storable_html])[0];
    }

    public function renderMany(array $ids): array
    {
        $html = array_map(static fn (object $row): string => $row->storable_html, $this->store->rows($ids, ['storable_html']));

        return $this->patcher()->patchMany($html);
    }

    /**
     * The JSON body plus the HTML stored next to it.
     */
    public function bytesPerDocument(): float
    {
        return $this->store->averageLength('body') + $this->store->averageLength('storable_html');
    }

    protected function patcher(): MentionPatcher
    {
        return new MentionPatcher($this->store->plugins());
    }
}

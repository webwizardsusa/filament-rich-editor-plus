<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Strategies;

/**
 * Stores the final display HTML. Reads are a column read; a renamed mention re-renders every document that has it.
 */
class RenderedHtmlStrategy extends Strategy
{
    public function name(): string
    {
        return 'rendered-html';
    }

    public function save(array $document, ?int $id = null): int
    {
        return $this->store->write($id, $document, ['rendered_html' => $this->renderer($document)->toHtml()]);
    }

    public function renderOne(int $id): string
    {
        return $this->store->row($id, ['rendered_html'])->rendered_html;
    }

    public function renderMany(array $ids): array
    {
        return array_map(static fn (object $row): string => $row->rendered_html, $this->store->rows($ids, ['rendered_html']));
    }

    public function mentionableChanged(string $id): void
    {
        $documentIds = $this->store->documentsMentioning($id);

        if ($documentIds === []) {
            return;
        }

        $bodies = array_map(static fn (object $row): string => $row->body, $this->store->rows($documentIds, ['body']));

        foreach ($this->batch($bodies)->toHtml() as $documentId => $html) {
            $this->store->update($documentId, ['rendered_html' => $html]);
        }
    }

    /**
     * The JSON body plus the HTML stored next to it.
     */
    public function bytesPerDocument(): float
    {
        return $this->store->averageLength('body') + $this->store->averageLength('rendered_html');
    }
}

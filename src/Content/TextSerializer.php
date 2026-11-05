<?php

namespace Webwizardsusa\RichEditorPlus\Content;

/**
 * Turns a TipTap document into plain text: inline nodes join up, and blocks are separated by a blank line.
 */
class TextSerializer
{
    public function __construct(protected ContentSchema $schema) {}

    /**
     * @param  array<string, mixed>  $document
     */
    public function serialize(array $document): string
    {
        return $this->renderChildren($document['content'] ?? []);
    }

    protected function renderChildren(mixed $nodes): string
    {
        if (! is_array($nodes)) {
            return '';
        }

        $blocks = [];
        $line = '';

        foreach ($nodes as $node) {
            if (! is_array($node) || ! is_string($node['type'] ?? null)) {
                continue;
            }

            if ($node['type'] === 'text') {
                $line .= is_string($node['text'] ?? null) ? $node['text'] : '';

                continue;
            }

            $spec = $this->schema->node($node['type']);

            if ($spec?->isInline()) {
                $line .= $spec->renderText($node);

                continue;
            }

            $blocks[] = $line;
            $blocks[] = ($spec?->renderText($node) ?? '').$this->renderChildren($node['content'] ?? []);
            $line = '';
        }

        $blocks[] = $line;

        return implode("\n\n", array_filter($blocks, static fn (string $block): bool => $block !== ''));
    }
}

<?php

namespace Hollyit\RichEditorPlus\Content;

/**
 * Turns a TipTap document into HTML. Output is safe to print: every element and attribute comes from a spec, all text
 * and attribute values are escaped, and there is no way to output raw HTML. Malformed content is skipped.
 */
class HtmlSerializer
{
    protected const array VOID_TAGS = ['br', 'hr', 'img', 'col'];

    /**
     * @param  bool  $forStorage  Leaves out transient attributes, so display-only data never reaches stored HTML.
     */
    public function __construct(protected ContentSchema $schema, protected bool $forStorage = false) {}

    /**
     * @param  array<string, mixed>  $document
     */
    public function serialize(array $document): string
    {
        return $this->renderChildren($document['content'] ?? [], true);
    }

    protected function renderChildren(mixed $nodes, bool $allowsMarks): string
    {
        if (! is_array($nodes)) {
            return '';
        }

        $html = '';

        /** @var array<array{mark: array<string, mixed>, close: string}> $open */
        $open = [];

        foreach ($nodes as $node) {
            if (! is_array($node) || ! is_string($node['type'] ?? null)) {
                continue;
            }

            $marks = $allowsMarks ? $this->knownMarks($node) : [];
            $shared = $this->countSharedMarks($open, $marks);

            while (count($open) > $shared) {
                $html .= array_pop($open)['close'];
            }

            foreach (array_slice($marks, $shared) as $mark) {
                [$opening, $closing] = $this->pieces($this->schema->mark($mark['type'])->render($mark, $this->forStorage));

                $html .= $opening;
                $open[] = ['mark' => $mark, 'close' => $closing];
            }

            $html .= $this->renderNode($node);
        }

        while ($open !== []) {
            $html .= array_pop($open)['close'];
        }

        return $html;
    }

    /**
     * @param  array<string, mixed>  $node
     */
    protected function renderNode(array $node): string
    {
        if ($node['type'] === 'text') {
            return is_string($node['text'] ?? null) ? $this->escapeText($node['text']) : '';
        }

        $spec = $this->schema->node($node['type']);

        if ($spec === null) {
            return $this->renderChildren($node['content'] ?? [], true);
        }

        [$opening, $closing] = $this->pieces($spec->render($node, $this->forStorage));

        if ($spec->isAtom()) {
            return $opening.$closing;
        }

        return $opening.$this->renderChildren($node['content'] ?? [], $spec->allowsMarks()).$closing;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<array<string, mixed>>
     */
    protected function knownMarks(array $node): array
    {
        if (! is_array($node['marks'] ?? null)) {
            return [];
        }

        return array_values(array_filter(
            $node['marks'],
            fn (mixed $mark): bool => is_array($mark)
                && is_string($mark['type'] ?? null)
                && $this->schema->mark($mark['type']) !== null,
        ));
    }

    /**
     * @param  array<array{mark: array<string, mixed>, close: string}>  $open
     * @param  array<array<string, mixed>>  $marks
     */
    protected function countSharedMarks(array $open, array $marks): int
    {
        $shared = 0;

        foreach ($open as $index => $entry) {
            $mark = $marks[$index] ?? null;

            if ($mark === null || $mark['type'] !== $entry['mark']['type'] || ($mark['attrs'] ?? []) != ($entry['mark']['attrs'] ?? [])) {
                break;
            }

            $shared++;
        }

        return $shared;
    }

    /**
     * @param  array<mixed>  $dom  `['tag', $attributes, 0]`, where the attributes are optional.
     * @return array{0: string, 1: string} The HTML before and after the children.
     */
    protected function pieces(array $dom): array
    {
        $tag = array_shift($dom);

        if (! is_string($tag) || preg_match('/^[a-zA-Z][a-zA-Z0-9-]*$/', $tag) !== 1) {
            return ['', ''];
        }

        $attributes = [];

        if (is_array($dom[0] ?? null) && ($dom[0] === [] || ! array_is_list($dom[0]))) {
            $attributes = array_shift($dom);
        }

        $child = $dom[0] ?? null;
        $opening = "<{$tag}{$this->renderAttributes($attributes)}>";

        if (in_array(strtolower($tag), self::VOID_TAGS, true)) {
            return [$opening, ''];
        }

        $closing = "</{$tag}>";

        if (is_string($child)) {
            return [$opening.$this->escapeText($child), $closing];
        }

        if (is_array($child)) {
            [$innerOpening, $innerClosing] = $this->pieces($child);

            return [$opening.$innerOpening, $innerClosing.$closing];
        }

        return [$opening, $closing];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function renderAttributes(array $attributes): string
    {
        $html = '';

        foreach ($attributes as $name => $value) {
            $name = (string) $name;

            if (! is_scalar($value) || $value === false) {
                continue;
            }

            if (preg_match('/^[a-zA-Z][a-zA-Z0-9:_.-]*$/', $name) !== 1 || str_starts_with(strtolower($name), 'on')) {
                continue;
            }

            $html .= ' '.$name.'="'.htmlspecialchars((string) $value, ENT_COMPAT | ENT_SUBSTITUTE, 'UTF-8').'"';
        }

        return $html;
    }

    protected function escapeText(string $text): string
    {
        return htmlspecialchars($text, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

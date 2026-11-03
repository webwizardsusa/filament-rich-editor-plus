<?php

namespace Hollyit\RichEditorPlus\Content;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;

/**
 * Turns HTML into a TipTap document. It maps tags to nodes and marks and does not repair structure: `<li>x</li>` becomes
 * a list item holding text, which the browser may refuse. Unknown tags unwrap and keep their children.
 */
class HtmlParser
{
    protected const array IGNORED_TAGS = ['script', 'style', 'template', 'head', 'title', 'noscript', 'object'];

    /**
     * Tags that separate their text from what is around it, so unwrapping them must not join words.
     */
    protected const array BLOCK_TAGS = [
        'address', 'article', 'aside', 'center', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'footer', 'form',
        'header', 'main', 'nav', 'section',
    ];

    public function __construct(protected ContentSchema $schema) {}

    /**
     * @return array{type: 'doc', content: array<array<string, mixed>>}
     */
    public function parse(string $html): array
    {
        $body = $this->loadBody($html);

        return [
            'type' => 'doc',
            'content' => $body ? $this->finish($this->collect($body, [], false, true), false) : [],
        ];
    }

    protected function loadBody(string $html): ?DOMElement
    {
        $html = str_replace("\0", '', mb_scrub($html, 'UTF-8'));

        if (trim($html) === '') {
            return null;
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $usedInternalErrors = libxml_use_internal_errors(true);

        $document->loadHTML('<?xml encoding="utf-8" ?><html><body>'.$html.'</body></html>');

        libxml_clear_errors();
        libxml_use_internal_errors($usedInternalErrors);

        $body = $document->getElementsByTagName('body')->item(0);

        return $body instanceof DOMElement ? $body : null;
    }

    /**
     * Gathers nodes without tidying, because a mark or unwrapped tag isn't an edge of the text around it.
     *
     * @param  array<array<string, mixed>>  $marks
     * @return array<array<string, mixed>>
     */
    protected function collect(DOMNode $parent, array $marks, bool $preservesWhitespace, bool $allowsMarks): array
    {
        $nodes = [];

        foreach ($parent->childNodes as $child) {
            if ($child instanceof DOMText) {
                $text = $preservesWhitespace ? $child->data : preg_replace('/[ \t\r\n\f]+/', ' ', $child->data);

                $nodes[] = $this->textNode($text, $marks);
            } elseif ($child instanceof DOMElement) {
                array_push($nodes, ...$this->parseElement($child, $marks, $preservesWhitespace, $allowsMarks));
            }
        }

        return $nodes;
    }

    /**
     * @param  array<array<string, mixed>>  $marks
     * @return array<array<string, mixed>>
     */
    protected function parseElement(DOMElement $element, array $marks, bool $preservesWhitespace, bool $allowsMarks): array
    {
        $tag = strtolower($element->tagName);

        if (in_array($tag, self::IGNORED_TAGS, true)) {
            return [];
        }

        if ($preservesWhitespace && $tag === 'br') {
            return [$this->textNode("\n", [])];
        }

        $node = $this->schema->matchNode($element);

        if ($node !== null) {
            return [$this->buildNode($element, $node[0], $node[1], $marks)];
        }

        $childMarks = $allowsMarks ? $this->addMarks($marks, $element) : $marks;
        $children = $this->collect($element, $childMarks, $preservesWhitespace, $allowsMarks);

        if (! $preservesWhitespace && in_array($tag, self::BLOCK_TAGS, true)) {
            return [$this->textNode(' ', $marks), ...$children, $this->textNode(' ', $marks)];
        }

        return $children;
    }

    /**
     * @param  array<string, mixed>  $matched
     * @param  array<array<string, mixed>>  $marks
     * @return array<string, mixed>
     */
    protected function buildNode(DOMElement $element, NodeSpec $spec, array $matched, array $marks): array
    {
        $node = ['type' => $spec->getName()];
        $attributes = $spec->parseAttributes($element, $matched);

        if ($attributes !== []) {
            $node['attrs'] = $attributes;
        }

        if (! $spec->isAtom()) {
            $preservesWhitespace = $spec->preservesWhitespace();
            $allowsMarks = $spec->allowsMarks();

            $content = $this->finish(
                $this->collect($element, $allowsMarks ? $marks : [], $preservesWhitespace, $allowsMarks),
                $preservesWhitespace,
            );

            if ($content !== []) {
                $node['content'] = $content;
            }
        }

        if ($spec->isInline() && $marks !== []) {
            $node['marks'] = $marks;
        }

        return $node;
    }

    /**
     * Whether a mark already on the text excludes the new one, in which case the new mark is not added at all. A mark
     * that the new one excludes too does not count: the new mark replaces it instead.
     *
     * @param  array<string, array<string, mixed>>  $byType
     */
    protected function isExcludedByExistingMark(MarkSpec $spec, array $byType): bool
    {
        foreach (array_keys($byType) as $other) {
            if ($other === $spec->getName() || $spec->excludesMark($other)) {
                continue;
            }

            if ($this->schema->mark($other)?->excludesMark($spec->getName())) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<array<string, mixed>>  $marks
     * @return array<array<string, mixed>>
     */
    protected function addMarks(array $marks, DOMElement $element): array
    {
        $byType = array_column($marks, null, 'type');

        foreach ($this->schema->matchMarks($element) as [$spec, $matched]) {
            $name = $spec->getName();
            $mark = ['type' => $name];
            $attributes = $spec->parseAttributes($element, $matched);

            if ($attributes !== []) {
                $mark['attrs'] = $attributes;
            }

            if ($this->isExcludedByExistingMark($spec, $byType)) {
                continue;
            }

            foreach (array_keys($byType) as $other) {
                if ($other !== $name && $spec->excludesMark($other)) {
                    unset($byType[$other]);
                }
            }

            $byType[$name] = $mark;
        }

        $ordered = array_values($byType);

        usort($ordered, fn (array $a, array $b): int => $this->schema->markRank($a['type']) <=> $this->schema->markRank($b['type']));

        return $ordered;
    }

    /**
     * @param  array<array<string, mixed>>  $marks
     * @return array<string, mixed>
     */
    protected function textNode(string $text, array $marks): array
    {
        return ['type' => 'text', 'text' => $text, ...($marks === [] ? [] : ['marks' => $marks])];
    }

    /**
     * @param  array<array<string, mixed>>  $nodes
     * @return array<array<string, mixed>>
     */
    protected function finish(array $nodes, bool $preservesWhitespace): array
    {
        return $this->mergeText($preservesWhitespace ? $nodes : $this->tidyWhitespace($nodes));
    }

    /**
     * Removes spaces that a browser wouldn't show: at the edges of a run of inline content, and repeated across marks.
     *
     * @param  array<array<string, mixed>>  $nodes
     * @return array<array<string, mixed>>
     */
    protected function tidyWhitespace(array $nodes): array
    {
        $tidied = [];

        foreach ($nodes as $node) {
            $previous = $tidied === [] ? null : $tidied[array_key_last($tidied)];

            if ($node['type'] === 'text') {
                $startsRun = $previous === null || $this->isBlock($previous);

                if ($startsRun || str_ends_with($previous['text'] ?? '', ' ')) {
                    $node['text'] = ltrim($node['text'], ' ');
                }

                if ($node['text'] === '') {
                    continue;
                }
            } elseif ($this->isBlock($node)) {
                $tidied = $this->trimEnd($tidied);
            }

            $tidied[] = $node;
        }

        return $this->trimEnd($tidied);
    }

    /**
     * @param  array<array<string, mixed>>  $nodes
     * @return array<array<string, mixed>>
     */
    protected function trimEnd(array $nodes): array
    {
        while ($nodes !== []) {
            $last = array_key_last($nodes);

            if ($nodes[$last]['type'] !== 'text') {
                break;
            }

            $nodes[$last]['text'] = rtrim($nodes[$last]['text'], ' ');

            if ($nodes[$last]['text'] !== '') {
                break;
            }

            unset($nodes[$last]);
        }

        return array_values($nodes);
    }

    /**
     * @param  array<string, mixed>  $node
     */
    protected function isBlock(array $node): bool
    {
        return $node['type'] !== 'text' && ! $this->schema->node($node['type'])?->isInline();
    }

    /**
     * @param  array<array<string, mixed>>  $nodes
     * @return array<array<string, mixed>>
     */
    protected function mergeText(array $nodes): array
    {
        $merged = [];

        foreach ($nodes as $node) {
            $last = array_key_last($merged);

            if (
                $last !== null
                && $node['type'] === 'text'
                && $merged[$last]['type'] === 'text'
                && ($merged[$last]['marks'] ?? []) == ($node['marks'] ?? [])
            ) {
                $merged[$last]['text'] .= $node['text'];

                continue;
            }

            $merged[] = $node;
        }

        return $merged;
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Pretty-prints editor HTML for reading and editing: each block on its own line, indented by nesting. Inline markup
 * stays on its block's line and a `<pre>` is written as it is, so formatting never changes the content.
 */
class HtmlFormatter
{
    /**
     * Elements laid out as blocks. Anything else is inline and stays on the line it is on.
     *
     * @var array<string>
     */
    public const array BLOCK_ELEMENTS = [
        'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'div', 'dl', 'dt', 'figcaption', 'figure',
        'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
        'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
    ];

    protected const string INDENT = '  ';

    protected DOMDocument $document;

    public static function format(string $html): string
    {
        return (new static)->formatHtml($html);
    }

    public function formatHtml(string $html): string
    {
        $html = str_replace("\0", '', mb_scrub($html, 'UTF-8'));

        if (trim($html) === '') {
            return '';
        }

        $this->document = new DOMDocument('1.0', 'UTF-8');
        $usedInternalErrors = libxml_use_internal_errors(true);

        $this->document->loadHTML('<?xml encoding="utf-8" ?><html><body>'.$html.'</body></html>');

        libxml_clear_errors();
        libxml_use_internal_errors($usedInternalErrors);

        $body = $this->document->getElementsByTagName('body')->item(0);

        return $body === null ? '' : implode("\n", $this->formatChildren($body, 0));
    }

    /**
     * The lines for a node's children. Runs of inline nodes between blocks share one line.
     *
     * @return array<string>
     */
    protected function formatChildren(DOMNode $parent, int $depth): array
    {
        $lines = [];
        $inline = '';

        foreach ($parent->childNodes as $child) {
            if (! $this->isBlock($child)) {
                $inline .= $this->document->saveHTML($child);

                continue;
            }

            $lines = [...$lines, ...$this->inlineLine($inline, $depth), ...$this->formatBlock($child, $depth)];
            $inline = '';
        }

        return [...$lines, ...$this->inlineLine($inline, $depth)];
    }

    /**
     * @return array<string>
     */
    protected function formatBlock(DOMElement $element, int $depth): array
    {
        $indent = str_repeat(self::INDENT, $depth);

        if ($element->tagName === 'pre' || ! $this->hasBlockChildren($element)) {
            return [$indent.$this->document->saveHTML($element)];
        }

        return [
            $indent.$this->openingTag($element),
            ...$this->formatChildren($element, $depth + 1),
            $indent.'</'.$element->tagName.'>',
        ];
    }

    /**
     * @return array<string>
     */
    protected function inlineLine(string $html, int $depth): array
    {
        $html = trim($html);

        return $html === '' ? [] : [str_repeat(self::INDENT, $depth).$html];
    }

    protected function openingTag(DOMElement $element): string
    {
        $tag = '<'.$element->tagName;

        foreach ($element->attributes ?? [] as $attribute) {
            $tag .= ' '.$attribute->name.'="'.htmlspecialchars($attribute->value, ENT_COMPAT | ENT_HTML5).'"';
        }

        return $tag.'>';
    }

    protected function hasBlockChildren(DOMElement $element): bool
    {
        foreach ($element->childNodes as $child) {
            if ($this->isBlock($child)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @phpstan-assert-if-true DOMElement $node
     */
    protected function isBlock(DOMNode $node): bool
    {
        return $node instanceof DOMElement
            && in_array(strtolower($node->tagName), self::BLOCK_ELEMENTS, true);
    }
}

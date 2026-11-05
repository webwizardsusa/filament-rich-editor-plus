<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing;

use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;

/**
 * A document to Markdown with the given rules. Strict (for storage) throws on nodes and marks without a rule; lenient
 * (for export) writes such nodes as their text and drops such marks.
 */
class MarkdownSerializer
{
    /**
     * @param  array<string, NodeRule>  $nodeRules
     * @param  array<string, MarkRule>  $markRules
     */
    public function __construct(protected array $nodeRules, protected array $markRules, protected bool $strict = true) {}

    /**
     * @param  array<string, mixed>  $document
     *
     * @throws UnsupportedContentFormatException When strict and the document has a node or mark without a rule.
     */
    public function serialize(array $document, ContentSchema $schema): string
    {
        $markdown = (new MarkdownWriter($this->nodeRules, $this->markRules, $schema, $this->strict))
            ->renderBlocks($document['content'] ?? []);

        return $markdown === '' ? '' : $markdown."\n";
    }
}

<?php

namespace Hollyit\RichEditorPlus\Plugins\Markdown\Serializing;

use Closure;

/**
 * Writes one node type as Markdown through the {@see MarkdownWriter}: block rules write their block (the writer adds
 * blank lines between blocks), inline rules write their inline text.
 */
final class NodeRule
{
    /**
     * @param  Closure(array<string, mixed>, MarkdownWriter): void  $render
     */
    public function __construct(private Closure $render) {}

    /**
     * @param  Closure(array<string, mixed>, MarkdownWriter): void  $render
     */
    public static function using(Closure $render): self
    {
        return new self($render);
    }

    /**
     * @param  array<string, mixed>  $node
     */
    public function render(array $node, MarkdownWriter $writer): void
    {
        ($this->render)($node, $writer);
    }
}

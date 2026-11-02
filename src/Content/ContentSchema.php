<?php

namespace Hollyit\RichEditorPlus\Content;

use DOMElement;
use Hollyit\RichEditorPlus\Support\PluginRegistry;

/**
 * The nodes and marks one editor understands. `doc` and `text` are built into the engine.
 */
class ContentSchema
{
    /**
     * @var array<string, NodeSpec>
     */
    protected array $nodes = [];

    /**
     * @var array<string, MarkSpec>
     */
    protected array $marks = [];

    /**
     * @var array<string, int>
     */
    protected array $markRanks = [];

    /**
     * @param  array<NodeSpec>  $nodes
     * @param  array<MarkSpec>  $marks
     */
    public function __construct(array $nodes, array $marks)
    {
        foreach ($this->sortByPriority($nodes) as $node) {
            $this->nodes[$node->getName()] = $node;
        }

        foreach ($this->sortByPriority($marks) as $mark) {
            $this->marks[$mark->getName()] = $mark;
        }

        $this->markRanks = array_flip(array_keys($this->marks));
    }

    public static function fromRegistry(PluginRegistry $registry): static
    {
        return new static($registry->getNodes(), $registry->getMarks());
    }

    public function node(string $name): ?NodeSpec
    {
        return $this->nodes[$name] ?? null;
    }

    public function mark(string $name): ?MarkSpec
    {
        return $this->marks[$name] ?? null;
    }

    /**
     * @return array{0: NodeSpec, 1: array<string, mixed>} | null
     */
    public function matchNode(DOMElement $element): ?array
    {
        foreach ($this->nodes as $node) {
            $matched = $node->match($element);

            if ($matched !== null) {
                return [$node, $matched];
            }
        }

        return null;
    }

    /**
     * @return array<array{0: MarkSpec, 1: array<string, mixed>}>
     */
    public function matchMarks(DOMElement $element): array
    {
        $matches = [];

        foreach ($this->marks as $mark) {
            $matched = $mark->match($element);

            if ($matched !== null) {
                $matches[] = [$mark, $matched];
            }
        }

        return $matches;
    }

    public function markRank(string $name): int
    {
        return $this->markRanks[$name] ?? PHP_INT_MAX;
    }

    /**
     * @template TSpec of ContentSpec
     *
     * @param  array<TSpec>  $specs
     * @return array<TSpec>
     */
    protected function sortByPriority(array $specs): array
    {
        usort($specs, static fn (ContentSpec $a, ContentSpec $b): int => $b->getPriority() <=> $a->getPriority());

        return $specs;
    }
}

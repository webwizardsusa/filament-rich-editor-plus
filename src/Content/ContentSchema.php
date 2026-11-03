<?php

namespace Hollyit\RichEditorPlus\Content;

use DOMElement;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use InvalidArgumentException;

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
     * @param  array<GlobalAttribute>  $globalAttributes  Added, in order, to copies of the specs they name.
     *
     * @throws InvalidArgumentException When a global attribute is invalid or shares its name with another attribute of a spec.
     */
    public function __construct(array $nodes, array $marks, array $globalAttributes = [])
    {
        $nodeNames = array_map(static fn (NodeSpec $node): string => $node->getName(), $nodes);
        $markNames = array_map(static fn (MarkSpec $mark): string => $mark->getName(), $marks);
        $types = [];

        foreach ($globalAttributes as $index => $attribute) {
            $attribute->assertValid();
            $types[$index] = $attribute->resolveTypes($nodeNames, $markNames);
        }

        $withGlobalAttributes = static function (ContentSpec $spec) use ($globalAttributes, $types): ContentSpec {
            $copy = null;
            $added = [];

            foreach ($globalAttributes as $index => $attribute) {
                if (in_array($spec->getName(), $types[$index], true)) {
                    if ($spec->declaresAttribute($attribute->getName()) || isset($added[$attribute->getName()])) {
                        throw new InvalidArgumentException("The global attribute [{$attribute->getName()}] can't be added to [{$spec->getName()}], which already has an attribute with that name.");
                    }

                    $added[$attribute->getName()] = true;
                    $copy ??= clone $spec;
                    $copy->globalAttribute($attribute);
                }
            }

            return $copy ?? $spec;
        };

        foreach ($this->sortByPriority(array_map($withGlobalAttributes, $nodes)) as $node) {
            $this->nodes[$node->getName()] = $node;
        }

        foreach ($this->sortByPriority(array_map($withGlobalAttributes, $marks)) as $mark) {
            $this->marks[$mark->getName()] = $mark;
        }

        $this->markRanks = array_flip(array_keys($this->marks));
    }

    public static function fromRegistry(PluginRegistry $registry): static
    {
        return new static($registry->getNodes(), $registry->getMarks(), $registry->getGlobalAttributes());
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

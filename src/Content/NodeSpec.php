<?php

namespace Webwizardsusa\RichEditorPlus\Content;

/**
 * A block or inline node. See {@see ContentSpec}.
 */
class NodeSpec extends ContentSpec
{
    protected bool $isAtom = false;

    protected bool $isInline = false;

    protected bool $preservesWhitespace = false;

    protected bool $allowsMarks = true;

    /**
     * A node with no children. Anything inside its element is ignored when parsing.
     */
    public function atom(): static
    {
        $this->isAtom = true;

        return $this;
    }

    public function inline(): static
    {
        $this->isInline = true;

        return $this;
    }

    public function preserveWhitespace(): static
    {
        $this->preservesWhitespace = true;

        return $this;
    }

    public function withoutMarks(): static
    {
        $this->allowsMarks = false;

        return $this;
    }

    public function isAtom(): bool
    {
        return $this->isAtom;
    }

    public function isInline(): bool
    {
        return $this->isInline;
    }

    public function preservesWhitespace(): bool
    {
        return $this->preservesWhitespace;
    }

    public function allowsMarks(): bool
    {
        return $this->allowsMarks;
    }
}

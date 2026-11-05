<?php

namespace Webwizardsusa\RichEditorPlus\Content;

/**
 * A mark such as bold or a link. See {@see ContentSpec}.
 */
class MarkSpec extends ContentSpec
{
    /**
     * @var array<string> | string
     */
    protected array|string $excludes = [];

    /**
     * Marks that can't share text with this one, as in TipTap. `'_'` means every other mark. When text gets a mark that
     * excludes one it already has, the old one is removed; a mark that an existing mark excludes is not added.
     *
     * @param  array<string> | string  $marks
     */
    public function excludes(array|string $marks): static
    {
        $this->excludes = $marks;

        return $this;
    }

    public function excludesMark(string $name): bool
    {
        if ($this->excludes === '_') {
            return $name !== $this->name;
        }

        return in_array($name, (array) $this->excludes, true);
    }
}

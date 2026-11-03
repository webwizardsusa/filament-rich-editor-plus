<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

use Hollyit\RichEditorPlus\Content\GlobalAttribute;

/**
 * A plugin that adds attributes to nodes and marks other plugins own, such as text alignment on paragraphs and
 * headings. The server parses and renders them, and the browser gets them as a generated TipTap extension.
 */
interface ProvidesGlobalAttributes
{
    /**
     * @return array<GlobalAttribute>
     */
    public function getGlobalAttributes(): array;
}

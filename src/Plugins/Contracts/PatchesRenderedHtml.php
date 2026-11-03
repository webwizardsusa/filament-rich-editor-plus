<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

/**
 * For plugins that prepare rendered content by refreshing only certain nodes, such as mentions. Declaring those nodes
 * lets stored HTML be rendered by patching just their elements instead of parsing the whole document.
 *
 * Each declared node must be an atom whose HTML is a single element marked `data-type="<node name>"`, with only text
 * inside, and the plugin's `prepareRenderedContents()` must only change those nodes.
 */
interface PatchesRenderedHtml extends PreparesRenderedContent
{
    /**
     * @return array<int, string> Names of the nodes this plugin refreshes at render time.
     */
    public function getRenderedNodes(): array;
}

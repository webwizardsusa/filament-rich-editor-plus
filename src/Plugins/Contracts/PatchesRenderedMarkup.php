<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

/**
 * For plugins whose rendered nodes are elements that contain markup, such as an image's `<figure>` with an `<img>` and a
 * `<figcaption>`. The patcher matches such an element from its opening tag (marked `data-type="<node name>"`) to the
 * first closing tag of the same name, so the element must never contain another element with its own tag name. A
 * document whose element does not parse back to one node of its type is rendered by parsing it whole.
 */
interface PatchesRenderedMarkup extends PatchesRenderedHtml
{
    /**
     * @return array<int, string> Names of rendered nodes (also returned by `getRenderedNodes()`) whose element contains markup.
     */
    public function getRenderedMarkupNodes(): array;
}

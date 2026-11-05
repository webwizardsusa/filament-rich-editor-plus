<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Contracts;

/**
 * For plugins that need to change documents just before they are rendered for display, such as filling in data looked
 * up on the server. The plugin gets every document being rendered at once, so it can make each lookup once for the
 * whole batch rather than once per document. The stored documents are never changed.
 */
interface PreparesRenderedContent
{
    /**
     * @param  array<array-key, array<string, mixed>>  $documents
     * @return array<array-key, array<string, mixed>> The same keys, in the same order.
     */
    public function prepareRenderedContents(array $documents): array;
}

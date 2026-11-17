<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Contracts;

/**
 * For plugins that rewrite the HTML rendered for display, such as highlighting code blocks. The plugin gets every
 * piece of HTML being rendered at once, after patching or serializing, so it can share work across the batch. It only
 * runs for display (`toHtml()`), never on HTML for storage or on other formats.
 *
 * The HTML it returns is printed as it is, so the plugin must escape anything it adds.
 */
interface TransformsRenderedHtml
{
    /**
     * @param  array<array-key, string>  $htmls
     * @return array<array-key, string> The same keys, in the same order.
     */
    public function transformRenderedHtml(array $htmls): array;
}

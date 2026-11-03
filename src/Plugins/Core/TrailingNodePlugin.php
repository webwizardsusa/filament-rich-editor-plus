<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;

/**
 * Keeps an empty paragraph at the end of the document, so there is always somewhere to type after a table or code
 * block. Content that ends with such a block is saved with a trailing `<p></p>`.
 */
class TrailingNodePlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/trailing-node';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

/**
 * Keeps an empty paragraph at the end of the document, so there is always somewhere to type after a table or code
 * block. Content that ends with anything other than a paragraph (a heading, list, quote, table or code block) gets a
 * trailing `<p></p>`. The editor adds it on the first interaction with it, which can mark a form as changed.
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

<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use Webwizardsusa\RichEditorPlus\Actions\HtmlSourceAction;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

/**
 * An "HTML source" item in the toolbar's more menu, which opens the field's content as HTML in a modal to view and
 * edit. See {@see HtmlSourceAction}.
 */
class HtmlSourcePlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/html-source';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getActions(): array
    {
        return [HtmlSourceAction::make()];
    }

    public function getTools(): array
    {
        return [
            Tool::make('htmlSource')
                ->label(__('rich-editor-plus::tools.html_source'))
                ->icon('mdi-code-tags')
                ->action('htmlSource')
                ->overflow(),
        ];
    }
}

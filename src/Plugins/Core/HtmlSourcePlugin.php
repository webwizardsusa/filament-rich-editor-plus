<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Hollyit\RichEditorPlus\Actions\HtmlSourceAction;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

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

<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use DOMElement;
use Webwizardsusa\RichEditorPlus\Content\MarkSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

class UnderlinePlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/underline';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('underline')
                ->parseTags(['u'])
                ->parseUsing(static fn (DOMElement $element): bool => str_contains(MarkSpec::styleValue($element, 'text-decoration') ?? '', 'underline'))
                ->renderTag('u'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('underline')
                ->label(__('rich-editor-plus::tools.underline'))
                ->icon('mdi-format-underline')
                ->shortcut('Mod-u')
                ->command('toggleUnderline')
                ->active('underline')
                ->inline()
                ->group('format')
                ->order(30),
        ];
    }
}

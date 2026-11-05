<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use DOMElement;
use Webwizardsusa\RichEditorPlus\Content\MarkSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

/**
 * Subscript text. It replaces superscript on the same text.
 */
class SubscriptPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/subscript';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('subscript')
                ->parseTags(['sub'])
                ->parseUsing(static fn (DOMElement $element): bool => MarkSpec::styleValue($element, 'vertical-align') === 'sub')
                ->excludes(['superscript'])
                ->renderTag('sub'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('subscript')
                ->label(__('rich-editor-plus::tools.subscript'))
                ->icon('mdi-format-subscript')
                ->shortcut('Mod-,')
                ->command('toggleSubscript')
                ->active('subscript')
                ->overflow()
                ->group('format')
                ->order(60),
        ];
    }
}

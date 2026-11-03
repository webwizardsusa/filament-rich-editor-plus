<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

class ItalicPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/italic';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('italic')
                ->parseTags(['em'])
                ->parseUsing(static function (DOMElement $element): bool {
                    $style = MarkSpec::styleValue($element, 'font-style');

                    return strtolower($element->tagName) === 'i' ? $style !== 'normal' : $style === 'italic';
                })
                ->renderTag('em'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('italic')
                ->label(__('rich-editor-plus::tools.italic'))
                ->icon('mdi-format-italic')
                ->shortcut('Mod-i')
                ->command('toggleItalic')
                ->active('italic')
                ->inline()
                ->group('format')
                ->order(20),
        ];
    }
}

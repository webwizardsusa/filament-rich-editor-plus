<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

class StrikethroughPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/strikethrough';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('strike')
                ->parseTags(['s', 'del', 'strike'])
                ->parseUsing(static fn (DOMElement $element): bool => str_contains(MarkSpec::styleValue($element, 'text-decoration') ?? '', 'line-through'))
                ->renderTag('s'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('strikethrough')
                ->label(__('rich-editor-plus::tools.strikethrough'))
                ->icon('mdi-format-strikethrough')
                ->shortcut('Mod-Shift-s')
                ->command('toggleStrike')
                ->active('strike')
                ->inline()
                ->group('format')
                ->order(40),
        ];
    }
}

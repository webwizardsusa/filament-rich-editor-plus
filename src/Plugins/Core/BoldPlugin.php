<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

class BoldPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/bold';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('bold')
                ->parseTags(['strong'])
                ->parseUsing(static function (DOMElement $element): bool {
                    $weight = MarkSpec::styleValue($element, 'font-weight');

                    if (strtolower($element->tagName) === 'b') {
                        return $weight !== 'normal';
                    }

                    return $weight !== null && preg_match('/^(bold(er)?|[5-9]\d{2,})$/', $weight) === 1;
                })
                ->renderTag('strong'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('bold')
                ->label(__('rich-editor-plus::tools.bold'))
                ->icon('mdi-format-bold')
                ->shortcut('Mod-b')
                ->command('toggleBold')
                ->active('bold')
                ->inline()
                ->group('format')
                ->order(10),
        ];
    }
}

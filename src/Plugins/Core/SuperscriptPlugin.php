<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

/**
 * Superscript text. It replaces subscript on the same text.
 */
class SuperscriptPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/superscript';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('superscript')
                ->parseTags(['sup'])
                ->parseUsing(static fn (DOMElement $element): bool => MarkSpec::styleValue($element, 'vertical-align') === 'super')
                ->excludes(['subscript'])
                ->renderTag('sup'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('superscript')
                ->label(__('rich-editor-plus::tools.superscript'))
                ->icon('mdi-format-superscript')
                ->shortcut('Mod-.')
                ->command('toggleSuperscript')
                ->active('superscript')
                ->overflow()
                ->group('format')
                ->order(61),
        ];
    }
}

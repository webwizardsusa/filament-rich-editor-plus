<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

/**
 * Inline code. Like TipTap's, it can't share text with any other mark.
 */
class CodePlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/code';
    }

    public function getMarks(): array
    {
        return [
            MarkSpec::make('code')
                ->parseTags(['code'])
                ->excludes('_')
                ->renderTag('code'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return [
            Tool::make('code')
                ->label(__('rich-editor-plus::tools.code'))
                ->icon('mdi-code-tags')
                ->shortcut('Mod-e')
                ->command('toggleCode')
                ->active('code')
                ->inline()
                ->group('format')
                ->order(55),
        ];
    }
}

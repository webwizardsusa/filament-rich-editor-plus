<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use Webwizardsusa\RichEditorPlus\Content\MarkSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

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

<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\BlockType;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

class DividerPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/divider';
    }

    public function getNodes(): array
    {
        return [NodeSpec::make('horizontalRule')->atom()->parseTags(['hr'])->renderTag('hr')];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('divider')
                ->label(__('rich-editor-plus::blocks.divider'))
                ->description(__('rich-editor-plus::blocks.divider_description'))
                ->icon('mdi-minus')
                ->keywords(['hr', 'line', 'separator', 'rule'])
                ->node('horizontalRule')
                ->command('setHorizontalRule')
                ->order(50),
        ];
    }
}

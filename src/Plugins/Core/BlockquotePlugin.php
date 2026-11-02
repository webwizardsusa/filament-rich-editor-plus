<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Concerns\HasLevelTools;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;

class BlockquotePlugin extends Plugin
{
    use HasLevelTools;

    public function getId(): string
    {
        return 'core/blockquote';
    }

    public function getNodes(): array
    {
        return [NodeSpec::make('blockquote')->parseTags(['blockquote'])->renderTag('blockquote')];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return $this->getLevelTools('blockquote');
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('blockquote')
                ->label(__('rich-editor-plus::blocks.blockquote'))
                ->description(__('rich-editor-plus::blocks.blockquote_description'))
                ->icon('mdi-format-quote-open')
                ->keywords(['citation'])
                ->node('blockquote')
                ->command('setBlockquote')
                ->switchable()
                ->multiBlock()
                ->order(30),
        ];
    }
}

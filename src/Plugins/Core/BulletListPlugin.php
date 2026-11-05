<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Concerns\HasLevelTools;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\BlockType;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

class BulletListPlugin extends Plugin
{
    use HasLevelTools;

    public function getId(): string
    {
        return 'core/bullet-list';
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('bulletList')->parseTags(['ul'])->renderTag('ul'),
            NodeSpec::make('listItem')->parseTags(['li'])->renderTag('li'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return $this->getLevelTools('bulletList');
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('bulletList')
                ->label(__('rich-editor-plus::blocks.bullet_list'))
                ->description(__('rich-editor-plus::blocks.bullet_list_description'))
                ->icon('mdi-format-list-bulleted')
                ->keywords(['ul', 'unordered'])
                ->node('bulletList')
                ->command('toggleBulletList')
                ->switchable()
                ->listType()
                ->multiBlock()
                ->order(20),
        ];
    }
}

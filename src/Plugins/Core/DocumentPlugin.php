<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;

/**
 * The schema every editor needs: document, paragraph, text and hard break, plus history and cursor helpers
 * on the JS side. The registry adds it automatically unless a plugin with the same id is supplied.
 */
class DocumentPlugin extends Plugin
{
    public const string ID = 'core/document';

    public function getId(): string
    {
        return self::ID;
    }

    public function getPriority(): int
    {
        return 0;
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('paragraph')->parseTags(['p'])->renderTag('p'),
            NodeSpec::make('hardBreak')->inline()->atom()->parseTags(['br'])->renderTag('br')->textUsing(static fn (): string => "\n"),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('paragraph')
                ->label(__('rich-editor-plus::blocks.paragraph'))
                ->description(__('rich-editor-plus::blocks.paragraph_description'))
                ->icon('mdi-format-paragraph')
                ->keywords(['text'])
                ->node('paragraph')
                ->command('setParagraph')
                ->switchable()
                ->order(0),
        ];
    }
}

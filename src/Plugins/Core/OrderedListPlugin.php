<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use DOMElement;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Concerns\HasLevelTools;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\BlockType;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

class OrderedListPlugin extends Plugin
{
    use HasLevelTools;

    public function getId(): string
    {
        return 'core/ordered-list';
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('orderedList')
                ->parseTags(['ol'])
                ->attribute(
                    'start',
                    parse: static fn (DOMElement $element): ?int => $element->hasAttribute('start') ? (int) $element->getAttribute('start') : null,
                    render: static fn (array $attrs): array => ($attrs['start'] ?? 1) === 1 ? [] : ['start' => $attrs['start']],
                    default: 1,
                )
                ->attribute(
                    'type',
                    render: static fn (array $attrs): array => in_array($attrs['type'] ?? null, [null, '', '1'], true) ? [] : ['type' => $attrs['type']],
                )
                ->renderTag('ol'),
            NodeSpec::make('listItem')->parseTags(['li'])->renderTag('li'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return $this->getLevelTools('orderedList');
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('orderedList')
                ->label(__('rich-editor-plus::blocks.ordered_list'))
                ->description(__('rich-editor-plus::blocks.ordered_list_description'))
                ->icon('mdi-format-list-numbered')
                ->keywords(['ol', 'ordered'])
                ->node('orderedList')
                ->command('toggleOrderedList')
                ->switchable()
                ->listType()
                ->multiBlock()
                ->order(21),
        ];
    }
}

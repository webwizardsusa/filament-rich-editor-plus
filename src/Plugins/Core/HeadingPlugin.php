<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use DOMElement;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\BlockType;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;

class HeadingPlugin extends Plugin
{
    /**
     * @var array<int>
     */
    protected array $levels = [2, 3];

    /**
     * The heading levels on offer, from 1 to 6.
     *
     * @param  array<int>  $levels
     */
    public function levels(array $levels): static
    {
        $this->levels = $levels;

        return $this;
    }

    /**
     * @return array<int>
     */
    public function getLevels(): array
    {
        return $this->levels;
    }

    public function getId(): string
    {
        return 'core/heading';
    }

    public function getNodes(): array
    {
        $levels = $this->levels;

        return [
            NodeSpec::make('heading')
                ->parseTags(array_map(static fn (int $level): string => "h{$level}", $levels))
                ->attribute(
                    'level',
                    parse: static fn (DOMElement $element): int => (int) substr($element->tagName, 1),
                    render: static fn (): array => [],
                    default: $levels[0] ?? 2,
                )
                ->renderUsing(static function (array $node, array $attributes) use ($levels): array {
                    $level = $node['attrs']['level'] ?? null;

                    return [in_array($level, $levels, true) ? "h{$level}" : 'h'.($levels[0] ?? 2), $attributes, 0];
                }),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), ['levels' => $this->levels]);
    }

    public function getBlockTypes(): array
    {
        return array_map(
            static fn (int $level): BlockType => BlockType::make("heading{$level}")
                ->label(__('rich-editor-plus::blocks.heading', ['level' => $level]))
                ->description(__('rich-editor-plus::blocks.heading_description'))
                ->icon("mdi-format-header-{$level}")
                ->keywords(['title', "h{$level}"])
                ->node('heading', ['level' => $level])
                ->command('setHeading', [['level' => $level]])
                ->switchable()
                ->order(10 + $level),
            $this->levels,
        );
    }
}

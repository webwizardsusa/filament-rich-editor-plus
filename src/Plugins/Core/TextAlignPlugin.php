<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use InvalidArgumentException;
use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;
use Webwizardsusa\RichEditorPlus\Support\ToolMenuItem;

/**
 * Aligns paragraphs and headings with `style="text-align: …"`, from one block-toolbar menu that every block toolbar
 * shows and that is disabled where no aligned type is selected. The default alignment is
 * never stored: choosing it clears the attribute.
 */
class TextAlignPlugin extends Plugin implements ProvidesGlobalAttributes
{
    /**
     * @var array<string>
     */
    public const array ALIGNMENTS = ['left', 'center', 'right', 'justify'];

    /**
     * @var array<string, string>
     */
    protected const array SHORTCUTS = [
        'left' => 'Mod-Shift-l',
        'center' => 'Mod-Shift-e',
        'right' => 'Mod-Shift-r',
        'justify' => 'Mod-Shift-j',
    ];

    /**
     * @var array<string>
     */
    protected array $alignments = self::ALIGNMENTS;

    /**
     * @var array<string>
     */
    protected array $types = ['paragraph', 'heading'];

    protected string $defaultAlignment = 'left';

    /**
     * The alignments on offer, in menu order: any of `left`, `center`, `right` and `justify`.
     *
     * @param  array<string>  $alignments
     */
    public function alignments(array $alignments): static
    {
        $this->alignments = array_values(array_unique($alignments));

        return $this;
    }

    /**
     * The node types that can be aligned.
     *
     * @param  array<string>  $types
     */
    public function types(array $types): static
    {
        $this->types = array_values($types);

        return $this;
    }

    /**
     * The alignment text has without the attribute, such as `right` on a right-to-left site. Choosing it clears the
     * attribute.
     */
    public function defaultAlignment(string $alignment): static
    {
        $this->defaultAlignment = $alignment;

        return $this;
    }

    public function getId(): string
    {
        return 'core/text-align';
    }

    public function getGlobalAttributes(): array
    {
        $this->assertConfigured();

        return [
            GlobalAttribute::style('textAlign', 'text-align')
                ->types($this->types)
                ->values(array_values(array_diff($this->alignments, [$this->defaultAlignment]))),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        $this->assertConfigured();

        return JsExtension::make($this->getId(), [
            'alignments' => $this->alignments,
            'types' => $this->types,
            'defaultAlignment' => $this->defaultAlignment,
        ]);
    }

    public function getTools(): array
    {
        $this->assertConfigured();

        return [
            Tool::make('textAlign')
                ->label(__('rich-editor-plus::tools.text_align'))
                ->icon("mdi-format-align-{$this->defaultAlignment}")
                ->currentLabel(__('rich-editor-plus::tools.text_align_current'))
                ->menu(array_map($this->menuItem(...), $this->alignments))
                ->block()
                ->nodes(['*'])
                ->group('align')
                ->order(10),
        ];
    }

    protected function menuItem(string $alignment): ToolMenuItem
    {
        $isDefault = $alignment === $this->defaultAlignment;

        return ToolMenuItem::make($alignment)
            ->label(__("rich-editor-plus::tools.align_{$alignment}"))
            ->icon("mdi-format-align-{$alignment}")
            ->shortcut(static::SHORTCUTS[$alignment])
            ->command($isDefault ? 'unsetTextAlign' : 'setTextAlign', $isDefault ? [] : [$alignment])
            ->active(attributes: ['textAlign' => $isDefault ? null : $alignment]);
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function assertConfigured(): void
    {
        if ($this->alignments === [] || array_diff($this->alignments, static::ALIGNMENTS) !== []) {
            throw new InvalidArgumentException('TextAlignPlugin alignments must be one or more of: '.implode(', ', static::ALIGNMENTS).'.');
        }

        if (! in_array($this->defaultAlignment, $this->alignments, true)) {
            throw new InvalidArgumentException("TextAlignPlugin's default alignment [{$this->defaultAlignment}] must be one of its alignments.");
        }

        if (count(array_unique($this->alignments)) < 2) {
            throw new InvalidArgumentException('TextAlignPlugin needs at least one alignment besides the default.');
        }
    }
}

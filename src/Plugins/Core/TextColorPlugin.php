<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

/**
 * Text colour from a palette, stored as `has-{name}-color` classes on the `textStyle` span.
 */
class TextColorPlugin extends PaletteColorPlugin
{
    public function getId(): string
    {
        return 'core/text-color';
    }

    protected function attributeName(): string
    {
        return 'color';
    }

    protected function commandName(): string
    {
        return 'TextColor';
    }

    protected function toolName(): string
    {
        return 'textColor';
    }

    protected function toolLabelKey(): string
    {
        return 'text_color';
    }

    protected function toolIcon(): string
    {
        return 'mdi-format-color-text';
    }

    protected function toolOrder(): int
    {
        return 65;
    }

    protected function cssProperty(): string
    {
        return 'color';
    }

    protected function swatchText(): ?string
    {
        return 'A';
    }

    protected function defaultClass(string $name): string
    {
        return "has-{$name}-color";
    }

    protected function defaultPalette(): array
    {
        return [
            'gray' => '#6b7280',
            'red' => '#dc2626',
            'orange' => '#ea580c',
            'yellow' => '#ca8a04',
            'green' => '#16a34a',
            'blue' => '#2563eb',
            'purple' => '#9333ea',
            'pink' => '#db2777',
        ];
    }
}

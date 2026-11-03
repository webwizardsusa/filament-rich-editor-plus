<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

/**
 * Background colour (highlight) from a palette, stored as `has-{name}-background-color` classes on the `textStyle` span.
 * An entry may also have a `text` colour, so the highlighted text stays readable in dark mode; a text colour class on the
 * same span wins over it. The default palette uses dark text. {@see TextColorPlugin} ignores a `text` key.
 */
class BackgroundColorPlugin extends PaletteColorPlugin
{
    public function getId(): string
    {
        return 'core/background-color';
    }

    protected function attributeName(): string
    {
        return 'backgroundColor';
    }

    protected function commandName(): string
    {
        return 'BackgroundColor';
    }

    protected function toolName(): string
    {
        return 'backgroundColor';
    }

    protected function toolLabelKey(): string
    {
        return 'background_color';
    }

    protected function toolIcon(): string
    {
        return 'mdi-format-color-highlight';
    }

    protected function toolOrder(): int
    {
        return 66;
    }

    protected function cssProperty(): string
    {
        return 'background-color';
    }

    protected function supportsTextColor(): bool
    {
        return true;
    }

    protected function defaultTextColor(): ?string
    {
        return '#1f2937';
    }

    protected function swatchText(): ?string
    {
        return null;
    }

    protected function defaultClass(string $name): string
    {
        return "has-{$name}-background-color";
    }

    protected function defaultPalette(): array
    {
        return [
            'gray' => '#e5e7eb',
            'red' => '#fecaca',
            'orange' => '#fed7aa',
            'yellow' => '#fef08a',
            'green' => '#bbf7d0',
            'blue' => '#bfdbfe',
            'purple' => '#e9d5ff',
            'pink' => '#fbcfe8',
        ];
    }
}

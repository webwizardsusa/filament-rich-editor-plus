<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use InvalidArgumentException;

/**
 * Font family from a palette, stored as `has-{name}-font-family` classes on the `textStyle` span. Values are font
 * stacks such as `"Open Sans", sans-serif`; the site loads any web fonts.
 */
class FontFamilyPlugin extends PaletteStylePlugin
{
    /**
     * Replaces the palette: names to a label and a font stack.
     *
     * @param  array<string, array{label: string, family: string}>  $fonts
     */
    public function fonts(array $fonts): static
    {
        return $this->setPalette($fonts);
    }

    /**
     * @return array<string, array{label: string, family: string}>
     */
    public function getFonts(): array
    {
        return $this->getPalette();
    }

    public function getId(): string
    {
        return 'core/font-family';
    }

    protected function attributeName(): string
    {
        return 'fontFamily';
    }

    protected function commandName(): string
    {
        return 'FontFamily';
    }

    protected function toolName(): string
    {
        return 'fontFamily';
    }

    protected function toolLabelKey(): string
    {
        return 'font_family';
    }

    protected function toolIcon(): string
    {
        return 'mdi-format-font';
    }

    protected function toolOrder(): int
    {
        return 20;
    }

    protected function toolGroup(): string
    {
        return 'type';
    }

    protected function cssProperty(): string
    {
        return 'font-family';
    }

    protected function valueKey(): string
    {
        return 'family';
    }

    protected function hasSwatches(): bool
    {
        return true;
    }

    protected function swatchText(): ?string
    {
        return 'Aa';
    }

    protected function defaultClass(string $name): string
    {
        return "has-{$name}-font-family";
    }

    protected function defaultPalette(): array
    {
        return [
            'sans' => 'ui-sans-serif, system-ui, sans-serif',
            'serif' => 'ui-serif, Georgia, serif',
            'mono' => 'ui-monospace, SFMono-Regular, Menlo, monospace',
        ];
    }

    protected function paletteLabelPrefix(): string
    {
        return 'fonts';
    }

    /**
     * A comma-separated list of bare names (`Georgia`, `sans-serif`) or quoted names with no quote or backslash inside.
     */
    protected function assertValue(string $plugin, string $name, string $value): void
    {
        $font = '(?:-?[A-Za-z][A-Za-z0-9 -]*|"[^"\'\\\\]+"|\'[^"\'\\\\]+\')';

        if (preg_match('/^\s*'.$font.'\s*(?:,\s*'.$font.'\s*)*\z/', $value) !== 1) {
            throw new InvalidArgumentException("{$plugin} has the font [{$value}] for [{$name}], which must be a comma-separated list of font names, with quotes around names that need them.");
        }
    }
}

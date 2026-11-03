<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use InvalidArgumentException;

/**
 * Font size from a palette, stored as `has-{name}-font-size` classes on the `textStyle` span.
 */
class FontSizePlugin extends PaletteStylePlugin
{
    /**
     * Replaces the palette: names to a label and a CSS size.
     *
     * @param  array<string, array{label: string, size: string}>  $sizes
     */
    public function sizes(array $sizes): static
    {
        return $this->setPalette($sizes);
    }

    /**
     * @return array<string, array{label: string, size: string}>
     */
    public function getSizes(): array
    {
        return $this->getPalette();
    }

    public function getId(): string
    {
        return 'core/font-size';
    }

    protected function attributeName(): string
    {
        return 'fontSize';
    }

    protected function commandName(): string
    {
        return 'FontSize';
    }

    protected function toolName(): string
    {
        return 'fontSize';
    }

    protected function toolLabelKey(): string
    {
        return 'font_size';
    }

    protected function toolIcon(): string
    {
        return 'mdi-format-size';
    }

    protected function toolOrder(): int
    {
        return 21;
    }

    protected function toolGroup(): string
    {
        return 'type';
    }

    protected function cssProperty(): string
    {
        return 'font-size';
    }

    protected function valueKey(): string
    {
        return 'size';
    }

    protected function swatchText(): ?string
    {
        return null;
    }

    protected function defaultClass(string $name): string
    {
        return "has-{$name}-font-size";
    }

    protected function defaultPalette(): array
    {
        return [
            'small' => '0.875em',
            'large' => '1.25em',
            'x-large' => '1.5em',
            'xx-large' => '2em',
        ];
    }

    protected function paletteLabelPrefix(): string
    {
        return 'sizes';
    }

    /**
     * A number with a unit, `0`, a size keyword, `var(--name)`, or `clamp()`, `min()`, `max()` or `calc()` of plain
     * numbers, units and operators.
     */
    protected function assertValue(string $plugin, string $name, string $value): void
    {
        $patterns = [
            '/^'.static::CSS_NUMBER.'(?:px|rem|em|%|pt|vw|vh)\z/',
            '/^0\z/',
            '/^(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)\z/',
            '/^var\(--[A-Za-z0-9_-]+\)\z/',
            '/^(?:clamp|min|max|calc)\([A-Za-z0-9.%+\-*\/, ()]+\)\z/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $value) === 1) {
                return;
            }
        }

        throw new InvalidArgumentException("{$plugin} has the size [{$value}] for [{$name}], which must be a CSS length, a size keyword, var(--name), or clamp(), min(), max() or calc().");
    }
}

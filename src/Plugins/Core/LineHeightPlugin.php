<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use InvalidArgumentException;

/**
 * Line height from a palette, stored as `has-{name}-line-height` classes on the `textStyle` span. It applies to the
 * selected text, so it can make lines taller but not tighter than the paragraph's own line height.
 */
class LineHeightPlugin extends PaletteStylePlugin
{
    /**
     * Replaces the palette: names to a label and a CSS line height.
     *
     * @param  array<string, array{label: string, height: string}>  $heights
     */
    public function heights(array $heights): static
    {
        return $this->setPalette($heights);
    }

    /**
     * @return array<string, array{label: string, height: string}>
     */
    public function getHeights(): array
    {
        return $this->getPalette();
    }

    public function getId(): string
    {
        return 'core/line-height';
    }

    protected function attributeName(): string
    {
        return 'lineHeight';
    }

    protected function commandName(): string
    {
        return 'LineHeight';
    }

    protected function toolName(): string
    {
        return 'lineHeight';
    }

    protected function toolLabelKey(): string
    {
        return 'line_height';
    }

    protected function toolIcon(): string
    {
        return 'mdi-format-line-spacing';
    }

    protected function toolOrder(): int
    {
        return 72;
    }

    protected function toolGroup(): string
    {
        return 'type';
    }

    protected function cssProperty(): string
    {
        return 'line-height';
    }

    protected function valueKey(): string
    {
        return 'height';
    }

    protected function swatchText(): ?string
    {
        return null;
    }

    protected function defaultClass(string $name): string
    {
        return "has-{$name}-line-height";
    }

    protected function defaultPalette(): array
    {
        return [
            'tight' => '1.25',
            'relaxed' => '1.75',
            'loose' => '2',
        ];
    }

    protected function paletteLabelPrefix(): string
    {
        return 'line_heights';
    }

    /**
     * A number, a number with a unit, `normal` or `var(--name)`.
     */
    protected function assertValue(string $plugin, string $name, string $value): void
    {
        $patterns = [
            '/^'.static::CSS_NUMBER.'(?:px|rem|em|%|ch|ex|lh|vmin|vmax|svw|svh|dvw|dvh|lvw|lvh|cqi|cqb)?\z/',
            '/^normal\z/',
            '/^var\(--[A-Za-z0-9_-]+\)\z/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $value) === 1) {
                return;
            }
        }

        throw new InvalidArgumentException("{$plugin} has the line height [{$value}] for [{$name}], which must be a number, a CSS length, normal or var(--name).");
    }
}

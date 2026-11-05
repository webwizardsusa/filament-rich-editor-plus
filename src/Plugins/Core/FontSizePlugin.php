<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

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
        return 71;
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
     * A number with a unit, `0`, a size keyword, `var(--name)`, or one `clamp()`, `min()`, `max()` or `calc()` with
     * balanced parentheses, made only of numbers with optional units, `+ - * /`, commas, spaces, `var(--name)` and
     * nested `clamp()`, `min()`, `max()` and `calc()`.
     */
    protected function assertValue(string $plugin, string $name, string $value): void
    {
        $patterns = [
            '/^'.static::CSS_NUMBER.'(?:px|rem|em|%|pt|vw|vh|ch|ex|lh|vmin|vmax|svw|svh|dvw|dvh|lvw|lvh|cqi|cqb)\z/',
            '/^0\z/',
            '/^(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)\z/',
            '/^var\(--[A-Za-z0-9_-]+\)\z/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $value) === 1) {
                return;
            }
        }

        if ($this->isMathFunction($value)) {
            return;
        }

        throw new InvalidArgumentException("{$plugin} has the size [{$value}] for [{$name}], which must be a CSS length, a size keyword, var(--name), or clamp(), min(), max() or calc().");
    }

    /**
     * Whether the value is one math function whose parentheses balance, and which holds only the allowed tokens.
     */
    private function isMathFunction(string $value): bool
    {
        $token = '/\G(?:(?<open>(?:clamp|min|max|calc)\()|(?<close>\))|var\(--[A-Za-z0-9_-]+\)|'.static::CSS_NUMBER.'(?:px|rem|em|%|pt|vw|vh|ch|ex|lh|vmin|vmax|svw|svh|dvw|dvh|lvw|lvh|cqi|cqb)?|[-+*\/, ])/';
        $length = strlen($value);
        $offset = 0;
        $depth = 0;

        while ($offset < $length) {
            if (preg_match($token, $value, $match, PREG_UNMATCHED_AS_NULL, $offset) !== 1) {
                return false;
            }

            if ($offset === 0 && $match['open'] === null) {
                return false;
            }

            if ($match['open'] !== null) {
                $depth++;
            } elseif ($match['close'] !== null) {
                $depth--;
            }

            $offset += strlen($match[0]);

            if ($depth < 0 || ($depth === 0 && $offset < $length)) {
                return false;
            }
        }

        return $depth === 0;
    }
}

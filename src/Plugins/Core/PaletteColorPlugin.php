<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use InvalidArgumentException;

/**
 * A colour from a palette on the `textStyle` span, stored as a CSS class (`has-red-color`). See
 * {@see PaletteStylePlugin}.
 */
abstract class PaletteColorPlugin extends PaletteStylePlugin
{
    /**
     * Replaces the palette: names (lower-case letters, digits and hyphens) to a label and a CSS colour.
     *
     * @param  array<string, array{label: string, color: string, text?: string}>  $colors
     */
    public function colors(array $colors): static
    {
        return $this->setPalette($colors);
    }

    /**
     * @return array<string, array{label: string, color: string, text?: string}>
     */
    public function getColors(): array
    {
        return $this->getPalette();
    }

    /**
     * Whether palette entries take an optional `text` colour, written as a zero-specificity rule so a text colour class
     * on the same span always wins. Only the highlight plugin uses it.
     */
    protected function supportsTextColor(): bool
    {
        return false;
    }

    /**
     * The `text` colour of every entry in the default palette, or null for none.
     */
    protected function defaultTextColor(): ?string
    {
        return null;
    }

    protected function valueKey(): string
    {
        return 'color';
    }

    protected function jsValuesKey(): string
    {
        return 'colors';
    }

    protected function toolGroup(): string
    {
        return 'color';
    }

    protected function paletteLabelPrefix(): string
    {
        return 'colors';
    }

    protected function defaultItemLabelKey(): string
    {
        return 'color_default';
    }

    protected function hasSwatches(): bool
    {
        return true;
    }

    protected function defaultEntryExtras(): array
    {
        return $this->defaultTextColor() === null ? [] : ['text' => $this->defaultTextColor()];
    }

    protected function assertValue(string $plugin, string $name, string $value): void
    {
        if (preg_match('/["\']/', $value) === 1) {
            throw new InvalidArgumentException("{$plugin} has a colour with quotes for [{$name}], which could break its CSS.");
        }
    }

    protected function assertEntry(string $plugin, string $name, array $entry): void
    {
        if (! $this->supportsTextColor() || ! array_key_exists('text', $entry)) {
            return;
        }

        if (! is_string($entry['text'])) {
            throw new InvalidArgumentException("{$plugin} needs the text colour for [{$name}] to be a string.");
        }

        $this->assertSafeCssValue($plugin, $name, $entry['text']);
        $this->assertValue($plugin, $name, $entry['text']);
    }

    protected function extraRules(string $class, array $entry): string
    {
        return $this->supportsTextColor() && isset($entry['text']) ? ":where(.{$class}){color:{$entry['text']}}" : '';
    }
}

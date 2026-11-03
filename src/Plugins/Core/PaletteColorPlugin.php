<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Closure;
use Hollyit\RichEditorPlus\Content\GlobalAttribute;
use Hollyit\RichEditorPlus\Plugins\Concerns\HasTextStyleMark;
use Hollyit\RichEditorPlus\Plugins\Contracts\ProvidesEditorStyles;
use Hollyit\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;
use InvalidArgumentException;

/**
 * A colour from a palette on the `textStyle` span, stored as a CSS class (`has-red-color`). The plugin writes the CSS for
 * its palette: the field prints it, and pages that show content include {@see getStylesheet()}.
 */
abstract class PaletteColorPlugin extends Plugin implements ProvidesEditorStyles, ProvidesGlobalAttributes
{
    use HasTextStyleMark;

    /**
     * @var ?array<string, array{label: string, color: string, text?: string}>
     */
    protected ?array $colors = null;

    protected ?Closure $classCallback = null;

    /**
     * The attribute on the `textStyle` mark, such as `color`.
     */
    abstract protected function attributeName(): string;

    /**
     * The command suffix, such as `TextColor` for `setTextColor` and `unsetTextColor`.
     */
    abstract protected function commandName(): string;

    abstract protected function toolName(): string;

    abstract protected function toolLabelKey(): string;

    abstract protected function toolIcon(): string;

    abstract protected function toolOrder(): int;

    /**
     * The CSS property the palette's classes set, such as `color`.
     */
    abstract protected function cssProperty(): string;

    /**
     * Text shown in the swatches, such as "A" for a text colour, or null for a filled box.
     */
    abstract protected function swatchText(): ?string;

    abstract protected function defaultClass(string $name): string;

    /**
     * @return array<string, string> name => colour
     */
    abstract protected function defaultPalette(): array;

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

    /**
     * Replaces the palette: names (lower-case letters, digits and hyphens) to a label and a CSS colour.
     *
     * @param  array<string, array{label: string, color: string, text?: string}>  $colors
     */
    public function colors(array $colors): static
    {
        $this->colors = $colors;

        return $this;
    }

    /**
     * Names the class for each palette name, such as `fn (string $name) => "text-{$name}"`.
     *
     * @param  Closure(string): string  $callback
     */
    public function classUsing(Closure $callback): static
    {
        $this->classCallback = $callback;

        return $this;
    }

    /**
     * @return array<string, array{label: string, color: string, text?: string}>
     */
    public function getColors(): array
    {
        if ($this->colors !== null) {
            return $this->colors;
        }

        $colors = [];

        foreach ($this->defaultPalette() as $name => $color) {
            $colors[$name] = ['label' => __("rich-editor-plus::tools.colors.{$name}"), 'color' => $color];

            if ($this->defaultTextColor() !== null) {
                $colors[$name]['text'] = $this->defaultTextColor();
            }
        }

        return $colors;
    }

    public function getClass(string $name): string
    {
        return $this->classCallback === null ? $this->defaultClass($name) : (string) ($this->classCallback)($name);
    }

    public function getMarks(): array
    {
        return [$this->textStyleMark()];
    }

    public function getGlobalAttributes(): array
    {
        return [GlobalAttribute::classes($this->attributeName(), $this->classMap())->types(['textStyle'])];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), ['colors' => array_map(strval(...), array_keys($this->classMap()))]);
    }

    public function getTools(): array
    {
        $classes = $this->classMap();
        $items = [
            ToolMenuItem::make('default')
                ->label(__('rich-editor-plus::tools.color_default'))
                ->swatch('rep-swatch-default', $this->swatchText())
                ->command("unset{$this->commandName()}")
                ->fallback(),
        ];

        foreach ($this->getColors() as $name => $color) {
            $name = (string) $name;

            $items[] = ToolMenuItem::make($name)
                ->label($color['label'])
                ->swatch($classes[$name], $this->swatchText())
                ->command("set{$this->commandName()}", [$name])
                ->active(attributes: [$this->attributeName() => $name]);
        }

        return [
            Tool::make($this->toolName())
                ->label(__("rich-editor-plus::tools.{$this->toolLabelKey()}"))
                ->icon($this->toolIcon())
                ->currentLabel(__("rich-editor-plus::tools.{$this->toolLabelKey()}_current"))
                ->menu($items)
                ->inline()
                ->group('color')
                ->order($this->toolOrder()),
        ];
    }

    /**
     * One rule per palette colour, such as `.has-red-color{color:#dc2626}`, one per line.
     */
    public function getStylesheet(): string
    {
        $colors = $this->getColors();
        $rules = [];

        foreach ($this->classMap() as $name => $class) {
            $rules[] = ".{$class}{{$this->cssProperty()}:{$colors[$name]['color']}}";

            if ($this->supportsTextColor() && isset($colors[$name]['text'])) {
                $rules[] = ":where(.{$class}){color:{$colors[$name]['text']}}";
            }
        }

        return implode("\n", $rules);
    }

    public function getEditorStyles(): string
    {
        return $this->getStylesheet();
    }

    /**
     * The palette's names and classes, after checking the palette.
     *
     * @return array<string, string>
     *
     * @throws InvalidArgumentException
     */
    protected function classMap(): array
    {
        $plugin = class_basename(static::class);
        $colors = $this->getColors();

        if ($colors === []) {
            throw new InvalidArgumentException("{$plugin} needs at least one colour.");
        }

        $classes = [];

        foreach ($colors as $name => $color) {
            $name = (string) $name;

            if (preg_match('/^[a-z0-9][a-z0-9-]*\z/', $name) !== 1 || $name === 'default') {
                throw new InvalidArgumentException("{$plugin} has the colour name [{$name}], which must be lower-case letters, digits and hyphens, and not [default].");
            }

            if (! is_array($color) || ! is_string($color['label'] ?? null) || trim($color['label']) === '' || ! is_string($color['color'] ?? null)) {
                throw new InvalidArgumentException("{$plugin} needs a label and a colour for [{$name}].");
            }

            $this->assertSafeCssValue($plugin, $name, $color['color']);

            if ($this->supportsTextColor() && array_key_exists('text', $color)) {
                if (! is_string($color['text'])) {
                    throw new InvalidArgumentException("{$plugin} needs the text colour for [{$name}] to be a string.");
                }

                $this->assertSafeCssValue($plugin, $name, $color['text']);
            }

            $class = $this->getClass($name);

            if (preg_match('/^-?[A-Za-z_][A-Za-z0-9_-]*\z/', $class) !== 1) {
                throw new InvalidArgumentException("{$plugin} gives [{$name}] the class [{$class}], which is not a valid CSS class name.");
            }

            $classes[$name] = $class;
        }

        if (count(array_unique($classes)) !== count($classes)) {
            throw new InvalidArgumentException("{$plugin} gives two colours the same class.");
        }

        return $classes;
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function assertSafeCssValue(string $plugin, string $name, string $value): void
    {
        if (trim($value) === '' || preg_match('/[;{}<>"\'\\\\]/', $value) === 1 || str_contains($value, '/*') || str_contains($value, '*/')) {
            throw new InvalidArgumentException("{$plugin} has an empty colour, or one with characters that could break its CSS, for [{$name}].");
        }
    }
}

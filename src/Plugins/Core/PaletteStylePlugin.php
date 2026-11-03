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
 * One CSS property on the `textStyle` span, chosen from a palette and stored as a class per entry (`has-red-color`,
 * `has-large-font-size`). The plugin validates its palette, writes the CSS for it (the field prints it; pages that show
 * content include {@see getStylesheet()}), and offers an inline menu with a "Default" item that clears the value.
 */
abstract class PaletteStylePlugin extends Plugin implements ProvidesEditorStyles, ProvidesGlobalAttributes
{
    use HasTextStyleMark;

    /**
     * A CSS number, for subclasses' value checks.
     */
    protected const string CSS_NUMBER = '(?:\d+(?:\.\d+)?|\.\d+)';

    /**
     * @var ?array<string, array<string, mixed>>
     */
    protected ?array $palette = null;

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

    abstract protected function toolGroup(): string;

    /**
     * The CSS property the palette's classes set, such as `color`.
     */
    abstract protected function cssProperty(): string;

    /**
     * The key holding each entry's CSS value, such as `color` or `size`.
     */
    abstract protected function valueKey(): string;

    /**
     * Text shown in the swatches, such as "A" for a text colour, or null for none.
     */
    abstract protected function swatchText(): ?string;

    abstract protected function defaultClass(string $name): string;

    /**
     * @return array<string, string> name => value
     */
    abstract protected function defaultPalette(): array;

    /**
     * The lang group of the default palette's labels, such as `colors` for `tools.colors.red`.
     */
    abstract protected function paletteLabelPrefix(): string;

    /**
     * The key the browser gets the palette names under.
     */
    protected function jsValuesKey(): string
    {
        return 'values';
    }

    /**
     * Whether menu items show a swatch styled by their class.
     */
    protected function hasSwatches(): bool
    {
        return false;
    }

    protected function defaultItemLabelKey(): string
    {
        return 'style_default';
    }

    /**
     * Checks one entry's value beyond the shared CSS checks.
     *
     * @throws InvalidArgumentException
     */
    protected function assertValue(string $plugin, string $name, string $value): void {}

    /**
     * Checks the rest of an entry, such as extra keys.
     *
     * @param  array<string, mixed>  $entry
     *
     * @throws InvalidArgumentException
     */
    protected function assertEntry(string $plugin, string $name, array $entry): void {}

    /**
     * More CSS for one entry, after its own rule, or an empty string.
     *
     * @param  array<string, mixed>  $entry
     */
    protected function extraRules(string $class, array $entry): string
    {
        return '';
    }

    /**
     * Extra keys for every entry of the default palette.
     *
     * @return array<string, string>
     */
    protected function defaultEntryExtras(): array
    {
        return [];
    }

    /**
     * @param  array<string, array<string, mixed>>  $palette
     */
    protected function setPalette(array $palette): static
    {
        $this->palette = $palette;

        return $this;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    protected function getPalette(): array
    {
        if ($this->palette !== null) {
            return $this->palette;
        }

        $palette = [];

        foreach ($this->defaultPalette() as $name => $value) {
            $palette[$name] = [
                'label' => __("rich-editor-plus::tools.{$this->paletteLabelPrefix()}.{$name}"),
                $this->valueKey() => $value,
                ...$this->defaultEntryExtras(),
            ];
        }

        return $palette;
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
        return JsExtension::make($this->getId(), [$this->jsValuesKey() => array_map(strval(...), array_keys($this->classMap()))]);
    }

    public function getTools(): array
    {
        $classes = $this->classMap();
        $default = ToolMenuItem::make('default')
            ->label(__("rich-editor-plus::tools.{$this->defaultItemLabelKey()}"))
            ->command("unset{$this->commandName()}")
            ->fallback();

        if ($this->hasSwatches()) {
            $default->swatch('rep-swatch-default', $this->swatchText());
        }

        $items = [$default];

        foreach ($this->getPalette() as $name => $entry) {
            $name = (string) $name;
            $item = ToolMenuItem::make($name)
                ->label($entry['label'])
                ->command("set{$this->commandName()}", [$name])
                ->active(attributes: [$this->attributeName() => $name]);

            if ($this->hasSwatches()) {
                $item->swatch($classes[$name], $this->swatchText());
            }

            $items[] = $item;
        }

        return [
            Tool::make($this->toolName())
                ->label(__("rich-editor-plus::tools.{$this->toolLabelKey()}"))
                ->icon($this->toolIcon())
                ->currentLabel(__("rich-editor-plus::tools.{$this->toolLabelKey()}_current"))
                ->menu($items)
                ->inline()
                ->group($this->toolGroup())
                ->order($this->toolOrder()),
        ];
    }

    /**
     * One rule per palette entry, such as `.has-red-color{color:#dc2626}`, plus any extra rules, one per line.
     */
    public function getStylesheet(): string
    {
        $palette = $this->getPalette();
        $rules = [];

        foreach ($this->classMap() as $name => $class) {
            $rules[] = ".{$class}{{$this->cssProperty()}:{$palette[$name][$this->valueKey()]}}";

            $extra = $this->extraRules($class, $palette[$name]);

            if ($extra !== '') {
                $rules[] = $extra;
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
        $palette = $this->getPalette();

        if ($palette === []) {
            throw new InvalidArgumentException("{$plugin} needs at least one palette entry.");
        }

        $classes = [];

        foreach ($palette as $name => $entry) {
            $name = (string) $name;

            if (preg_match('/^[a-z0-9][a-z0-9-]*\z/', $name) !== 1 || $name === 'default') {
                throw new InvalidArgumentException("{$plugin} has the name [{$name}], which must be lower-case letters, digits and hyphens, and not [default].");
            }

            if (! is_array($entry) || ! is_string($entry['label'] ?? null) || trim($entry['label']) === '' || ! is_string($entry[$this->valueKey()] ?? null)) {
                throw new InvalidArgumentException("{$plugin} needs a label and a [{$this->valueKey()}] for [{$name}].");
            }

            $this->assertSafeCssValue($plugin, $name, $entry[$this->valueKey()]);
            $this->assertValue($plugin, $name, $entry[$this->valueKey()]);
            $this->assertEntry($plugin, $name, $entry);

            $class = $this->getClass($name);

            if (preg_match('/^-?[A-Za-z_][A-Za-z0-9_-]*\z/', $class) !== 1) {
                throw new InvalidArgumentException("{$plugin} gives [{$name}] the class [{$class}], which is not a valid CSS class name.");
            }

            $classes[$name] = $class;
        }

        if (count(array_unique($classes)) !== count($classes)) {
            throw new InvalidArgumentException("{$plugin} gives two entries the same class.");
        }

        return $classes;
    }

    /**
     * The checks every value goes through, since it is printed raw into a `<style>` element: not empty, and no control
     * characters, semicolons, braces, angle brackets, backslashes or comment markers.
     *
     * @throws InvalidArgumentException
     */
    protected function assertSafeCssValue(string $plugin, string $name, string $value): void
    {
        if (trim($value) === '' || preg_match('/[;{}<>\\\\\x00-\x1F\x7F]/', $value) === 1 || str_contains($value, '/*') || str_contains($value, '*/')) {
            throw new InvalidArgumentException("{$plugin} has an empty value, or one with characters that could break its CSS, for [{$name}].");
        }
    }
}

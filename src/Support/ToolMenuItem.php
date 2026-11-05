<?php

namespace Webwizardsusa\RichEditorPlus\Support;

/**
 * One entry in a tool's menu (see {@see Tool::menu()}): a TipTap chain command and how the browser tells it is the
 * current one.
 */
class ToolMenuItem
{
    protected ?string $label = null;

    protected ?string $icon = null;

    protected ?string $shortcut = null;

    protected ?string $command = null;

    /**
     * @var array<int, mixed>
     */
    protected array $arguments = [];

    protected bool $hasActiveState = false;

    protected ?string $activeName = null;

    /**
     * @var array<string, mixed>
     */
    protected array $activeAttributes = [];

    /**
     * @var ?array{class: string, text: ?string}
     */
    protected ?array $swatch = null;

    protected bool $isFallback = false;

    final public function __construct(protected string $name) {}

    public static function make(string $name): static
    {
        return new static($name);
    }

    public function label(?string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function icon(?string $icon): static
    {
        $this->icon = $icon;

        return $this;
    }

    /**
     * Shown as a hint in the menu. The plugin's JS extension binds the key itself.
     */
    public function shortcut(?string $shortcut): static
    {
        $this->shortcut = $shortcut;

        return $this;
    }

    /**
     * @param  array<int, mixed>  $arguments
     */
    public function command(string $command, array $arguments = []): static
    {
        $this->command = $command;
        $this->arguments = $arguments;

        return $this;
    }

    /**
     * When the item is the current one: TipTap's `isActive($name, $attributes)`, or `isActive($attributes)` with no
     * name, which matches any node or mark with those attributes.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function active(?string $name = null, array $attributes = []): static
    {
        $this->hasActiveState = true;
        $this->activeName = $name;
        $this->activeAttributes = $attributes;

        return $this;
    }

    /**
     * Shows a swatch instead of an icon: a small box with the given class (such as a palette colour's class) and
     * optional text, such as "A" for a text colour.
     */
    public function swatch(string $class, ?string $text = null): static
    {
        $this->swatch = ['class' => $class, 'text' => $text];

        return $this;
    }

    /**
     * The item that is current when no other item is active, such as "Default" in a colour menu, whose "no colour"
     * state `active()` can't express.
     */
    public function fallback(bool $condition = true): static
    {
        $this->isFallback = $condition;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function getShortcut(): ?string
    {
        return $this->shortcut;
    }

    public function getCommand(): ?string
    {
        return $this->command;
    }

    /**
     * @return array<int, mixed>
     */
    public function getArguments(): array
    {
        return $this->arguments;
    }

    /**
     * @return ?array{class: string, text: ?string}
     */
    public function getSwatch(): ?array
    {
        return $this->swatch;
    }

    public function isFallback(): bool
    {
        return $this->isFallback;
    }

    /**
     * @return array{name: string, label: ?string, icon: ?string, shortcut: ?string, command: ?string, arguments: array<int, mixed>, active: ?array{name: ?string, attributes: object}, swatch: ?array{class: string, text: ?string}, fallback: bool}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'icon' => $this->icon,
            'shortcut' => $this->shortcut,
            'command' => $this->command,
            'arguments' => $this->arguments,
            'active' => $this->hasActiveState ? [
                'name' => $this->activeName,
                'attributes' => (object) $this->activeAttributes,
            ] : null,
            'swatch' => $this->swatch,
            'fallback' => $this->isFallback,
        ];
    }
}

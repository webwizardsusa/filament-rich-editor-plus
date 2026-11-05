<?php

namespace Hollyit\RichEditorPlus\Support;

/**
 * A toolbar button contributed by a plugin. The block toolbar renders these; the command is a
 * TipTap chain command such as `toggleBold`, run with the given arguments.
 */
class Tool
{
    protected ?string $label = null;

    protected ?string $icon = null;

    protected ?string $shortcut = null;

    protected ?string $command = null;

    protected ?string $action = null;

    /**
     * @var array<int, mixed>
     */
    protected array $arguments = [];

    protected ?string $activeName = null;

    /**
     * @var array<string, mixed>
     */
    protected array $activeAttributes = [];

    protected ToolScope $scope = ToolScope::Inline;

    /**
     * @var array<string>
     */
    protected array $nodes = ['*'];

    protected bool $checksAvailability = false;

    protected bool $hidesInListItem = false;

    protected bool $isAvailableWhileReadOnly = false;

    protected bool $showsWithCursor = false;

    protected ?string $group = null;

    protected int $order = 0;

    protected bool $hasActiveState = false;

    /**
     * @var ?array<ToolMenuItem>
     */
    protected ?array $menu = null;

    protected ?string $currentLabel = null;

    public function __construct(protected string $name) {}

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
     * The keyboard shortcut the button's tooltip shows, in TipTap's notation such as `Mod-b` or `Mod-Shift-s`. `Mod`
     * shows as ⌘ on a Mac and Ctrl elsewhere. It only labels the button; the plugin's extension binds the key.
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
     * Opens the named Filament action (registered by the plugin through `getActions()`) instead of running a
     * command, for tools that need input such as a link URL.
     */
    public function action(?string $action): static
    {
        $this->action = $action;

        return $this;
    }

    /**
     * The node or mark name TipTap's `isActive()` is checked against. With no name, the attributes alone are checked
     * (`isActive($attributes)`), matching any node or mark that has them.
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

    public function scope(ToolScope $scope): static
    {
        $this->scope = $scope;

        return $this;
    }

    public function inline(): static
    {
        return $this->scope(ToolScope::Inline);
    }

    public function block(): static
    {
        return $this->scope(ToolScope::Block);
    }

    /**
     * Shows the tool in the more menu. It must use a command, which runs with no arguments, or an action.
     */
    public function overflow(): static
    {
        return $this->scope(ToolScope::Overflow);
    }

    /**
     * The node types whose block toolbar shows this tool. `*` means every block.
     *
     * @param  array<string>  $nodes
     */
    public function nodes(array $nodes): static
    {
        $this->nodes = $nodes;

        return $this;
    }

    /**
     * Greys the button out while its command can't run. The browser checks `can()` after every change, so this is
     * for commands that often can't run at the cursor, not every tool.
     */
    public function disableWhenUnavailable(bool $condition = true): static
    {
        $this->checksAvailability = $condition;

        return $this;
    }

    /**
     * Hides the button while the cursor is in a list item, for tools the list button's menu takes over there.
     */
    public function hideInListItem(bool $condition = true): static
    {
        $this->hidesInListItem = $condition;

        return $this;
    }

    /**
     * Shows the toolbar holding this tool with only a cursor in its block. Toolbars otherwise wait for a selection, so
     * this is for tools that act on where the cursor is, such as adding a table row.
     */
    public function showWithCursor(bool $condition = true): static
    {
        $this->showsWithCursor = $condition;

        return $this;
    }

    public function group(?string $group): static
    {
        $this->group = $group;

        return $this;
    }

    public function order(int $order): static
    {
        $this->order = $order;

        return $this;
    }

    /**
     * Makes the button open a menu of items instead of running a command. A menu tool has no command or action of its
     * own, and can't go in the more menu. Its button shows the current item's icon.
     *
     * @param  array<ToolMenuItem>  $items
     */
    public function menu(array $items): static
    {
        $this->menu = array_values($items);

        return $this;
    }

    /**
     * The menu button's accessible name while an item is current, with `:item` for that item's label, such as
     * "Text align: :item". Without it the button keeps its own label.
     */
    public function currentLabel(?string $pattern): static
    {
        $this->currentLabel = $pattern;

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

    public function getAction(): ?string
    {
        return $this->action;
    }

    /**
     * @return array<int, mixed>
     */
    public function getArguments(): array
    {
        return $this->arguments;
    }

    public function getActiveName(): ?string
    {
        return $this->activeName;
    }

    /**
     * @return array<string, mixed>
     */
    public function getActiveAttributes(): array
    {
        return $this->activeAttributes;
    }

    public function hasActiveState(): bool
    {
        return $this->hasActiveState;
    }

    /**
     * @return ?array<ToolMenuItem>
     */
    public function getMenu(): ?array
    {
        return $this->menu;
    }

    public function isMenu(): bool
    {
        return $this->menu !== null;
    }

    public function getCurrentLabel(): ?string
    {
        return $this->currentLabel;
    }

    public function getScope(): ToolScope
    {
        return $this->scope;
    }

    /**
     * @return array<string>
     */
    public function getNodes(): array
    {
        return $this->nodes;
    }

    public function getGroup(): ?string
    {
        return $this->group;
    }

    public function checksAvailability(): bool
    {
        return $this->checksAvailability;
    }

    public function hidesInListItem(): bool
    {
        return $this->hidesInListItem;
    }

    public function showsWithCursor(): bool
    {
        return $this->showsWithCursor;
    }

    /**
     * Keeps the tool usable while the editor is read-only, for tools that change the view rather than the content,
     * such as a source view. Other tools are disabled while the editor isn't editable.
     */
    public function availableWhileReadOnly(bool $condition = true): static
    {
        $this->isAvailableWhileReadOnly = $condition;

        return $this;
    }

    public function isAvailableWhileReadOnly(): bool
    {
        return $this->isAvailableWhileReadOnly;
    }

    public function getOrder(): int
    {
        return $this->order;
    }

    /**
     * @return array{name: string, label: ?string, icon: ?string, shortcut: ?string, command: ?string, action: ?string, arguments: array<int, mixed>, active: ?array{name: ?string, attributes: array<string, mixed>}, menu: ?array<int, array<string, mixed>>, scope: string, nodes: array<string>, checksAvailability: bool, hidesInListItem: bool, availableWhileReadOnly: bool, group: ?string, order: int}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'icon' => $this->icon,
            'shortcut' => $this->shortcut,
            'command' => $this->command,
            'action' => $this->action,
            'arguments' => $this->arguments,
            'active' => $this->hasActiveState ? [
                'name' => $this->activeName,
                'attributes' => $this->activeAttributes,
            ] : null,
            'menu' => $this->menu === null ? null : array_map(static fn (ToolMenuItem $item): array => $item->toArray(), $this->menu),
            'scope' => $this->scope->value,
            'nodes' => $this->nodes,
            'checksAvailability' => $this->checksAvailability,
            'hidesInListItem' => $this->hidesInListItem,
            'availableWhileReadOnly' => $this->isAvailableWhileReadOnly,
            'group' => $this->group,
            'order' => $this->order,
        ];
    }
}

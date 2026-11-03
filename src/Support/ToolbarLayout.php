<?php

namespace Hollyit\RichEditorPlus\Support;

/**
 * What a toolbar shows, in order: groups of formatting tools and controls, with a divider between groups. Build one
 * with {@see PluginRegistry::getToolbarLayout()}.
 */
class ToolbarLayout
{
    /**
     * @param  array<int, array<int, Tool | ToolbarControl>>  $groups
     */
    public function __construct(protected array $groups) {}

    /**
     * The layout a toolbar has when its arrangement names no control: the placement's controls around the
     * formatting tools. The fixed toolbar leaves out the drag handle and move buttons.
     *
     * @param  array<Tool>  $inlineTools
     */
    public static function default(ToolbarPlacement $placement, array $inlineTools): static
    {
        $leading = $placement === ToolbarPlacement::Floating
            ? [ToolbarControl::DragHandle, ToolbarControl::BlockSwitcher, ToolbarControl::MoveUp, ToolbarControl::MoveDown]
            : [ToolbarControl::BlockSwitcher];

        return new static(array_values(array_filter([
            $leading,
            array_values($inlineTools),
            [ToolbarControl::ListOptions],
            [ToolbarControl::BlockTools],
            [ToolbarControl::More],
        ])));
    }

    /**
     * @return array<int, array<int, Tool | ToolbarControl>>
     */
    public function getGroups(): array
    {
        return $this->groups;
    }

    public function isEmpty(): bool
    {
        return $this->groups === [];
    }

    public function has(ToolbarControl $control): bool
    {
        foreach ($this->groups as $group) {
            if (in_array($control, $group, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<Tool>
     */
    public function getTools(): array
    {
        return array_values(array_filter(
            array_merge(...$this->groups),
            static fn (Tool|ToolbarControl $item): bool => $item instanceof Tool,
        ));
    }
}

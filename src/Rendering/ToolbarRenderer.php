<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolbarControl;
use Hollyit\RichEditorPlus\Support\ToolbarLayout;
use Hollyit\RichEditorPlus\Support\ToolbarPlacement;

use function Filament\Support\generate_icon_html;

/**
 * Renders the server-side markup for the toolbars. The browser only shows, hides and positions these elements and
 * keeps their state current; the tools themselves come from the plugins.
 */
class ToolbarRenderer
{
    /**
     * A floating toolbar, for one node type.
     *
     * @param  array<Tool>  $blockTools  the tools for this node type
     * @param  array<Tool>  $inlineTools  the text formatting tools, which the browser hides where marks are not allowed;
     *                                    ignored when a layout is given, as it holds its own
     * @param  bool  $hasListTypes  every toolbar needs the list button, because a list can sit inside any block
     * @param  ?ToolbarLayout  $layout  what the toolbar shows and in what order; the floating default without one
     */
    public function renderBlockToolbar(string $node, array $blockTools, array $inlineTools, bool $hasListTypes = false, ?ToolbarLayout $layout = null): string
    {
        $layout ??= ToolbarLayout::default(ToolbarPlacement::Floating, $inlineTools);

        $showsWithCursor = $layout->has(ToolbarControl::BlockTools)
            && array_filter($blockTools, static fn (Tool $tool): bool => $tool->showsWithCursor()) !== [];

        return '<div class="rep-toolbar" role="toolbar" aria-orientation="horizontal"'
            .' aria-label="'.e(__('rich-editor-plus::toolbar.block')).'" data-rep-block-toolbar="'.e($node).'"'
            .($showsWithCursor ? ' data-rep-show-with-cursor' : '').' hidden>'
            .$this->renderItems($layout, $blockTools === [] ? '' : $this->renderTools($blockTools), $hasListTypes, ToolbarPlacement::Floating)
            .'</div>';
    }

    /**
     * The toolbar above the editor. Its block tools section holds a group per node type, and the browser shows the
     * `*` group and the active block's. On a disabled field every button is disabled and the browser leaves it alone.
     *
     * @param  array<string, array<Tool>>  $blockToolGroups  from {@see PluginRegistry::getBlockToolGroups()}
     * @param  string  $attributes  extra attributes for the toolbar element, already escaped
     */
    public function renderFixedToolbar(ToolbarLayout $layout, array $blockToolGroups, bool $hasListTypes, bool $isSticky = true, bool $isDisabled = false, string $attributes = ''): string
    {
        $html = '<div class="rep-toolbar rep-fixed-toolbar'.($isSticky ? ' rep-fixed-toolbar-sticky' : '').'"'
            .' role="toolbar" aria-orientation="horizontal" aria-label="'.e(__('rich-editor-plus::toolbar.fixed')).'"'
            .' data-rep-fixed-toolbar'.($attributes === '' ? '' : ' '.$attributes).'>'
            .$this->renderItems($layout, $this->renderBlockToolGroups($blockToolGroups), $hasListTypes, ToolbarPlacement::Fixed, ($blockToolGroups['*'] ?? []) === [])
            .'</div>';

        return $isDisabled ? str_replace('<button ', '<button disabled ', $html) : $html;
    }

    /**
     * Writes the layout's groups in order. Formatting tools, the list button and the block tools each sit in a
     * section the browser can hide, with the divider that starts their group inside it, so hiding one leaves no
     * stray divider. The block tools section starts hidden when nothing shows for every block. A section with nothing to show, such as the list button on a field with no lists, is skipped.
     */
    protected function renderItems(ToolbarLayout $layout, string $blockToolsHtml, bool $hasListTypes, ToolbarPlacement $placement, bool $hidesBlockTools = false): string
    {
        $html = '';
        $hasItems = false;

        foreach ($layout->getGroups() as $group) {
            $startsGroup = true;

            foreach ($this->splitSections($group) as $section) {
                $sectionHtml = $this->renderSection($section, $blockToolsHtml, $hasListTypes, $placement, $hasItems && $startsGroup, $hidesBlockTools);

                if ($sectionHtml === '') {
                    continue;
                }

                $html .= $sectionHtml;
                $hasItems = true;
                $startsGroup = false;
            }
        }

        return $html;
    }

    /**
     * Each run of tools is one section, and each control is a section of its own.
     *
     * @param  array<int, Tool | ToolbarControl>  $group
     * @return array<int, array<Tool> | ToolbarControl>
     */
    protected function splitSections(array $group): array
    {
        $sections = [];

        foreach ($group as $item) {
            if ($item instanceof Tool && is_array(end($sections))) {
                $sections[array_key_last($sections)][] = $item;

                continue;
            }

            $sections[] = $item instanceof Tool ? [$item] : $item;
        }

        return $sections;
    }

    /**
     * @param  array<Tool> | ToolbarControl  $section
     */
    protected function renderSection(array|ToolbarControl $section, string $blockToolsHtml, bool $hasListTypes, ToolbarPlacement $placement, bool $withDivider, bool $hidesBlockTools = false): string
    {
        $divider = $withDivider ? $this->renderDivider() : '';

        if (is_array($section)) {
            return '<span class="rep-toolbar-group" data-rep-inline-tools>'.$divider.$this->renderTools($section).'</span>';
        }

        return match ($section) {
            ToolbarControl::BlockTools => $blockToolsHtml === ''
                ? ''
                : '<span class="rep-toolbar-group" data-rep-block-tools'.($hidesBlockTools ? ' hidden' : '').'>'.$divider.$blockToolsHtml.'</span>',
            ToolbarControl::ListOptions => $hasListTypes ? $this->renderListButton($divider, $placement) : '',
            ToolbarControl::DragHandle => $divider.$this->renderDragHandle(),
            ToolbarControl::BlockSwitcher => $divider.$this->renderSwitcher(),
            ToolbarControl::MoveUp => $divider.$this->renderControl('moveUp', 'mdi-arrow-up', __('rich-editor-plus::toolbar.move_up'), shortcut: 'Alt-Shift-ArrowUp'),
            ToolbarControl::MoveDown => $divider.$this->renderControl('moveDown', 'mdi-arrow-down', __('rich-editor-plus::toolbar.move_down'), shortcut: 'Alt-Shift-ArrowDown'),
            ToolbarControl::More => $divider.$this->renderControl('more', 'mdi-dots-horizontal', __('rich-editor-plus::toolbar.more'), 'aria-haspopup="menu" aria-expanded="false"'),
        };
    }

    /**
     * @param  array<string, array<Tool>>  $groups
     */
    protected function renderBlockToolGroups(array $groups): string
    {
        $html = '';

        foreach ($groups as $node => $tools) {
            $html .= '<span data-rep-block-tools-for="'.e($node).'"'.($node === '*' ? '' : ' hidden').'>'
                .$this->renderTools($tools)
                .'</span>';
        }

        return $html;
    }

    /**
     * The handle is left out of keyboard navigation because Alt+Shift+Arrow does the same job. Being hidden from
     * assistive technology, it has no accessible name, so its tooltip text is given separately.
     */
    protected function renderDragHandle(): string
    {
        $label = e(__('rich-editor-plus::toolbar.drag'));

        return '<button type="button" class="rep-tool rep-drag-handle" draggable="true" tabindex="-1" data-rep-drag-handle'
            .' aria-hidden="true" data-rep-tooltip="'.$label.'">'.generate_icon_html('mdi-drag')->toHtml().'</button>';
    }

    protected function renderSwitcher(): string
    {
        $label = e(__('rich-editor-plus::toolbar.switch'));

        return '<button type="button" class="rep-tool rep-switcher" tabindex="-1" data-rep-control="switcher"'
            .' data-rep-generic-label="'.e(__('rich-editor-plus::blocks.generic')).'"'
            .' data-rep-multiple-label="'.e(__('rich-editor-plus::blocks.multiple')).'"'
            .' aria-label="'.$label.'" aria-haspopup="menu" aria-expanded="false">'
            .'<span data-rep-switcher-icon></span><span class="rep-switcher-label" data-rep-switcher-label>'.e(__('rich-editor-plus::blocks.generic')).'</span>'
            .generate_icon_html('mdi-chevron-down')->toHtml().'</button>';
    }

    protected function renderControl(string $control, string $icon, string $label, string $attributes = '', ?string $shortcut = null): string
    {
        return '<button type="button" class="rep-tool" tabindex="-1" data-rep-control="'.e($control).'"'
            .' aria-label="'.e($label).'"'.$this->renderShortcut($shortcut).' '.$attributes.'>'
            .generate_icon_html($icon)->toHtml().'</button>';
    }

    /**
     * In a floating toolbar it stays hidden until the cursor is in a list item. The fixed toolbar keeps it in place,
     * disabled, with a generic name and icon until there is a list type to name it after. The browser fills in
     * the icon and names the list type.
     */
    protected function renderListButton(string $divider, ToolbarPlacement $placement): string
    {
        $isFixed = $placement === ToolbarPlacement::Fixed;

        return '<span class="rep-toolbar-group" data-rep-list-tools'.($isFixed ? '' : ' hidden').'>'
            .$divider
            .'<button type="button" class="rep-tool rep-list-button" tabindex="-1" data-rep-control="list"'
            .' data-rep-label="'.e(__('rich-editor-plus::toolbar.list_options')).'"'
            .($isFixed ? ' aria-label="'.e(__('rich-editor-plus::toolbar.list_menu')).'" data-rep-generic-label="'.e(__('rich-editor-plus::toolbar.list_menu')).'" aria-disabled="true"' : '')
            .' aria-haspopup="menu" aria-expanded="false">'
            .'<span data-rep-list-icon>'.($isFixed ? generate_icon_html('mdi-format-list-bulleted')->toHtml() : '').'</span>'
            .generate_icon_html('mdi-chevron-down')->toHtml()
            .'</button></span>';
    }

    protected function renderDivider(): string
    {
        return '<span class="rep-toolbar-divider" role="separator" aria-orientation="vertical"></span>';
    }

    /**
     * @param  array<Tool>  $tools
     */
    protected function renderTools(array $tools): string
    {
        $html = '';
        $previousGroup = null;

        foreach (array_values($tools) as $index => $tool) {
            if ($index > 0 && $tool->getGroup() !== $previousGroup) {
                $html .= '<span class="rep-toolbar-divider rep-toolbar-group-divider" role="separator" aria-orientation="vertical"></span>';
            }

            $html .= $this->renderTool($tool);
            $previousGroup = $tool->getGroup();
        }

        return $html;
    }

    protected function renderTool(Tool $tool): string
    {
        $label = e($tool->getLabel() ?? $tool->getName());
        $icon = generate_icon_html($tool->getIcon())?->toHtml() ?? $label;

        return '<button type="button" class="rep-tool" tabindex="-1" data-rep-tool="'.e($tool->getName()).'"'
            .' aria-label="'.$label.'"'.$this->renderShortcut($tool->getShortcut()).' aria-pressed="false">'.$icon.'</button>';
    }

    /**
     * The browser turns this into the tooltip's key hint and `aria-keyshortcuts`, both of which depend on the platform.
     */
    protected function renderShortcut(?string $shortcut): string
    {
        return $shortcut === null ? '' : ' data-rep-shortcut="'.e($shortcut).'"';
    }
}

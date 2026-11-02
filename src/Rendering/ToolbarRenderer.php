<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Support\Tool;

use function Filament\Support\generate_icon_html;

/**
 * Renders the server-side markup for the block toolbars. The browser only shows, hides and positions these elements
 * and keeps their state current; the tools themselves come from the plugins.
 */
class ToolbarRenderer
{
    /**
     * @param  array<Tool>  $blockTools  the tools for this node type
     * @param  array<Tool>  $inlineTools  the text formatting tools, which the browser hides where marks are not allowed
     * @param  bool  $hasListTypes  every toolbar needs the list button, because a list can sit inside any block
     */
    public function renderBlockToolbar(string $node, array $blockTools, array $inlineTools, bool $hasListTypes = false): string
    {
        $showsWithCursor = array_filter($blockTools, static fn (Tool $tool): bool => $tool->showsWithCursor()) !== [];

        $html = '<div class="rep-toolbar" role="toolbar" aria-orientation="horizontal"'
            .' aria-label="'.e(__('rich-editor-plus::toolbar.block')).'" data-rep-block-toolbar="'.e($node).'"'
            .($showsWithCursor ? ' data-rep-show-with-cursor' : '').' hidden>';

        $html .= $this->renderDragHandle();
        $html .= $this->renderSwitcher();
        $html .= $this->renderControl('moveUp', 'mdi-arrow-up', __('rich-editor-plus::toolbar.move_up'));
        $html .= $this->renderControl('moveDown', 'mdi-arrow-down', __('rich-editor-plus::toolbar.move_down'));

        if ($inlineTools !== []) {
            $html .= '<span class="rep-toolbar-group" data-rep-inline-tools>'
                .$this->renderDivider()
                .$this->renderTools($inlineTools)
                .'</span>';
        }

        if ($hasListTypes) {
            $html .= $this->renderListButton();
        }

        if ($blockTools !== []) {
            $html .= '<span class="rep-toolbar-group" data-rep-block-tools>'
                .$this->renderDivider()
                .$this->renderTools($blockTools)
                .'</span>';
        }

        $html .= $this->renderDivider();
        $html .= $this->renderControl('more', 'mdi-dots-horizontal', __('rich-editor-plus::toolbar.more'), 'aria-haspopup="menu" aria-expanded="false"');

        return $html.'</div>';
    }

    /**
     * The handle is left out of keyboard navigation because Alt+Shift+Arrow does the same job.
     */
    protected function renderDragHandle(): string
    {
        $label = e(__('rich-editor-plus::toolbar.drag'));

        return '<button type="button" class="rep-tool rep-drag-handle" draggable="true" tabindex="-1" data-rep-drag-handle'
            .' aria-hidden="true" title="'.$label.'">'.generate_icon_html('mdi-drag')->toHtml().'</button>';
    }

    protected function renderSwitcher(): string
    {
        $label = e(__('rich-editor-plus::toolbar.switch'));

        return '<button type="button" class="rep-tool rep-switcher" tabindex="-1" data-rep-control="switcher"'
            .' data-rep-generic-label="'.e(__('rich-editor-plus::blocks.generic')).'"'
            .' data-rep-multiple-label="'.e(__('rich-editor-plus::blocks.multiple')).'"'
            .' aria-label="'.$label.'" title="'.$label.'" aria-haspopup="menu" aria-expanded="false">'
            .'<span data-rep-switcher-icon></span><span class="rep-switcher-label" data-rep-switcher-label></span>'
            .generate_icon_html('mdi-chevron-down')->toHtml().'</button>';
    }

    protected function renderControl(string $control, string $icon, string $label, string $attributes = ''): string
    {
        return '<button type="button" class="rep-tool" tabindex="-1" data-rep-control="'.e($control).'"'
            .' aria-label="'.e($label).'" title="'.e($label).'" '.$attributes.'>'
            .generate_icon_html($icon)->toHtml().'</button>';
    }

    /**
     * Stays hidden until the cursor is in a list item. The browser fills in the icon and names the list type.
     */
    protected function renderListButton(): string
    {
        return '<span class="rep-toolbar-group" data-rep-list-tools hidden>'
            .$this->renderDivider()
            .'<button type="button" class="rep-tool rep-list-button" tabindex="-1" data-rep-control="list"'
            .' data-rep-label="'.e(__('rich-editor-plus::toolbar.list_options')).'" aria-haspopup="menu" aria-expanded="false">'
            .'<span data-rep-list-icon></span>'
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
            .' aria-label="'.$label.'" title="'.$label.'" aria-pressed="false">'.$icon.'</button>';
    }
}

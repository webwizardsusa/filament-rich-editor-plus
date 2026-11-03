<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\Tool;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;

use function Filament\Support\generate_icon_html;

/**
 * Renders the server-side markup for the slash menu, the block switcher and the more menu. Each is rendered once per
 * editor; the browser filters, positions and runs them.
 */
class BlockMenuRenderer
{
    /**
     * @param  array<BlockType>  $blockTypes
     */
    public function renderSlashMenu(array $blockTypes, string $idPrefix): string
    {
        if ($blockTypes === []) {
            return '';
        }

        $id = e($idPrefix).'-slash';

        $html = '<div class="rep-menu rep-slash-menu" id="'.$id.'" role="listbox"'
            .' aria-label="'.e(__('rich-editor-plus::toolbar.slash_menu')).'" data-rep-slash-menu hidden>';

        foreach ($blockTypes as $blockType) {
            $name = e($blockType->getName());

            $html .= '<button type="button" class="rep-menu-item" role="option" tabindex="-1" id="'.$id.'-'.$name.'"'
                .' data-rep-block-type="'.$name.'" aria-selected="false">'
                .$this->renderIcon($blockType)
                .'<span class="rep-menu-item-text"><span class="rep-menu-item-label">'.e($blockType->getLabel()).'</span>'
                .'<span class="rep-menu-item-description">'.e($blockType->getDescription() ?? '').'</span></span>'
                .'</button>';
        }

        return $html.'</div>';
    }

    /**
     * An empty list: search results are not known until the browser asks, so it adds the rows.
     */
    public function renderMentionMenu(string $idPrefix): string
    {
        return '<div class="rep-menu rep-slash-menu rep-mention-menu" id="'.e($idPrefix).'-mentions" role="listbox"'
            .' aria-label="'.e(__('rich-editor-plus::toolbar.mention_menu')).'" data-rep-mention-menu hidden></div>';
    }

    /**
     * @param  array<BlockType>  $blockTypes
     */
    public function renderSwitcherMenu(array $blockTypes): string
    {
        $html = '<div class="rep-menu" role="menu" aria-label="'.e(__('rich-editor-plus::toolbar.switch')).'" data-rep-switcher-menu hidden>';

        foreach ($blockTypes as $blockType) {
            if (! $blockType->isSwitchable()) {
                continue;
            }

            $html .= '<button type="button" class="rep-menu-item" role="menuitemradio" tabindex="-1" aria-checked="false"'
                .' data-rep-block-type="'.e($blockType->getName()).'">'
                .$this->renderIcon($blockType)
                .'<span class="rep-menu-item-label">'.e($blockType->getLabel()).'</span>'
                .'</button>';
        }

        return $html.'</div>';
    }

    /**
     * @param  array<Tool>  $tools
     */
    public function renderMoreMenu(array $tools = []): string
    {
        $html = '<div class="rep-menu" role="menu" aria-label="'.e(__('rich-editor-plus::toolbar.more')).'" data-rep-more-menu hidden>'
            .$this->renderMoreItem('selectParentBlock', 'mdi-arrow-top-left', __('rich-editor-plus::toolbar.select_parent'));

        foreach ($tools as $tool) {
            $html .= $this->renderMoreItem($tool->getCommand(), $tool->getIcon(), $tool->getLabel() ?? $tool->getName());
        }

        return $html
            .$this->renderMoreItem('duplicateBlock', 'mdi-content-duplicate', __('rich-editor-plus::toolbar.duplicate'))
            .$this->renderMoreItem('deleteBlock', 'mdi-delete-outline', __('rich-editor-plus::toolbar.delete'))
            .'</div>';
    }

    /**
     * The menu behind each menu tool, once per editor. Every toolbar showing the tool opens the same menu.
     *
     * @param  array<Tool>  $tools
     */
    public function renderToolMenus(array $tools): string
    {
        $html = '';

        foreach ($tools as $tool) {
            $html .= '<div class="rep-menu" role="menu" aria-label="'.e($tool->getLabel() ?? $tool->getName()).'"'
                .' data-rep-tool-menu="'.e($tool->getName()).'" hidden>';

            foreach ($tool->getMenu() ?? [] as $item) {
                $shortcut = $item->getShortcut();

                $html .= '<button type="button" class="rep-menu-item" role="menuitemradio" tabindex="-1" aria-checked="false"'
                    .' data-rep-menu-item="'.e($item->getName()).'">'
                    .$this->renderMenuItemIcon($item)
                    .'<span class="rep-menu-item-label">'.e($item->getLabel() ?? $item->getName()).'</span>'
                    .($shortcut === null ? '' : '<span class="rep-menu-item-shortcut" data-rep-shortcut="'.e($shortcut).'"></span>')
                    .'</button>';
            }

            $html .= '</div>';
        }

        return $html;
    }

    /**
     * The menu behind the list button. With one list type there is nothing to switch to, but the type stays in the
     * markup because the browser takes the button's icon and name from it.
     *
     * @param  array<BlockType>  $listTypes
     */
    public function renderListMenu(array $listTypes): string
    {
        if ($listTypes === []) {
            return '';
        }

        $hidden = count($listTypes) < 2 ? ' hidden' : '';

        $html = '<div class="rep-menu" role="menu" aria-label="'.e(__('rich-editor-plus::toolbar.list_menu')).'" data-rep-list-menu hidden>'
            .$this->renderListAction('decreaseBlockLevel', 'mdi-format-indent-decrease', __('rich-editor-plus::tools.decrease_level'))
            .$this->renderListAction('increaseBlockLevel', 'mdi-format-indent-increase', __('rich-editor-plus::tools.increase_level'))
            .'<span class="rep-menu-separator" role="separator" data-rep-list-separator'.$hidden.'></span>';

        foreach ($listTypes as $listType) {
            $html .= '<button type="button" class="rep-menu-item" role="menuitemradio" tabindex="-1"'
                .' data-rep-list-type="'.e($listType->getNodeName()).'" aria-checked="false"'.$hidden.'>'
                .$this->renderIcon($listType)
                .'<span class="rep-menu-item-label">'.e($listType->getLabel()).'</span>'
                .'</button>';
        }

        return $html.'</div>';
    }

    protected function renderListAction(string $command, string $icon, string $label): string
    {
        return '<button type="button" class="rep-menu-item" role="menuitem" tabindex="-1" data-rep-list-action="'.e($command).'">'
            .generate_icon_html($icon)->toHtml()
            .'<span class="rep-menu-item-label">'.e($label).'</span>'
            .'</button>';
    }

    public function renderLiveRegion(): string
    {
        return '<span class="rep-sr-only" aria-live="polite" data-rep-live'
            .' data-rep-moved-up="'.e(__('rich-editor-plus::toolbar.moved_up')).'"'
            .' data-rep-moved-down="'.e(__('rich-editor-plus::toolbar.moved_down')).'"></span>';
    }

    protected function renderMoreItem(string $command, ?string $icon, string $label): string
    {
        return '<button type="button" class="rep-menu-item" role="menuitem" tabindex="-1" data-rep-more-action="'.e($command).'">'
            .(generate_icon_html($icon)?->toHtml() ?? '')
            .'<span class="rep-menu-item-label">'.e($label).'</span>'
            .'</button>';
    }

    protected function renderMenuItemIcon(ToolMenuItem $item): string
    {
        $swatch = $item->getSwatch();

        if ($swatch === null) {
            return generate_icon_html($item->getIcon())?->toHtml() ?? '';
        }

        return '<span class="rep-swatch '.e($swatch['class']).'" data-rep-menu-icon aria-hidden="true">'.e($swatch['text'] ?? '').'</span>';
    }

    protected function renderIcon(BlockType $blockType): string
    {
        return generate_icon_html($blockType->getIcon())?->toHtml() ?? '';
    }
}

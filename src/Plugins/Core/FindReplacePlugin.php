<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

use function Filament\Support\generate_icon_html;

/**
 * Find and replace inside one editor. It adds no content, so it has no nodes or marks: the slash item and the more menu
 * item both run a command, and the browser binds the panel this plugin renders.
 */
class FindReplacePlugin extends Plugin
{
    public const ID = 'core/find-replace';

    protected const ICON = 'mdi-find-replace';

    public function getId(): string
    {
        return self::ID;
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('findReplace')
                ->label(__('rich-editor-plus::find.label'))
                ->description(__('rich-editor-plus::find.description'))
                ->icon(self::ICON)
                ->keywords(['find', 'search', 'replace'])
                ->command('openFindReplace')
                ->order(60),
        ];
    }

    public function getTools(): array
    {
        return [
            Tool::make('findReplace')
                ->label(__('rich-editor-plus::find.label'))
                ->icon(self::ICON)
                ->command('openFindReplace')
                ->overflow(),
        ];
    }

    public function getEditorHtml(): ?string
    {
        return '<div class="rep-find" role="search" aria-label="'.e(__('rich-editor-plus::find.label')).'" data-rep-find hidden'
            .' data-rep-find-count-label="'.e(__('rich-editor-plus::find.count')).'"'
            .' data-rep-find-no-results="'.e(__('rich-editor-plus::find.no_results')).'"'
            .' data-rep-find-replaced="'.e(__('rich-editor-plus::find.replaced')).'">'
            .'<div class="rep-find-row">'
            .$this->renderInput('query', __('rich-editor-plus::find.find'), __('rich-editor-plus::find.find_placeholder'))
            .$this->renderOption('matchCase', 'Aa', __('rich-editor-plus::find.match_case'))
            .$this->renderOption('wholeWord', 'W', __('rich-editor-plus::find.whole_word'))
            .'<span class="rep-find-count" aria-live="polite" data-rep-find-count></span>'
            .$this->renderIconAction('findPrevious', 'mdi-chevron-up', __('rich-editor-plus::find.previous'))
            .$this->renderIconAction('findNext', 'mdi-chevron-down', __('rich-editor-plus::find.next'))
            .$this->renderIconAction('closeFindReplace', 'mdi-close', __('rich-editor-plus::find.close'))
            .'</div>'
            .'<div class="rep-find-row">'
            .$this->renderInput('replacement', __('rich-editor-plus::find.replace_with'), __('rich-editor-plus::find.replace_with_placeholder'))
            .$this->renderTextAction('replaceCurrent', __('rich-editor-plus::find.replace'))
            .$this->renderTextAction('replaceAll', __('rich-editor-plus::find.replace_all'))
            .'</div>'
            .'</div>';
    }

    protected function renderInput(string $name, string $label, string $placeholder): string
    {
        return '<input type="text" class="rep-find-input" autocomplete="off" spellcheck="false" data-rep-find-'.e($name)
            .' aria-label="'.e($label).'" placeholder="'.e($placeholder).'">';
    }

    protected function renderOption(string $option, string $text, string $label): string
    {
        return '<button type="button" class="rep-tool rep-find-option" aria-pressed="false" data-rep-find-option="'.e($option).'"'
            .' aria-label="'.e($label).'">'.e($text).'</button>';
    }

    protected function renderIconAction(string $command, string $icon, string $label): string
    {
        return '<button type="button" class="rep-tool" data-rep-find-action="'.e($command).'"'
            .' aria-label="'.e($label).'">'.generate_icon_html($icon)->toHtml().'</button>';
    }

    protected function renderTextAction(string $command, string $label): string
    {
        return '<button type="button" class="rep-tool rep-find-text-button" data-rep-find-action="'.e($command).'"'
            .' aria-label="'.e($label).'">'.e($label).'</button>';
    }
}

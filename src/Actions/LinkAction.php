<?php

namespace Hollyit\RichEditorPlus\Actions;

use Filament\Actions\Action;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\TextInput;
use Filament\Support\Enums\Width;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\EditorCommand;

/**
 * The modal for adding, editing and removing a link. The browser mounts it with the current selection and, when
 * the selection is already a link, its URL and target; submitting sends the resulting commands back to the editor.
 */
class LinkAction
{
    public static function make(bool $opensInNewTabByDefault = false): Action
    {
        return Action::make('link')
            ->label(__('rich-editor-plus::actions.link.label'))
            ->modalHeading(__('rich-editor-plus::actions.link.modal.heading'))
            ->modalWidth(Width::Large)
            ->fillForm(fn (array $arguments): array => [
                'url' => $arguments['url'] ?? null,
                'shouldOpenInNewTab' => $arguments['shouldOpenInNewTab'] ?? $opensInNewTabByDefault,
            ])
            ->schema([
                TextInput::make('url')
                    ->label(__('rich-editor-plus::actions.link.modal.form.url'))
                    ->inputMode('url'),
                Checkbox::make('shouldOpenInNewTab')
                    ->label(__('rich-editor-plus::actions.link.modal.form.should_open_in_new_tab')),
            ])
            ->action(function (array $arguments, array $data, RichEditorPlus $component): void {
                $selection = $arguments['editorSelection'] ?? [];
                $isCaret = ($selection['type'] ?? null) === 'text' && $selection['head'] === $selection['anchor'];

                $commands = $isCaret ? [EditorCommand::make('extendMarkRange', ['link'])] : [];

                $commands[] = blank($data['url'] ?? null)
                    ? EditorCommand::make('unsetLink')
                    : EditorCommand::make('setLink', [[
                        'href' => $data['url'],
                        'target' => ($data['shouldOpenInNewTab'] ?? false) ? '_blank' : null,
                    ]]);

                $component->runCommands($commands, $selection ?: null);
            });
    }
}

<?php

namespace Hollyit\RichEditorPlus\Plugins\Table\Actions;

use Filament\Actions\Action;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\TextInput;
use Filament\Support\Enums\Width;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\EditorCommand;

class InsertTableAction
{
    public static function make(int $defaultRows = 3, int $defaultColumns = 3, bool $defaultHeaderRow = true): Action
    {
        return Action::make('insertTable')
            ->label(__('rich-editor-plus::actions.table.insert_table.label'))
            ->modalHeading(__('rich-editor-plus::actions.table.insert_table.modal.heading'))
            ->modalWidth(Width::Small)
            ->fillForm(fn (): array => [
                'rows' => $defaultRows,
                'columns' => $defaultColumns,
                'withHeaderRow' => $defaultHeaderRow,
            ])
            ->schema([
                TextInput::make('rows')
                    ->label(__('rich-editor-plus::actions.table.insert_table.modal.form.rows'))
                    ->numeric()
                    ->required()
                    ->minValue(1)
                    ->maxValue(50),
                TextInput::make('columns')
                    ->label(__('rich-editor-plus::actions.table.insert_table.modal.form.columns'))
                    ->numeric()
                    ->required()
                    ->minValue(1)
                    ->maxValue(20),
                Checkbox::make('withHeaderRow')
                    ->label(__('rich-editor-plus::actions.table.insert_table.modal.form.with_header_row')),
            ])
            ->action(function (array $arguments, array $data, RichEditorPlus $component): void {
                $component->runCommands(
                    [
                        EditorCommand::make('insertTable', [[
                            'rows' => (int) $data['rows'],
                            'cols' => (int) $data['columns'],
                            'withHeaderRow' => (bool) ($data['withHeaderRow'] ?? false),
                        ]]),
                    ],
                    $arguments['editorSelection'] ?? null,
                );
            });
    }
}

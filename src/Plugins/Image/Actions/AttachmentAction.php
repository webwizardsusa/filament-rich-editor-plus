<?php

namespace Hollyit\RichEditorPlus\Plugins\Image\Actions;

use Closure;
use Filament\Actions\Action;
use Filament\Actions\Contracts\HasActions;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Support\Enums\Width;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\EditorCommand;
use Hollyit\RichEditorPlus\Plugins\Image\AttachmentPlugin;
use Illuminate\Support\Facades\Storage;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

/**
 * The modal for inserting a file, or renaming or replacing the selected one. Submitting sends an `insertAttachment` or
 * `updateAttachment` command back to the editor.
 */
class AttachmentAction
{
    public static function make(AttachmentPlugin $plugin): Action
    {
        $currentOf = static fn (HasActions $livewire): ?array => static::currentAttachment($plugin, $livewire->getMountedAction()?->getArguments() ?? []);

        return Action::make('attachment')
            ->label(__('rich-editor-plus::attachment.modal.heading'))
            ->modalHeading(__('rich-editor-plus::attachment.modal.heading'))
            ->modalSubmitActionLabel(__('rich-editor-plus::attachment.modal.submit'))
            ->modalWidth(Width::Large)
            ->fillForm(fn (array $arguments): array => ['name' => is_string($arguments['name'] ?? null) ? $arguments['name'] : ''])
            ->schema([
                FileUpload::make('upload')
                    ->label(__('rich-editor-plus::attachment.modal.upload'))
                    ->disk($plugin->getDisk())
                    ->directory($plugin->getDirectory())
                    ->visibility($plugin->getVisibility())
                    ->maxSize($plugin->getMaxSize())
                    ->acceptedFileTypes($plugin->getAcceptedFileTypes())
                    ->rule(static fn (): Closure => $plugin->uploadedFileTypeRule())
                    ->getUploadedFileNameForStorageUsing(static fn (TemporaryUploadedFile $file): string => $plugin->storedFileName($file))
                    ->storeFileNamesIn('originalName')
                    ->live()
                    ->afterStateUpdated(function (mixed $state, Get $get, Set $set): void {
                        $file = is_array($state) ? (reset($state) ?: null) : $state;

                        if ($file instanceof TemporaryUploadedFile && blank($get('name'))) {
                            $set('name', AttachmentPlugin::sanitizeFileName($file->getClientOriginalName()));
                        }
                    })
                    ->helperText(fn (HasActions $livewire): ?string => $currentOf($livewire) !== null ? __('rich-editor-plus::attachment.modal.upload_keep') : null)
                    ->required(fn (HasActions $livewire): bool => $currentOf($livewire) === null),
                TextInput::make('name')
                    ->label(__('rich-editor-plus::attachment.modal.name'))
                    ->helperText(__('rich-editor-plus::attachment.modal.name_help'))
                    ->maxLength(255),
            ])
            ->action(function (array $arguments, array $data, RichEditorPlus $component) use ($plugin): void {
                $editing = (bool) ($arguments['editing'] ?? false);
                $upload = $data['upload'] ?? null;
                $upload = is_array($upload) ? (reset($upload) ?: null) : $upload;

                if (filled($upload)) {
                    $path = (string) $upload;
                    $disk = Storage::disk($plugin->getDisk());
                    $originalNames = $data['originalName'] ?? null;
                    $original = is_array($originalNames) ? ($originalNames[$path] ?? reset($originalNames) ?: null) : $originalNames;

                    $file = [
                        'disk' => $plugin->getDisk(),
                        'path' => $path,
                        'fallbackName' => is_string($original) && $original !== '' ? $original : basename($path),
                        'size' => (int) $disk->size($path),
                        'mime' => AttachmentPlugin::normalizeMime((string) $disk->mimeType($path)),
                    ];
                } else {
                    $current = static::currentAttachment($plugin, $arguments);

                    if ($current === null) {
                        return;
                    }

                    $file = [...$current, 'fallbackName' => $current['name'] !== '' ? $current['name'] : basename($current['path'])];
                }

                $name = AttachmentPlugin::sanitizeFileName((string) ($data['name'] ?? ''));

                $component->runCommands(
                    [
                        EditorCommand::make($editing ? 'updateAttachment' : 'insertAttachment', [[
                            'disk' => $file['disk'],
                            'path' => $file['path'],
                            'name' => $name !== '' ? $name : AttachmentPlugin::sanitizeFileName($file['fallbackName']),
                            'size' => $file['size'],
                            'mime' => $file['mime'],
                        ]]),
                    ],
                    $arguments['editorSelection'] ?? null,
                );
            });
    }

    /**
     * The attachment being edited, when it can be kept as it is: a string disk and path the plugin considers safe.
     * Mount arguments come from the browser, so size and type are kept only in their valid shapes.
     *
     * @param  array<string, mixed>  $arguments
     * @return ?array{disk: string, path: string, name: string, size: ?int, mime: ?string}
     */
    protected static function currentAttachment(AttachmentPlugin $plugin, array $arguments): ?array
    {
        if (! ($arguments['editing'] ?? false)) {
            return null;
        }

        $disk = $arguments['disk'] ?? null;
        $path = $arguments['path'] ?? null;

        if (! is_string($disk) || ! is_string($path) || ! $plugin->isSafePath($disk, $path)) {
            return null;
        }

        return [
            'disk' => $disk,
            'path' => $path,
            'name' => AttachmentPlugin::sanitizeFileName(is_string($arguments['name'] ?? null) ? $arguments['name'] : ''),
            'size' => AttachmentPlugin::normalizeSize($arguments['size'] ?? null),
            'mime' => AttachmentPlugin::normalizeMime($arguments['mime'] ?? null),
        ];
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Image\Actions;

use Closure;
use Filament\Actions\Action;
use Filament\Actions\Contracts\HasActions;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\ToggleButtons;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Support\Enums\Width;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\EditorCommand;

/**
 * The modal for inserting an image, or editing the selected one. The browser mounts it with the selection and, when
 * editing, the image's attributes; submitting sends an `insertImage` or `updateImage` command back to the editor.
 */
class ImageAction
{
    public static function make(ImagePlugin $plugin): Action
    {
        $alignments = [];

        foreach (ImagePlugin::ALIGNMENTS as $alignment) {
            $alignments[$alignment] = __("rich-editor-plus::image.alignments.{$alignment}");
        }

        $currentOf = static fn (HasActions $livewire): ?array => static::currentImage($plugin, $livewire->getMountedAction()?->getArguments() ?? []);

        $keepsStoredImage = static fn (HasActions $livewire): bool => ! $plugin->allowsUploads() && filled(static::currentImage($plugin, $livewire->getMountedAction()?->getArguments() ?? [])['disk'] ?? null);

        return Action::make('image')
            ->label(__('rich-editor-plus::image.modal.heading'))
            ->modalHeading(__('rich-editor-plus::image.modal.heading'))
            ->modalSubmitActionLabel(__('rich-editor-plus::image.modal.submit'))
            ->modalWidth(Width::Large)
            ->fillForm(function (array $arguments) use ($plugin): array {
                $alt = (string) ($arguments['alt'] ?? '');

                return [
                    'source' => ! $plugin->allowsUploads() || ($plugin->allowsUrls() && filled($arguments['url'] ?? null)) ? 'url' : 'upload',
                    'url' => $arguments['url'] ?? null,
                    'alt' => $alt,
                    'decorative' => ! $plugin->requiresAlt() && ($arguments['editing'] ?? false) && $alt === '',
                    'caption' => (string) ($arguments['caption'] ?? ''),
                    'align' => $arguments['align'] ?? $plugin->getDefaultAlignment(),
                    'width' => (string) ($arguments['width'] ?? $plugin->getDefaultWidth()),
                ];
            })
            ->schema([
                ToggleButtons::make('source')
                    ->label(__('rich-editor-plus::image.modal.source'))
                    ->options([
                        'upload' => __('rich-editor-plus::image.modal.sources.upload'),
                        'url' => __('rich-editor-plus::image.modal.sources.url'),
                    ])
                    ->default('upload')
                    ->inline()
                    ->live()
                    ->visible($plugin->allowsUrls() && $plugin->allowsUploads()),
                FileUpload::make('upload')
                    ->label(__('rich-editor-plus::image.modal.upload'))
                    ->image()
                    ->disk($plugin->getDisk())
                    ->directory($plugin->getDirectory())
                    ->visibility($plugin->getVisibility())
                    ->maxSize($plugin->getMaxSize())
                    ->acceptedFileTypes($plugin->getAcceptedFileTypes())
                    ->rule(static fn (): Closure => $plugin->uploadedFileTypeRule())
                    ->getUploadedFileNameForStorageUsing(static fn (TemporaryUploadedFile $file): string => $plugin->storedFileName($file))
                    ->helperText(fn (HasActions $livewire): ?string => $currentOf($livewire) !== null ? __('rich-editor-plus::image.modal.upload_keep') : null)
                    ->visible(fn (Get $get): bool => $plugin->allowsUploads() && $get('source') !== 'url')
                    ->required(fn (HasActions $livewire, Get $get): bool => $plugin->allowsUploads() && $get('source') !== 'url' && $currentOf($livewire) === null),
                TextInput::make('url')
                    ->label(__('rich-editor-plus::image.modal.url'))
                    ->rule(static fn (): Closure => static function (string $attribute, mixed $value, Closure $fail): void {
                        if (! ImagePlugin::isAllowedImageUrl($value)) {
                            $fail(__('rich-editor-plus::image.modal.url_invalid'));
                        }
                    })
                    ->visible(fn (Get $get): bool => $get('source') === 'url')
                    ->required(fn (HasActions $livewire, Get $get): bool => $get('source') === 'url' && ! $keepsStoredImage($livewire)),
                Checkbox::make('decorative')
                    ->label(__('rich-editor-plus::image.modal.decorative'))
                    ->live()
                    ->visible(! $plugin->requiresAlt()),
                TextInput::make('alt')
                    ->label(__('rich-editor-plus::image.modal.alt'))
                    ->helperText(__('rich-editor-plus::image.modal.alt_help'))
                    ->required(fn (Get $get): bool => $plugin->requiresAlt() || ! $get('decorative'))
                    ->hidden(fn (Get $get): bool => ! $plugin->requiresAlt() && (bool) $get('decorative')),
                TextInput::make('caption')
                    ->label(__('rich-editor-plus::image.modal.caption')),
                Select::make('align')
                    ->label(__('rich-editor-plus::image.modal.align'))
                    ->options($alignments)
                    ->required()
                    ->native(false),
                Select::make('width')
                    ->label(__('rich-editor-plus::image.modal.width'))
                    ->options($plugin->getWidths())
                    ->required()
                    ->native(false),
            ])
            ->action(function (array $arguments, array $data, RichEditorPlus $component) use ($plugin): void {
                $editing = (bool) ($arguments['editing'] ?? false);

                $keepsStoredImage = ! $plugin->allowsUploads() && blank($data['url'] ?? null) && filled(static::currentImage($plugin, $arguments)['disk'] ?? null);

                if ((($data['source'] ?? 'upload') === 'url' || ! $plugin->allowsUploads()) && $plugin->allowsUrls() && ! $keepsStoredImage) {
                    $file = ['disk' => null, 'path' => null, 'url' => $data['url']];
                } else {
                    $upload = $data['upload'] ?? null;
                    $upload = is_array($upload) ? (reset($upload) ?: null) : $upload;

                    $file = filled($upload)
                        ? ['disk' => $plugin->getDisk(), 'path' => (string) $upload, 'url' => null]
                        : (static::currentImage($plugin, $arguments) ?? ['disk' => null, 'path' => null, 'url' => null]);
                }

                $isDecorative = ! $plugin->requiresAlt() && (bool) ($data['decorative'] ?? false);

                $component->runCommands(
                    [
                        EditorCommand::make($editing ? 'updateImage' : 'insertImage', [[
                            ...$file,
                            'alt' => $isDecorative ? '' : trim((string) ($data['alt'] ?? '')),
                            'caption' => trim((string) ($data['caption'] ?? '')),
                            'align' => $data['align'],
                            'width' => (string) $data['width'],
                        ]]),
                    ],
                    $arguments['editorSelection'] ?? null,
                );
            });
    }

    /**
     * The image being edited, when it can be kept as it is: an upload on a string disk and path the plugin considers
     * safe, or an external image with an http(s) or relative URL. Mount arguments come from the browser, so nothing else is kept.
     *
     * @param  array<string, mixed>  $arguments
     * @return ?array{disk: ?string, path: ?string, url: ?string}
     */
    protected static function currentImage(ImagePlugin $plugin, array $arguments): ?array
    {
        if (! ($arguments['editing'] ?? false)) {
            return null;
        }

        $disk = $arguments['disk'] ?? null;
        $path = $arguments['path'] ?? null;
        $url = $arguments['url'] ?? null;

        if (is_string($disk) && is_string($path) && $plugin->isSafePath($disk, $path)) {
            return ['disk' => $disk, 'path' => $path, 'url' => null];
        }

        if (ImagePlugin::isAllowedImageUrl($url)) {
            return ['disk' => null, 'path' => null, 'url' => trim($url)];
        }

        return null;
    }
}

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
use Illuminate\Http\UploadedFile;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImageCache\ImageCacheImages;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\EditorCommand;

/**
 * The modal for inserting an image, or editing the selected one. The browser mounts it with the selection and, when
 * editing, the image's attributes; submitting sends an `insertImage` or `updateImage` command back to the editor.
 * With `ImagePlugin::imageCache()`, an upload becomes an Image and an Image Style select sits beside the alignment.
 */
class ImageAction
{
    public static function make(ImagePlugin $plugin): Action
    {
        $alignments = [];

        foreach (ImagePlugin::ALIGNMENTS as $alignment) {
            $alignments[$alignment] = __("rich-editor-plus::image.alignments.{$alignment}");
        }

        $styles = [];

        foreach ($plugin->usesImageCache() ? $plugin->imageCacheImages()->styles() : [] as $style) {
            $styles[$style] = str($style)->headline()->toString();
        }

        $currentOf = static fn (HasActions $livewire): ?array => static::currentImage($plugin, $livewire->getMountedAction()?->getArguments() ?? []);

        $keepsStoredImage = static fn (HasActions $livewire): bool => ! $plugin->allowsUploads() && static::isStored($currentOf($livewire));

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
                    'style' => $plugin->usesImageCache() ? $plugin->imageCacheImages()->normalizeStyle($arguments['style'] ?? null) : null,
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
                    // Image Cache stores the file itself, as an Image.
                    ->storeFiles(! $plugin->usesImageCache())
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
                Select::make('style')
                    ->label(__('rich-editor-plus::image.modal.style'))
                    ->helperText(__('rich-editor-plus::image.modal.style_help'))
                    ->options($styles)
                    ->required()
                    ->native(false)
                    ->visible(fn (Get $get): bool => $plugin->usesImageCache() && $get('source') !== 'url'),
                Select::make('align')
                    ->label(__('rich-editor-plus::image.modal.align'))
                    ->options($alignments)
                    ->required()
                    ->native(false),
                Select::make('width')
                    ->label(__('rich-editor-plus::image.modal.width'))
                    ->options($plugin->getWidthLabels())
                    ->required()
                    ->native(false),
            ])
            ->action(function (array $arguments, array $data, RichEditorPlus $component) use ($plugin): void {
                $editing = (bool) ($arguments['editing'] ?? false);

                $current = static::currentImage($plugin, $arguments);
                $keepsStoredImage = ! $plugin->allowsUploads() && blank($data['url'] ?? null) && static::isStored($current);
                $none = ['disk' => null, 'path' => null, 'url' => null, ...($plugin->usesImageCache() ? ['image' => null] : [])];

                if ((($data['source'] ?? 'upload') === 'url' || ! $plugin->allowsUploads()) && $plugin->allowsUrls() && ! $keepsStoredImage) {
                    $file = [...$none, 'url' => $data['url']];
                } else {
                    $upload = $data['upload'] ?? null;
                    $upload = is_array($upload) ? (reset($upload) ?: null) : $upload;

                    $file = match (true) {
                        $upload instanceof UploadedFile && $plugin->usesImageCache() => [...$none, 'image' => $plugin->imageCacheImages()->store($upload)->ulid],
                        filled($upload) => [...$none, 'disk' => $plugin->getDisk(), 'path' => (string) $upload],
                        default => $current !== null ? [...$none, ...$current] : $none,
                    };
                }

                if ($plugin->usesImageCache()) {
                    $file['style'] = filled($file['image'] ?? null) ? $plugin->imageCacheImages()->normalizeStyle($data['style'] ?? null) : null;
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
     * The image being edited, when it can be kept as it is: with `imageCache()`, a Placement of an Image the field may
     * show; an upload on a string disk and path the plugin considers safe; or an external image with an http(s) or
     * relative URL. Mount arguments come from the browser, so nothing else is kept.
     *
     * @param  array<string, mixed>  $arguments
     * @return ?array{disk: ?string, path: ?string, url: ?string, image?: string}
     */
    protected static function currentImage(ImagePlugin $plugin, array $arguments): ?array
    {
        if (! ($arguments['editing'] ?? false)) {
            return null;
        }

        $ulid = $plugin->usesImageCache() ? ImageCacheImages::normalizeUlid($arguments['image'] ?? null) : null;

        if ($ulid !== null && $plugin->imageCacheImages()->find([$ulid])->has($ulid)) {
            return ['disk' => null, 'path' => null, 'url' => null, 'image' => $ulid];
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

    /**
     * Whether the image being edited is stored, as a Placement or by disk and path, rather than linked by URL.
     *
     * @param  ?array{disk: ?string, path: ?string, url: ?string, image?: string}  $current
     */
    protected static function isStored(?array $current): bool
    {
        return filled($current['image'] ?? null) || filled($current['disk'] ?? null);
    }
}

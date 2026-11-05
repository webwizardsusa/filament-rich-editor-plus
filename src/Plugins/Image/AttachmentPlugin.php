<?php

namespace Hollyit\RichEditorPlus\Plugins\Image;

use DOMElement;
use Filament\Actions\Action;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Contracts\AcceptsEditorUploads;
use Hollyit\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Hollyit\RichEditorPlus\Plugins\Contracts\InheritsFieldFileAttachments;
use Hollyit\RichEditorPlus\Plugins\Contracts\PatchesRenderedMarkup;
use Hollyit\RichEditorPlus\Plugins\Contracts\ProvidesEditorStyles;
use Hollyit\RichEditorPlus\Plugins\Image\Actions\AttachmentAction;
use Hollyit\RichEditorPlus\Plugins\Image\Concerns\StoresEditorFiles;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;
use InvalidArgumentException;

/**
 * Files other than images, as `<div class="rep-attachment" data-type="attachment">` cards with a download link, the
 * file's name and its size. Like images, they store their disk and path, never their URL: the link is resolved when
 * content is rendered and when the editor shows it.
 */
class AttachmentPlugin extends Plugin implements AcceptsEditorUploads, AnswersEditorRequests, InheritsFieldFileAttachments, PatchesRenderedMarkup, ProvidesEditorStyles
{
    use StoresEditorFiles;

    public const string ID = 'hollyit/attachment';

    /**
     * @var array<string>
     */
    public const array DEFAULT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
    ];

    /**
     * Never accepted, even when configured: a file on a public disk is served from the site's own domain, so these
     * could run script there.
     *
     * @var array<string>
     */
    public const array DENIED_TYPES = [
        'text/html',
        'application/xhtml+xml',
        'image/svg+xml',
        'text/xml',
        'application/xml',
        'text/javascript',
        'application/javascript',
        'application/x-httpd-php',
        'text/x-php',
        'application/x-php',
        'application/x-sh',
        'text/x-shellscript',
        'application/x-msdownload',
        'application/x-dosexec',
        'application/x-executable',
        'application/x-pie-executable',
        'application/x-sharedlib',
        'application/x-elf',
    ];

    public function acceptsEditorUploads(): bool
    {
        return true;
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function getNodes(): array
    {
        $this->assertConfigured();

        $noAttributes = static fn (): array => [];

        return [
            NodeSpec::make('attachment')
                ->atom()
                ->priority(55)
                ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'div' && $element->getAttribute('data-type') === 'attachment')
                ->attribute('disk', parse: static fn (DOMElement $element): ?string => $element->getAttribute('data-disk') ?: null, render: $noAttributes)
                ->attribute('path', parse: static fn (DOMElement $element): ?string => $element->getAttribute('data-path') ?: null, render: $noAttributes)
                ->attribute('name', parse: static fn (DOMElement $element): string => static::sanitizeFileName($element->getElementsByTagName('a')->item(0)?->textContent ?? ''), render: $noAttributes, default: '')
                ->attribute('size', parse: static fn (DOMElement $element): ?int => static::normalizeSize($element->getAttribute('data-size')), render: $noAttributes)
                ->attribute('mime', parse: static fn (DOMElement $element): ?string => static::normalizeMime($element->getAttribute('data-mime')), render: $noAttributes)
                ->transientAttribute('href', ['http', 'https'])
                ->renderUsing(fn (array $node, array $attributes): array => $this->renderCard(is_array($node['attrs'] ?? null) ? $node['attrs'] : [], $attributes))
                ->textUsing(static fn (array $node): string => is_string($node['attrs']['name'] ?? null) ? $node['attrs']['name'] : ''),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        $this->assertConfigured();

        return JsExtension::make(self::ID, [
            'uploads' => $this->uploadOptions(),
            'labels' => [
                'open' => __('rich-editor-plus::attachment.editor.open'),
                'loading' => __('rich-editor-plus::attachment.editor.loading'),
                'missing' => __('rich-editor-plus::attachment.editor.missing'),
            ],
            'uploadLabels' => $this->uploadLabels(),
        ])->module(ImageAssets::moduleUrl());
    }

    /**
     * The modal for inserting a file, or renaming or replacing the selected one.
     *
     * @return array<Action>
     */
    public function getActions(): array
    {
        return [AttachmentAction::make($this)];
    }

    /**
     * The slash menu's "File" block, which opens the attachment modal.
     *
     * @return array<BlockType>
     */
    public function getBlockTypes(): array
    {
        return [
            BlockType::make('attachment')
                ->label(__('rich-editor-plus::attachment.block.label'))
                ->description(__('rich-editor-plus::attachment.block.description'))
                ->icon('mdi-paperclip')
                ->keywords(['attachment', 'upload', 'document', 'pdf'])
                ->node('attachment')
                ->action('attachment')
                ->order(61),
        ];
    }

    /**
     * The block toolbar's "Edit file" tool for a selected attachment.
     *
     * @return array<Tool>
     */
    public function getTools(): array
    {
        return [
            Tool::make('editAttachment')
                ->label(__('rich-editor-plus::attachment.tools.edit'))
                ->icon('mdi-file-edit-outline')
                ->action('attachment')
                ->block()
                ->nodes(['attachment'])
                ->order(10),
        ];
    }

    /**
     * @return array<int, string>
     */
    public function getRenderedNodes(): array
    {
        return ['attachment'];
    }

    /**
     * @return array<int, string>
     */
    public function getRenderedMarkupNodes(): array
    {
        return ['attachment'];
    }

    /**
     * Gives every attachment its download URL. A stored document comes from the browser, so an `href` in it is dropped
     * and only a URL for a safe path on the plugin's disk is set.
     */
    public function prepareRenderedContents(array $documents): array
    {
        foreach ($documents as $key => $document) {
            if (is_array($document)) {
                $documents[$key] = $this->fillFileUrls($document, 'attachment', 'href');
            }
        }

        return $documents;
    }

    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
    {
        return match ($request) {
            'urls' => $this->answerUrlsRequest($payload),
            'store' => $this->answerStoreRequest($payload, $field),
            default => [],
        };
    }

    public function getEditorStyles(): string
    {
        return $this->getStylesheet();
    }

    public function getStylesheet(): string
    {
        return implode("\n", [
            '.rep-attachment{display:flex;align-items:center;gap:.75rem;margin:1rem 0;padding:.75rem 1rem;border:1px solid rgba(127,127,127,.35);border-radius:.5rem}',
            '.rep-attachment::before{content:"FILE";flex:none;padding:.25rem .375rem;border-radius:.25rem;background:rgba(127,127,127,.15);font-size:.7em;font-weight:600;letter-spacing:.05em}',
            '.rep-attachment[data-mime="application/pdf"]::before{content:"PDF"}',
            '.rep-attachment:is([data-mime*="word"],[data-mime*="opendocument.text"])::before{content:"DOC"}',
            '.rep-attachment:is([data-mime*="excel"],[data-mime*="sheet"],[data-mime="text/csv"])::before{content:"XLS"}',
            '.rep-attachment:is([data-mime*="powerpoint"],[data-mime*="presentation"])::before{content:"PPT"}',
            '.rep-attachment[data-mime="application/zip"]::before{content:"ZIP"}',
            '.rep-attachment a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.rep-attachment-size{flex:none;font-size:.875em;opacity:.7}',
        ]);
    }

    public static function normalizeSize(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value >= 0 ? $value : null;
        }

        return is_string($value) && preg_match('/^\d{1,15}\z/', $value) === 1 ? (int) $value : null;
    }

    public static function normalizeMime(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^[a-z0-9.+-]+\/[a-z0-9.+-]+\z/', $value) === 1 ? $value : null;
    }

    protected function defaultDirectory(): string
    {
        return 'editor-attachments';
    }

    protected function defaultMaxSize(): int
    {
        return 10240;
    }

    /**
     * @return array<string>
     */
    protected function defaultAcceptedFileTypes(): array
    {
        return self::DEFAULT_TYPES;
    }

    protected function refusesFileType(string $mime): bool
    {
        return in_array(strtolower($mime), self::DENIED_TYPES, true);
    }

    /**
     * @param  array<string, mixed>  $attrs
     * @param  array<string, mixed>  $attributes
     * @return array<mixed>
     */
    protected function renderCard(array $attrs, array $attributes): array
    {
        $disk = $attrs['disk'] ?? null;
        $path = $attrs['path'] ?? null;
        $isUpload = is_string($disk) && is_string($path);
        $size = static::normalizeSize($attrs['size'] ?? null);
        $name = static::sanitizeFileName(is_string($attrs['name'] ?? null) ? $attrs['name'] : '');
        $present = static fn (mixed $value): bool => $value !== null;

        $card = array_filter([
            'class' => 'rep-attachment',
            'data-type' => 'attachment',
            'data-disk' => $isUpload ? $disk : null,
            'data-path' => $isUpload ? $path : null,
            'data-size' => $size === null ? null : (string) $size,
            'data-mime' => static::normalizeMime($attrs['mime'] ?? null),
        ], $present);

        $link = array_filter(['href' => $isUpload ? ($attributes['href'] ?? null) : null, 'download' => $name], $present);

        return [
            'div',
            $card,
            ['a', $link, $name],
            ...($size !== null ? [['span', ['class' => 'rep-attachment-size'], static::formatFileSize($size)]] : []),
        ];
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function assertConfigured(): void
    {
        foreach ($this->getAcceptedFileTypes() as $type) {
            if (is_string($type) && $this->refusesFileType($type)) {
                throw new InvalidArgumentException(class_basename(static::class)." can never accept [{$type}]: files on a public disk are served from the site's own domain, so it could run script there.");
            }
        }

        $this->assertStorageConfigured();
    }
}

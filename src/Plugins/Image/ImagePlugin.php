<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Image;

use DOMElement;
use InvalidArgumentException;
use Webwizardsusa\RichEditorPlus\Content\ContentSpec;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AcceptsEditorUploads;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\InheritsFieldFileAttachments;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\PatchesRenderedMarkup;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesEditorStyles;
use Webwizardsusa\RichEditorPlus\Plugins\Image\Actions\ImageAction;
use Webwizardsusa\RichEditorPlus\Plugins\Image\Concerns\StoresEditorFiles;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\BlockType;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;
use Webwizardsusa\RichEditorPlus\Support\ToolMenuItem;

/**
 * Images on a Laravel disk or at a URL, as `<figure class="rep-image" data-type="image">` blocks with alt text, a
 * caption, an alignment and a width. Uploads store their disk and path, never their URL: the URL is resolved when
 * content is rendered and when the editor shows it, so private disks get temporary URLs.
 */
class ImagePlugin extends Plugin implements AcceptsEditorUploads, AnswersEditorRequests, InheritsFieldFileAttachments, PatchesRenderedMarkup, ProvidesEditorStyles
{
    use StoresEditorFiles {
        withFieldFileAttachments as withFieldStorage;
    }

    public const string ID = 'webwizardsusa/image';

    /**
     * @var array<string>
     */
    public const array ALIGNMENTS = ['left', 'center', 'right', 'wide'];

    protected bool $allowsUrls = true;

    protected bool $allowsUploads = true;

    protected bool $requiresAlt = true;

    /**
     * @var array<string, string>
     */
    protected array $widths = ['25' => '25%', '50' => '50%', '75' => '75%', '100' => '100%'];

    protected string $defaultWidth = '100';

    protected string $defaultAlignment = 'center';

    public function allowUrls(bool $condition = true): static
    {
        $this->allowsUrls = $condition;

        return $this;
    }

    /**
     * With `false`, images come from URLs only: the modal shows the URL field, and pasted and dropped image files are
     * not taken. Needs `allowUrls()`.
     */
    public function allowUploads(bool $condition = true): static
    {
        $this->allowsUploads = $condition;

        return $this;
    }

    public function altRequired(bool $condition = true): static
    {
        $this->requiresAlt = $condition;

        return $this;
    }

    /**
     * Width keys and the CSS width each stands for.
     *
     * @param  array<string, string>  $widths
     */
    public function widths(array $widths): static
    {
        $this->widths = $widths;

        return $this;
    }

    public function defaultWidth(string $width): static
    {
        $this->defaultWidth = $width;

        return $this;
    }

    public function defaultAlignment(string $alignment): static
    {
        $this->defaultAlignment = $alignment;

        return $this;
    }

    /**
     * Also takes the field's accepted types, since Filament's editor attachments are images, and turns uploads off
     * after `fileAttachments(false)`.
     *
     * @param  array{disk?: string, directory?: string, visibility?: string, maxSize?: int, acceptedFileTypes?: array<string>, uploads?: bool}  $defaults
     */
    public function withFieldFileAttachments(array $defaults): static
    {
        $plugin = $this->withFieldStorage($defaults);
        $plugin->acceptedFileTypes ??= $defaults['acceptedFileTypes'] ?? null;

        if (($defaults['uploads'] ?? true) === false) {
            $plugin->allowsUploads = false;
        }

        return $plugin;
    }

    public function allowsUrls(): bool
    {
        return $this->allowsUrls;
    }

    public function allowsUploads(): bool
    {
        return $this->allowsUploads;
    }

    public function acceptsEditorUploads(): bool
    {
        return $this->allowsUploads;
    }

    public function requiresAlt(): bool
    {
        return $this->requiresAlt;
    }

    /**
     * @return array<string, string>
     */
    public function getWidths(): array
    {
        return $this->widths;
    }

    public function getDefaultWidth(): string
    {
        return $this->defaultWidth;
    }

    public function getDefaultAlignment(): string
    {
        return $this->defaultAlignment;
    }

    protected function defaultDirectory(): string
    {
        return 'editor-images';
    }

    protected function defaultMaxSize(): int
    {
        return 5120;
    }

    /**
     * @return array<string>
     */
    protected function defaultAcceptedFileTypes(): array
    {
        return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    }

    /**
     * Pasted and dropped images show at once: the answer carries the image's URL for the editor's cache.
     *
     * @param  array{disk: string, path: string, name: string, size: int, mime: string}  $answer
     * @return array<string, mixed>
     */
    protected function storedFileAnswer(array $answer): array
    {
        return [...$answer, 'url' => $this->resolveUrl($answer['disk'], $answer['path'])];
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function getActions(): array
    {
        return [ImageAction::make($this)];
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('image')
                ->label(__('rich-editor-plus::image.block.label'))
                ->description(__('rich-editor-plus::image.block.description'))
                ->icon('mdi-image-outline')
                ->keywords(['picture', 'photo'])
                ->node('image')
                ->action('image')
                ->order(60),
        ];
    }

    public function getTools(): array
    {
        return [
            Tool::make('editImage')
                ->label(__('rich-editor-plus::image.tools.edit'))
                ->icon('mdi-image-edit-outline')
                ->action('image')
                ->block()
                ->nodes(['image'])
                ->order(10),
            Tool::make('imageAlign')
                ->label(__('rich-editor-plus::image.tools.align'))
                ->currentLabel(__('rich-editor-plus::image.tools.align_current'))
                ->icon('mdi-format-align-center')
                ->menu(array_map(fn (string $alignment): ToolMenuItem => ToolMenuItem::make($alignment)
                    ->label(__("rich-editor-plus::image.alignments.{$alignment}"))
                    ->icon($alignment === 'wide' ? 'mdi-arrow-expand-horizontal' : "mdi-format-align-{$alignment}")
                    ->command('setImageAlign', [$alignment])
                    ->active('image', ['align' => $alignment]), self::ALIGNMENTS))
                ->block()
                ->nodes(['image'])
                ->order(11),
            Tool::make('imageWidth')
                ->label(__('rich-editor-plus::image.tools.width'))
                ->currentLabel(__('rich-editor-plus::image.tools.width_current'))
                ->icon('mdi-arrow-left-right')
                ->menu(array_map(fn (string $key): ToolMenuItem => ToolMenuItem::make($key)
                    ->label($this->widths[$key])
                    ->command('setImageWidth', [$key])
                    ->active('image', ['width' => $key]), array_map(strval(...), array_keys($this->widths))))
                ->block()
                ->nodes(['image'])
                ->order(12),
        ];
    }

    public function getNodes(): array
    {
        $this->assertConfigured();

        $img = static fn (DOMElement $element): ?DOMElement => strtolower($element->tagName) === 'img'
            ? $element
            : ($element->getElementsByTagName('img')->item(0) instanceof DOMElement ? $element->getElementsByTagName('img')->item(0) : null);

        $noAttributes = static fn (): array => [];

        return [
            NodeSpec::make('image')
                ->atom()
                ->priority(60)
                ->parseUsing(static function (DOMElement $element): array|bool {
                    $tag = strtolower($element->tagName);

                    if ($tag === 'figure') {
                        return $element->getAttribute('data-type') === 'image';
                    }

                    if ($tag === 'img' && static::isAllowedImageUrl($element->getAttribute('src'))) {
                        return ['url' => trim($element->getAttribute('src'))];
                    }

                    return false;
                })
                ->attribute('disk', parse: static fn (DOMElement $element): ?string => $element->getAttribute('data-disk') ?: null, render: $noAttributes)
                ->attribute('path', parse: static fn (DOMElement $element): ?string => $element->getAttribute('data-path') ?: null, render: $noAttributes)
                ->attribute('url', parse: static fn (DOMElement $element): ?string => static::isAllowedImageUrl($element->getAttribute('data-url')) ? trim($element->getAttribute('data-url')) : null, render: $noAttributes)
                ->attribute('alt', parse: static fn (DOMElement $element): string => $img($element)?->getAttribute('alt') ?? '', render: $noAttributes, default: '')
                ->attribute('caption', parse: static fn (DOMElement $element): string => trim($element->getElementsByTagName('figcaption')->item(0)?->textContent ?? ''), render: $noAttributes, default: '')
                ->attribute('align', parse: fn (DOMElement $element): string => $this->normalizeAlignment($element->getAttribute('data-align')), render: $noAttributes, default: $this->defaultAlignment)
                ->attribute('width', parse: fn (DOMElement $element): string => $this->normalizeWidth($element->getAttribute('data-width')), render: $noAttributes, default: $this->defaultWidth)
                ->transientAttribute('src', ['http', 'https'])
                ->renderUsing(fn (array $node, array $attributes): array => $this->renderFigure(is_array($node['attrs'] ?? null) ? $node['attrs'] : [], $attributes))
                ->textUsing(static function (array $node): string {
                    $caption = $node['attrs']['caption'] ?? null;
                    $alt = $node['attrs']['alt'] ?? null;

                    return is_string($caption) && $caption !== '' ? $caption : (is_string($alt) ? $alt : '');
                }),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        $this->assertConfigured();

        return JsExtension::make(self::ID, [
            'widths' => array_map(strval(...), array_keys($this->widths)),
            'defaultWidth' => $this->defaultWidth,
            'defaultAlignment' => $this->defaultAlignment,
            'altRequired' => $this->requiresAlt,
            'uploads' => $this->allowsUploads ? $this->uploadOptions() : null,
            'labels' => [
                'loading' => __('rich-editor-plus::image.editor.loading'),
                'missing' => __('rich-editor-plus::image.editor.missing'),
                'needsAlt' => __('rich-editor-plus::image.editor.needs_alt'),
            ],
            'uploadLabels' => $this->uploadLabels(),
        ])->module(ImageAssets::moduleUrl());
    }

    /**
     * @return array<int, string>
     */
    public function getRenderedNodes(): array
    {
        return ['image'];
    }

    /**
     * @return array<int, string>
     */
    public function getRenderedMarkupNodes(): array
    {
        return ['image'];
    }

    /**
     * Gives every uploaded image its display URL. A stored document comes from the browser, so a `src` in it is
     * dropped and only a URL for a safe path on the plugin's disk is set.
     */
    public function prepareRenderedContents(array $documents): array
    {
        foreach ($documents as $key => $document) {
            if (is_array($document)) {
                $documents[$key] = $this->fillFileUrls($document, 'image', 'src');
            }
        }

        return $documents;
    }

    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
    {
        return match ($request) {
            'urls' => $this->answerUrlsRequest($payload),
            'store' => $this->allowsUploads ? $this->answerStoreRequest($payload, $field) : ['error' => __('rich-editor-plus::errors.image.uploads_disabled')],
            default => [],
        };
    }

    public function getEditorStyles(): string
    {
        return $this->getStylesheet();
    }

    public function getStylesheet(): string
    {
        $this->assertConfigured();

        $lines = [];

        foreach ($this->widths as $key => $value) {
            $lines[] = '.rep-image[data-width="'.$key.'"]{width:'.$value.'}';
        }

        return implode("\n", [
            ...$lines,
            '.rep-image{margin:1rem auto;max-width:100%}',
            '.rep-image img{display:block;max-width:100%;height:auto}',
            '.rep-image figcaption{font-size:.875em;opacity:.8;margin-top:.375rem;text-align:center}',
            '.rep-image[data-align="left"]{float:left;margin:.25rem 1rem 1rem 0}',
            '.rep-image[data-align="right"]{float:right;margin:.25rem 0 1rem 1rem}',
            '.rep-image[data-align="center"]{margin-left:auto;margin-right:auto}',
            '.rep-image[data-align="wide"]{width:100%;float:none}',
        ]);
    }

    public function normalizeAlignment(mixed $value): string
    {
        return is_string($value) && in_array($value, self::ALIGNMENTS, true) ? $value : $this->defaultAlignment;
    }

    public function normalizeWidth(mixed $value): string
    {
        return (is_string($value) || is_int($value)) && array_key_exists((string) $value, $this->widths) ? (string) $value : $this->defaultWidth;
    }

    /**
     * @param  array<string, mixed>  $attrs
     * @param  array<string, mixed>  $attributes
     * @return array<mixed>
     */
    protected function renderFigure(array $attrs, array $attributes): array
    {
        $disk = $attrs['disk'] ?? null;
        $path = $attrs['path'] ?? null;
        $url = static::isAllowedImageUrl($attrs['url'] ?? null) ? trim($attrs['url']) : null;
        $isUpload = is_string($disk) && is_string($path);

        $figure = [
            'class' => 'rep-image',
            'data-type' => 'image',
            'data-disk' => $isUpload ? $disk : null,
            'data-path' => $isUpload ? $path : null,
            'data-url' => $isUpload ? null : $url,
            'data-align' => $this->normalizeAlignment($attrs['align'] ?? null),
            'data-width' => $this->normalizeWidth($attrs['width'] ?? null),
        ];

        $source = $isUpload ? ($attributes['src'] ?? null) : $url;

        $image = array_filter(['src' => $source], static fn (mixed $value): bool => $value !== null);
        $image['alt'] = is_string($attrs['alt'] ?? null) ? $attrs['alt'] : '';

        $caption = is_string($attrs['caption'] ?? null) ? trim($attrs['caption']) : '';

        return [
            'figure',
            array_filter($figure, static fn (mixed $value): bool => $value !== null),
            ['img', $image],
            ...($caption !== '' ? [['figcaption', $caption]] : []),
        ];
    }

    /**
     * An image URL is kept when it is http(s) or relative (`/img/a.png`, `img/a.png`, `//cdn.example.com/a.png`). Any
     * other scheme (`javascript:`, `data:`, `file:`) is refused, however it is disguised with case, whitespace or
     * control characters.
     */
    public static function isAllowedImageUrl(mixed $url): bool
    {
        return is_string($url) && trim($url) !== '' && ContentSpec::isAllowedUrl($url, ['http', 'https']);
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function assertConfigured(): void
    {
        if (! $this->allowsUploads && ! $this->allowsUrls) {
            throw new InvalidArgumentException('ImagePlugin needs uploads or URLs: call ->allowUrls() when uploads are off.');
        }

        if ($this->widths === []) {
            throw new InvalidArgumentException('ImagePlugin needs at least one width.');
        }

        foreach ($this->widths as $key => $value) {
            if (preg_match('/^[a-z0-9][a-z0-9-]*\z/', (string) $key) !== 1) {
                throw new InvalidArgumentException("ImagePlugin has the width key [{$key}], which is not lowercase letters, digits and dashes.");
            }

            $this->assertSafeCssValue((string) $key, $value);

            if (preg_match('/^(?:\d+(?:\.\d+)?(?:%|px|rem|em)|auto|var\(--[A-Za-z0-9_-]+\))\z/', $value) !== 1) {
                throw new InvalidArgumentException("ImagePlugin has the width [{$key}] set to [{$value}], which is not a length, auto or a CSS variable.");
            }
        }

        if (! array_key_exists($this->defaultWidth, $this->widths)) {
            throw new InvalidArgumentException("ImagePlugin has the default width [{$this->defaultWidth}], which is not one of its widths.");
        }

        if (! in_array($this->defaultAlignment, self::ALIGNMENTS, true)) {
            throw new InvalidArgumentException("ImagePlugin has the default alignment [{$this->defaultAlignment}], which is not one of: ".implode(', ', self::ALIGNMENTS).'.');
        }

        if ($this->getAcceptedFileTypes() === [] || array_filter($this->getAcceptedFileTypes(), static fn (mixed $type): bool => ! is_string($type) || ! str_starts_with($type, 'image/')) !== []) {
            throw new InvalidArgumentException('ImagePlugin accepts only image/* file types, and at least one.');
        }

        $this->assertStorageConfigured();

        if ($this->servesSvgFromOwnDomain()) {
            throw new InvalidArgumentException(
                "ImagePlugin accepts [image/svg+xml] on the local, public disk [{$this->getDisk()}], so an uploaded SVG's script would run on your own domain. "
                .'Use a private visibility, a disk on another domain (such as S3), or ->urlUsing() to serve them from a domain without your cookies.',
            );
        }
    }

    /**
     * Whether uploaded SVGs, which can carry script, would be served as plain public files from the app's own domain.
     */
    protected function servesSvgFromOwnDomain(): bool
    {
        return in_array('image/svg+xml', array_map('strtolower', $this->getAcceptedFileTypes()), true)
            && $this->allowsUploads
            && $this->getVisibility() === 'public'
            && $this->urlCallback === null
            && config("filesystems.disks.{$this->getDisk()}.driver") === 'local';
    }

    /**
     * Widths are printed raw into a `<style>` element: not empty, and no control characters, semicolons, braces,
     * angle brackets, backslashes or comment markers.
     *
     * @throws InvalidArgumentException
     */
    protected function assertSafeCssValue(string $name, string $value): void
    {
        if (trim($value) === '' || preg_match('/[;{}<>\\\\\x00-\x1F\x7F]/', $value) === 1 || str_contains($value, '/*') || str_contains($value, '*/')) {
            throw new InvalidArgumentException("ImagePlugin has an empty value, or one with characters that could break its CSS, for the width [{$name}].");
        }
    }
}

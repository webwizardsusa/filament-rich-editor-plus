<?php

namespace Hollyit\RichEditorPlus\Plugins\Image\Concerns;

use Closure;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use League\MimeTypeDetection\FinfoMimeTypeDetector;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Symfony\Component\Mime\MimeTypes;
use Throwable;

/**
 * Files on a Laravel disk that editor content points to by disk and path: where uploads go, which stored paths are
 * safe to render, how a path becomes a URL, and the `urls` and `store` editor requests.
 */
trait StoresEditorFiles
{
    /**
     * The server answers at most this many paths per `urls` request.
     */
    protected const int MAX_URL_REQUESTS = 100;

    /**
     * Types a `type/*` wildcard never matches, because they can run script when opened from the site's own domain.
     * A plugin takes one only when it is accepted by name (`image/svg+xml`), and a plugin that refuses it outright
     * never does.
     *
     * @var array<string>
     */
    public const array WILDCARD_EXCLUDED_TYPES = [
        'image/svg+xml',
        'text/html',
        'text/xml',
        'text/javascript',
    ];

    protected ?string $disk = null;

    protected ?string $directory = null;

    protected string $visibility = 'public';

    protected ?int $maxSize = null;

    /**
     * @var array<string> | null
     */
    protected ?array $acceptedFileTypes = null;

    protected int $temporaryUrlMinutes = 30;

    protected ?Closure $urlCallback = null;

    abstract protected function defaultDirectory(): string;

    abstract protected function defaultMaxSize(): int;

    /**
     * @return array<string>
     */
    abstract protected function defaultAcceptedFileTypes(): array;

    /**
     * The disk uploads go to. Defaults to the application's default disk.
     */
    public function disk(?string $disk): static
    {
        $this->disk = $disk;

        return $this;
    }

    /**
     * The directory on the disk uploads go to, and the only one the plugin signs or renders paths from. Empty allows
     * the whole disk.
     */
    public function directory(string $directory): static
    {
        $this->directory = $directory;

        return $this;
    }

    /**
     * `public` renders plain disk URLs, anything else renders temporary URLs.
     */
    public function visibility(string $visibility): static
    {
        $this->visibility = $visibility;

        return $this;
    }

    /**
     * The largest upload, in kilobytes.
     */
    public function maxSize(int $kilobytes): static
    {
        $this->maxSize = $kilobytes;

        return $this;
    }

    /**
     * @param  array<string>  $types
     */
    public function acceptedFileTypes(array $types): static
    {
        $this->acceptedFileTypes = array_values($types);

        return $this;
    }

    public function temporaryUrlMinutes(int $minutes): static
    {
        $this->temporaryUrlMinutes = $minutes;

        return $this;
    }

    /**
     * Replaces how a stored path becomes a URL. The callback gets the disk and the path, which are already checked.
     *
     * @param  Closure(string, string): string  $callback
     */
    public function urlUsing(Closure $callback): static
    {
        $this->urlCallback = $callback;

        return $this;
    }

    public function getDisk(): string
    {
        return $this->disk ?? (string) config('filesystems.default');
    }

    public function getDirectory(): string
    {
        return $this->directory ?? $this->defaultDirectory();
    }

    public function getVisibility(): string
    {
        return $this->visibility;
    }

    public function getMaxSize(): int
    {
        return $this->maxSize ?? $this->defaultMaxSize();
    }

    /**
     * @return array<string>
     */
    public function getAcceptedFileTypes(): array
    {
        return $this->acceptedFileTypes ?? $this->defaultAcceptedFileTypes();
    }

    /**
     * Only the plugin's disk, and a relative path of plain segments inside the plugin's directory, is ever signed or
     * rendered. Stored documents and editor requests come from the browser.
     */
    public function isSafePath(string $disk, string $path): bool
    {
        if ($disk !== $this->getDisk() || $path === '') {
            return false;
        }

        if (! static::isRelativePath($path)) {
            return false;
        }

        $directory = trim($this->getDirectory(), '/');

        return $directory === '' || str_starts_with($path, $directory.'/');
    }

    public function resolveUrl(string $disk, string $path): ?string
    {
        if (! $this->isSafePath($disk, $path)) {
            return null;
        }

        $url = rescue(function () use ($disk, $path): mixed {
            if ($this->urlCallback !== null) {
                return ($this->urlCallback)($disk, $path);
            }

            return $this->visibility === 'public'
                ? Storage::disk($disk)->url($path)
                : Storage::disk($disk)->temporaryUrl($path, now()->addMinutes($this->temporaryUrlMinutes));
        }, null, false);

        return is_string($url) && $url !== '' ? $url : null;
    }

    /**
     * A file name as it may be shown and offered for download: no control characters, slashes or backslashes, trimmed,
     * at most 255 characters.
     */
    public static function sanitizeFileName(string $name): string
    {
        return mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F\/\\\\]/u', '', $name)), 0, 255);
    }

    /**
     * Bytes as `B`, `KB`, `MB` or `GB` (1024-based): one decimal place below 10, whole numbers from 10, no trailing
     * `.0`. The editor's JS formats sizes the same way.
     */
    public static function formatFileSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return "{$bytes} B";
        }

        $units = ['KB', 'MB', 'GB'];
        $value = $bytes / 1024;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            $unit++;
        }

        $rounded = round($value, 1);
        $text = $rounded >= 10
            ? (string) (int) round($value)
            : rtrim(rtrim(number_format($rounded, 1, '.', ''), '0'), '.');

        return "{$text} {$units[$unit]}";
    }

    /**
     * @param  array<array-key, mixed>  $payload
     * @return array{urls: array<string, string>}
     */
    protected function answerUrlsRequest(array $payload): array
    {
        $paths = is_array($payload['paths'] ?? null) ? $payload['paths'] : [];
        $paths = array_slice(array_values(array_unique(array_filter($paths, is_string(...)))), 0, self::MAX_URL_REQUESTS);

        $urls = [];

        foreach ($paths as $path) {
            $url = $this->resolveUrl($this->getDisk(), $path);

            if ($url !== null) {
                $urls[$path] = $url;
            }
        }

        return ['urls' => $urls];
    }

    /**
     * Stores the file the editor uploaded under `$payload['key']`, after checking its real type (from its contents)
     * and size. The browser only sends the key; the plugin chooses the disk, directory, name and visibility.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array{disk: string, path: string, name: string, size: int, mime: string}|array{error: string}
     */
    protected function answerStoreRequest(array $payload, RichEditorPlus $field): array
    {
        $key = $payload['key'] ?? null;
        $file = is_string($key) ? $field->pullTemporaryUpload($key) : null;

        if ($file === null) {
            return ['error' => __('rich-editor-plus::errors.image.upload_missing')];
        }

        try {
            $mime = $this->detectMimeType($file);

            if (! $this->acceptsFileType($mime)) {
                return ['error' => __('rich-editor-plus::errors.image.type_not_accepted')];
            }

            $size = $file->getSize();

            if ($size > $this->getMaxSize() * 1024) {
                return ['error' => __('rich-editor-plus::errors.image.too_large', ['size' => static::formatFileSize($this->getMaxSize() * 1024)])];
            }

            $path = ltrim(trim($this->getDirectory(), '/').'/'.$this->storedFileName($file, $mime), '/');
            $stream = $file->readStream();

            try {
                $written = is_resource($stream) && Storage::disk($this->getDisk())->put($path, $stream, ['visibility' => $this->getVisibility()]);
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            if ($written !== true) {
                return ['error' => __('rich-editor-plus::errors.image.store_failed')];
            }

            $name = static::sanitizeFileName($file->getClientOriginalName());

            return $this->storedFileAnswer([
                'disk' => $this->getDisk(),
                'path' => $path,
                'name' => $name !== '' ? $name : basename($path),
                'size' => $size,
                'mime' => $mime,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return ['error' => __('rich-editor-plus::errors.image.store_failed')];
        } finally {
            rescue(static fn (): mixed => $file->delete(), report: false);
        }
    }

    /**
     * Whether the plugin takes a file of this type: one of the accepted types or a match for an accepted `type/*`
     * wildcard, as Filament's upload field allows, and not a type the plugin refuses. A refused type is never accepted,
     * whatever the wildcards say, and a wildcard never matches {@see WILDCARD_EXCLUDED_TYPES}.
     */
    public function acceptsFileType(string $mime): bool
    {
        $mime = strtolower($mime);

        if ($this->refusesFileType($mime)) {
            return false;
        }

        foreach ($this->getAcceptedFileTypes() as $type) {
            $type = strtolower($type);

            if ($type === $mime) {
                return true;
            }

            if (str_ends_with($type, '/*') && str_starts_with($mime, substr($type, 0, -1)) && ! in_array($mime, self::WILDCARD_EXCLUDED_TYPES, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The name a file is stored under: random, with the extension of the type detected from its contents (`bin` when
     * that type has none). The browser's name and extension are never used, so a file can't be served as another type.
     * Pass `$mime` when the type is already detected.
     */
    public function storedFileName(TemporaryUploadedFile $file, ?string $mime = null): string
    {
        $extension = MimeTypes::getDefault()->getExtensions($mime ?? $this->detectMimeType($file))[0] ?? 'bin';

        return Str::random(40).'.'.$extension;
    }

    /**
     * A validation rule for a modal's file upload that refuses a file whose type, detected from its contents as the
     * `store` request does, the plugin does not take. It sits beside Filament's own `mimetypes` rule, so the modal and
     * pasted or dropped files accept exactly the same files.
     *
     * @return Closure(string, mixed, Closure): void
     */
    public function uploadedFileTypeRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if ($value instanceof TemporaryUploadedFile && ! $this->acceptsFileType($this->detectMimeType($value))) {
                $fail(__('rich-editor-plus::errors.image.type_not_accepted'));
            }
        };
    }

    /**
     * The type from the file's first 64 KB, wherever Livewire keeps its temporary uploads. Livewire's own
     * `getMimeType()` returns the browser's reported type while tests run, so it is not used. A file that can't be read
     * is `application/octet-stream`.
     */
    protected function detectMimeType(TemporaryUploadedFile $file): string
    {
        $stream = rescue(static fn (): mixed => $file->readStream(), null, false);

        if (! is_resource($stream)) {
            return 'application/octet-stream';
        }

        try {
            $contents = stream_get_contents($stream, 64 * 1024);
        } finally {
            fclose($stream);
        }

        if (! is_string($contents) || $contents === '') {
            return 'application/octet-stream';
        }

        return (new FinfoMimeTypeDetector)->detectMimeTypeFromBuffer($contents) ?: 'application/octet-stream';
    }

    /**
     * Types refused even when configured. None by default.
     */
    protected function refusesFileType(string $mime): bool
    {
        return false;
    }

    /**
     * The `store` answer, which a plugin can add to.
     *
     * @param  array{disk: string, path: string, name: string, size: int, mime: string}  $answer
     * @return array<string, mixed>
     */
    protected function storedFileAnswer(array $answer): array
    {
        return $answer;
    }

    /**
     * What the editor's paste and drop handler needs to route a file here.
     *
     * @return array{accept: array<string>, maxSize: int}
     */
    protected function uploadOptions(): array
    {
        return ['accept' => $this->getAcceptedFileTypes(), 'maxSize' => $this->getMaxSize()];
    }

    /**
     * @return array<string, string>
     */
    protected function uploadLabels(): array
    {
        return [
            'uploading' => __('rich-editor-plus::uploads.image.uploading'),
            'upload_failed' => __('rich-editor-plus::uploads.image.upload_failed'),
            'too_many_files' => __('rich-editor-plus::uploads.image.too_many_files'),
            'not_accepted' => __('rich-editor-plus::uploads.image.not_accepted'),
            'too_large' => __('rich-editor-plus::uploads.image.too_large'),
            'place_lost' => __('rich-editor-plus::uploads.image.place_lost'),
        ];
    }

    /**
     * Sets `$attribute` (a transient URL) on every node of `$type` from its disk and path, and drops any value the
     * stored document carried for it.
     *
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    protected function fillFileUrls(array $node, string $type, string $attribute): array
    {
        if (($node['type'] ?? null) === $type) {
            $attrs = is_array($node['attrs'] ?? null) ? $node['attrs'] : [];
            unset($attrs[$attribute]);

            if (is_string($attrs['disk'] ?? null) && is_string($attrs['path'] ?? null)) {
                $url = $this->resolveUrl($attrs['disk'], $attrs['path']);

                if ($url !== null) {
                    $attrs[$attribute] = $url;
                }
            }

            $node['attrs'] = $attrs;
        }

        if (is_array($node['content'] ?? null)) {
            foreach ($node['content'] as $index => $child) {
                if (is_array($child)) {
                    $node['content'][$index] = $this->fillFileUrls($child, $type, $attribute);
                }
            }
        }

        return $node;
    }

    protected static function isRelativePath(string $path): bool
    {
        if (preg_match('/[\x00-\x1F\x7F]/', $path) === 1 || str_starts_with($path, '/') || str_contains($path, '\\') || str_contains($path, '%')) {
            return false;
        }

        foreach (explode('/', $path) as $segment) {
            if (in_array($segment, ['', '.', '..'], true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function assertStorageConfigured(): void
    {
        $plugin = class_basename(static::class);

        if (! is_array(config("filesystems.disks.{$this->getDisk()}"))) {
            throw new InvalidArgumentException("{$plugin} uses the disk [{$this->getDisk()}], which is not configured.");
        }

        if ($this->getDirectory() !== '' && ! static::isRelativePath(trim($this->getDirectory(), '/'))) {
            throw new InvalidArgumentException("{$plugin} has the directory [{$this->getDirectory()}], which is not a safe relative path.");
        }

        if ($this->getAcceptedFileTypes() === [] || array_filter($this->getAcceptedFileTypes(), static fn (mixed $type): bool => ! is_string($type) || $type === '') !== []) {
            throw new InvalidArgumentException("{$plugin} needs at least one accepted file type, each a MIME type.");
        }

        if ($this->getMaxSize() < 1 || $this->temporaryUrlMinutes < 1) {
            throw new InvalidArgumentException("{$plugin} needs a positive maximum size and temporary URL lifetime.");
        }
    }
}

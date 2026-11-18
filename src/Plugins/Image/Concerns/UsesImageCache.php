<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Image\Concerns;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use LogicException;
use Throwable;
use Webwizardsusa\ImageCache\Exceptions\InvalidImageException;
use Webwizardsusa\ImageCache\ImageCache;
use Webwizardsusa\ImageCache\Models\Image;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImageCache\ImageCacheImages;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

/**
 * Opt-in Laravel Image Cache storage for the image plugin. With `imageCache()`, uploads become Images, and each image
 * in content is a Placement: the Image's ULID and the Image Style it's shown in (`data-image`, `data-style`), never a
 * file or a URL. Images stored before by disk and path, and images linked by URL, keep working.
 */
trait UsesImageCache
{
    protected bool $usesImageCache = false;

    /**
     * @var array<string> | null
     */
    protected ?array $imageStyles = null;

    protected ?string $defaultImageStyle = null;

    protected bool $privateImages = false;

    protected ?Closure $imageQueryCallback = null;

    /**
     * @var array<string> | string | null
     */
    protected array|string|null $imageSrcset = null;

    protected ?string $imageSizes = null;

    /**
     * Stores images as Laravel Image Cache Images, shown in an Image Style editors pick for each. `$styles` are the
     * names offered (every registered style when null); `$default` is the style new images are placed in (the first
     * of them when null). Needs `webwizardsusa/laravel-image-cache`.
     *
     * @param  array<string> | null  $styles
     *
     * @throws LogicException when Laravel Image Cache is not installed
     */
    public function imageCache(?array $styles = null, ?string $default = null, bool $condition = true): static
    {
        if ($condition && ! class_exists(ImageCache::class)) {
            throw new LogicException('ImagePlugin::imageCache() needs Laravel Image Cache: composer require webwizardsusa/laravel-image-cache');
        }

        $this->usesImageCache = $condition;
        $this->imageStyles = $styles === null ? null : array_values($styles);
        $this->defaultImageStyle = $default;

        return $this;
    }

    /**
     * With `imageCache()`, stores uploads as private Images, shown through temporary URLs. Rendered HTML with private
     * Images stops showing them once its URLs expire, so don't cache it for longer than `image-cache.private.url_ttl`.
     */
    public function privateImages(bool $condition = true): static
    {
        $this->privateImages = $condition;

        return $this;
    }

    /**
     * With `imageCache()`, narrows the Images a Placement may show, on top of the plugin's directory and the Images'
     * Visibility, for example to a tenant's: `fn (Builder $query) => $query->where('team_id', $teamId)`.
     *
     * @param  (Closure(Builder<Image>): mixed) | null  $callback
     */
    public function imageQueryUsing(?Closure $callback): static
    {
        $this->imageQueryCallback = $callback;

        return $this;
    }

    /**
     * With `imageCache()`, gives every Placement a srcset of these styles, or of a set named in
     * `image-cache.srcsets`, as Laravel Image Cache's `srcset()` builds it. The Placement's own style stays its `src`
     * and joins the srcset, and wider candidates are left out, so a Placement in a small style is never served a large
     * file. `$sizes` defaults to `auto, 100vw`, with lazy loading. Needs Laravel Image Cache 0.3 or later.
     *
     * @param  array<string> | string | null  $set
     *
     * @throws LogicException when Laravel Image Cache is older than 0.3
     */
    public function imageSrcset(array|string|null $set, ?string $sizes = null): static
    {
        if ($set !== null && ! method_exists(ImageCache::class, 'srcsetCandidates')) {
            throw new LogicException('ImagePlugin::imageSrcset() needs Laravel Image Cache 0.3 or later: composer require webwizardsusa/laravel-image-cache:^0.3');
        }

        $this->imageSrcset = $set;
        $this->imageSizes = $sizes;

        return $this;
    }

    public function usesImageCache(): bool
    {
        return $this->usesImageCache;
    }

    /**
     * The field's Image Cache settings, with its directory as it is now. Only call it after `usesImageCache()`.
     */
    public function imageCacheImages(): ImageCacheImages
    {
        return new ImageCacheImages($this->imageStyles, $this->defaultImageStyle, $this->privateImages, $this->imageQueryCallback, $this->getDirectory(), $this->imageSrcset, $this->imageSizes);
    }

    /**
     * Answers the editor's URL lookups. Keys of the form `{ulid}:{style}` are Placements, answered with their URL and,
     * when it's known, their size; any other key is a path, answered as before.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array{urls: array<string, string>, dimensions: array<string, array{width: int, height: int}>}
     */
    protected function answerImageCacheUrlsRequest(array $payload): array
    {
        $images = $this->imageCacheImages();
        $keys = is_array($payload['paths'] ?? null) ? $payload['paths'] : [];
        $keys = array_slice(array_values(array_unique(array_filter($keys, is_string(...)))), 0, self::MAX_URL_REQUESTS);

        $placements = [];
        $paths = [];

        foreach ($keys as $key) {
            $placement = $images->parseUrlKey($key);

            if ($placement !== null) {
                $placements[$key] = $placement;
            } else {
                $paths[] = $key;
            }
        }

        $urls = $paths === [] ? [] : $this->answerUrlsRequest(['paths' => $paths])['urls'];
        $dimensions = [];
        $found = $images->find(array_column($placements, 0));

        foreach ($placements as $key => [$ulid, $style]) {
            $url = isset($found[$ulid]) ? $images->url($found[$ulid], $style) : null;

            if ($url === null) {
                continue;
            }

            $urls[$key] = $url;
            $size = $images->dimensions($found[$ulid], $style);

            if ($size !== null) {
                $dimensions[$key] = $size;
            }
        }

        return ['urls' => $urls, 'dimensions' => $dimensions];
    }

    /**
     * Stores the file the editor uploaded under `$payload['key']` as an Image, after checking its real type and size.
     * The answer's `attrs` make the inserted image a Placement in the default style, and its `path` is the key the
     * editor caches the Placement's URL under.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function answerImageCacheStoreRequest(array $payload, RichEditorPlus $field): array
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

            if ($file->getSize() > $this->getMaxSize() * 1024) {
                return ['error' => __('rich-editor-plus::errors.image.too_large', ['size' => static::formatFileSize($this->getMaxSize() * 1024)])];
            }

            $images = $this->imageCacheImages();
            $image = $images->store($file);
            $style = $images->defaultStyle();
            $name = static::sanitizeFileName($file->getClientOriginalName());

            return [
                'disk' => $image->disk,
                'path' => $images->urlKey($image->ulid, $style),
                'name' => $name !== '' ? $name : basename($image->path),
                'size' => $image->size,
                'mime' => $image->mime_type,
                'url' => $images->url($image, $style),
                'dimensions' => $images->dimensions($image, $style),
                'attrs' => ['image' => $image->ulid, 'style' => $style, 'disk' => null, 'path' => null, 'url' => null],
            ];
        } catch (InvalidImageException) {
            return ['error' => __('rich-editor-plus::errors.image.type_not_accepted')];
        } catch (Throwable $exception) {
            report($exception);

            return ['error' => __('rich-editor-plus::errors.image.store_failed')];
        } finally {
            rescue(static fn (): mixed => $file->delete(), report: false);
        }
    }
}

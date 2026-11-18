<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Image\ImageCache;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use InvalidArgumentException;
use Webwizardsusa\ImageCache\Enums\Visibility;
use Webwizardsusa\ImageCache\Facades\ImageCache;
use Webwizardsusa\ImageCache\Models\Image;

/**
 * The Laravel Image Cache side of an image field that stores Placements (see `ImagePlugin::imageCache()`): which Image
 * Styles it offers, which Images it may show, their URLs, and storing new ones. Only made once a field opts in, so
 * Image Cache classes are never loaded otherwise.
 */
class ImageCacheImages
{
    /**
     * Separates an Image's ULID from its style in the keys of the editor's `urls` requests.
     */
    public const string URL_KEY_SEPARATOR = ':';

    /**
     * @param  array<string> | null  $styles  null for every registered style
     * @param  (Closure(Builder<Image>): mixed) | null  $queryCallback
     * @param  array<string> | string | null  $srcset  styles, or the name of a set in `image-cache.srcsets`
     */
    public function __construct(
        protected ?array $styles,
        protected ?string $defaultStyle,
        protected bool $private,
        protected ?Closure $queryCallback,
        protected string $directory,
        protected array|string|null $srcset = null,
        protected ?string $sizes = null,
    ) {}

    /**
     * A ULID in its stored (lowercase) form, or null for anything else.
     */
    public static function normalizeUlid(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = strtolower(trim($value));

        return preg_match('/^[0-7][0-9a-hjkmnp-tv-z]{25}\z/', $value) === 1 ? $value : null;
    }

    /**
     * @return array<string>
     */
    public function styles(): array
    {
        return $this->styles ?? array_map(strval(...), array_keys(ImageCache::styles()));
    }

    public function defaultStyle(): string
    {
        return $this->defaultStyle ?? ($this->styles()[0] ?? '');
    }

    public function visibility(): Visibility
    {
        return $this->private ? Visibility::Private : Visibility::Public;
    }

    public function normalizeStyle(mixed $value): string
    {
        return is_string($value) && in_array($value, $this->styles(), true) ? $value : $this->defaultStyle();
    }

    /**
     * The Images with these ULIDs that the field may show, keyed by ULID, with their Variants loaded: those in the
     * field's directory, with its Visibility, and allowed by the field's query callback.
     *
     * @param  array<mixed>  $ulids
     * @return Collection<string, Image>
     */
    public function find(array $ulids): Collection
    {
        $ulids = array_values(array_unique(array_filter(array_map(static::normalizeUlid(...), $ulids))));

        if ($ulids === []) {
            return new Collection;
        }

        $query = ImageCache::newImageQuery()
            ->whereIn('ulid', $ulids)
            ->where('visibility', $this->visibility()->value)
            ->with('variants');

        if ($this->queryCallback !== null) {
            ($this->queryCallback)($query);
        }

        $directory = trim($this->directory, '/');

        return $query->get()
            ->filter(static fn (Image $image): bool => $directory === '' || str_starts_with($image->path, $directory.'/'))
            ->keyBy('ulid');
    }

    /**
     * The URL an Image is shown at in this style, or null when it can't be made (a report says why).
     */
    public function url(Image $image, mixed $style): ?string
    {
        $url = rescue(fn (): string => $image->url($this->normalizeStyle($style)));

        return is_string($url) && $url !== '' ? $url : null;
    }

    public function hasSrcset(): bool
    {
        return $this->srcset !== null && $this->srcset !== [];
    }

    /**
     * The `sizes` of a Placement with a srcset: the field's, or `auto, 100vw` for its lazy image.
     */
    public function sizes(): string
    {
        return $this->sizes ?? 'auto, 100vw';
    }

    /**
     * A Placement's srcset: the field's set and the Placement's own style, without candidates wider than that style,
     * or null when the field has none or it would hold a single candidate.
     */
    public function srcset(Image $image, mixed $style): ?string
    {
        if (! $this->hasSrcset()) {
            return null;
        }

        $style = $this->normalizeStyle($style);
        $styles = array_values(array_unique([...ImageCache::srcsetStyles($this->srcset), $style]));
        $maxWidth = ImageCache::dimensions($image, $style)['width'] ?? null;

        $srcset = rescue(static fn (): array => ImageCache::srcsetCandidates($image, $styles, $maxWidth), []);

        if (count($srcset) < 2) {
            return null;
        }

        return implode(', ', array_map(static fn (array $candidate): string => "{$candidate['url']} {$candidate['width']}w", $srcset));
    }

    /**
     * Stores an uploaded file as an Image in the field's directory, with its Visibility.
     */
    public function store(UploadedFile $file): Image
    {
        $path = $file->getRealPath();

        if (is_string($path) && $path !== '') {
            return ImageCache::store($file, $this->visibility(), $this->directory);
        }

        // A temporary upload on a cloud disk has no local path: copy it to one first.
        $local = (string) tempnam(sys_get_temp_dir(), 'rep-image-');

        try {
            file_put_contents($local, $file->get());

            return ImageCache::store($local, $this->visibility(), $this->directory);
        } finally {
            @unlink($local);
        }
    }

    public function urlKey(string $ulid, string $style): string
    {
        return $ulid.self::URL_KEY_SEPARATOR.$style;
    }

    /**
     * The ULID and style a `urls` request key names, or null when it's a path.
     *
     * @return array{0: string, 1: string} | null
     */
    public function parseUrlKey(string $key): ?array
    {
        $parts = explode(self::URL_KEY_SEPARATOR, $key);
        $ulid = count($parts) === 2 ? static::normalizeUlid($parts[0]) : null;

        return $ulid !== null ? [$ulid, $parts[1]] : null;
    }

    /**
     * Sets the transient `src`, and `srcset` with `imageSrcset()`, of every Placement in the documents whose Image the field may show, loading every
     * Image in one query. The documents' own `src` values have already been dropped.
     *
     * @param  array<array-key, mixed>  $documents
     * @return array<array-key, mixed>
     */
    public function fillUrls(array $documents): array
    {
        $ulids = [];

        foreach ($documents as $document) {
            if (is_array($document)) {
                $this->collectUlids($document, $ulids);
            }
        }

        $images = $this->find($ulids);

        foreach ($documents as $key => $document) {
            if (is_array($document)) {
                $documents[$key] = $this->fillNodeUrls($document, $images);
            }
        }

        return $documents;
    }

    /**
     * What the editor's image node needs to know.
     *
     * @return array{styles: array<string>, defaultStyle: string}
     */
    public function jsOptions(): array
    {
        return ['styles' => $this->styles(), 'defaultStyle' => $this->defaultStyle()];
    }

    /**
     * @throws InvalidArgumentException
     */
    public function assertConfigured(): void
    {
        if ($this->styles() === []) {
            throw new InvalidArgumentException('ImagePlugin needs at least one Image Style for imageCache(): register one with Laravel Image Cache, or pass the styles.');
        }

        foreach ($this->styles() as $style) {
            if (! ImageCache::has($style)) {
                throw new InvalidArgumentException("ImagePlugin offers the Image Style [{$style}], which is not registered with Laravel Image Cache.");
            }
        }

        if (! in_array($this->defaultStyle(), $this->styles(), true)) {
            throw new InvalidArgumentException("ImagePlugin has the default Image Style [{$this->defaultStyle()}], which is not one of its styles.");
        }
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  array<string>  $ulids
     */
    protected function collectUlids(array $node, array &$ulids): void
    {
        if (($node['type'] ?? null) === 'image') {
            $ulid = static::normalizeUlid($node['attrs']['image'] ?? null);

            if ($ulid !== null) {
                $ulids[] = $ulid;
            }
        }

        foreach (is_array($node['content'] ?? null) ? $node['content'] : [] as $child) {
            if (is_array($child)) {
                $this->collectUlids($child, $ulids);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  Collection<string, Image>  $images
     * @return array<string, mixed>
     */
    protected function fillNodeUrls(array $node, Collection $images): array
    {
        if (($node['type'] ?? null) === 'image') {
            $attrs = is_array($node['attrs'] ?? null) ? $node['attrs'] : [];
            $ulid = static::normalizeUlid($attrs['image'] ?? null);

            if ($ulid !== null) {
                unset($attrs['src'], $attrs['srcset']);
                $url = isset($images[$ulid]) ? $this->url($images[$ulid], $attrs['style'] ?? null) : null;

                if ($url !== null) {
                    $attrs['src'] = $url;
                    $srcset = $this->srcset($images[$ulid], $attrs['style'] ?? null);

                    if ($srcset !== null) {
                        $attrs['srcset'] = $srcset;
                    }
                }

                $node['attrs'] = $attrs;
            }
        }

        if (is_array($node['content'] ?? null)) {
            foreach ($node['content'] as $index => $child) {
                if (is_array($child)) {
                    $node['content'][$index] = $this->fillNodeUrls($child, $images);
                }
            }
        }

        return $node;
    }
}

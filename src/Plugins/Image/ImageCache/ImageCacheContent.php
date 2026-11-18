<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Image\ImageCache;

/**
 * Reads the Images that stored rich content places, for models that track their Usages with Laravel Image Cache:
 *
 * ```php
 * public function referencedImages(): iterable
 * {
 *     return ImageCacheContent::imagesIn($this->body);
 * }
 * ```
 */
class ImageCacheContent
{
    /**
     * The ULIDs of the Images placed in stored HTML, each once, in the order they first appear.
     *
     * @return array<int, string>
     */
    public static function imagesIn(?string $html): array
    {
        if ($html === null || ! str_contains($html, 'data-image')) {
            return [];
        }

        preg_match_all('/<figure\b[^>]*\bdata-image\s*=\s*(["\']?)([0-9A-Za-z]{26})\1/i', $html, $matches);

        return array_values(array_unique(array_filter(array_map(ImageCacheImages::normalizeUlid(...), $matches[2]))));
    }
}

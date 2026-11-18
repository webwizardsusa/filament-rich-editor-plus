<?php

namespace Webwizardsusa\RichEditorPlus\Tests\Support\ImageStyles;

use Intervention\Image\Interfaces\ImageInterface;
use Webwizardsusa\ImageCache\ImageStyle;

class BannerStyle extends ImageStyle
{
    public static function name(): string
    {
        return 'banner';
    }

    public function width(): ?int
    {
        return 400;
    }

    public function apply(ImageInterface $image): ImageInterface
    {
        return $image->scale(width: 400);
    }
}

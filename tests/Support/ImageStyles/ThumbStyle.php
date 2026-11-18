<?php

namespace Webwizardsusa\RichEditorPlus\Tests\Support\ImageStyles;

use Intervention\Image\Interfaces\ImageInterface;
use Webwizardsusa\ImageCache\ImageStyle;

class ThumbStyle extends ImageStyle
{
    public static function name(): string
    {
        return 'thumb';
    }

    public function apply(ImageInterface $image): ImageInterface
    {
        return $image->cover(100, 100);
    }
}

<?php

namespace Hollyit\RichEditorPlus\Plugins\Image;

use Hollyit\RichEditorPlus\Support\BundledPluginAssets;

/**
 * The JS module and stylesheet shared by {@see ImagePlugin} and {@see AttachmentPlugin}, loaded only on fields with
 * either of them.
 */
final class ImageAssets extends BundledPluginAssets
{
    protected static function name(): string
    {
        return 'image';
    }
}

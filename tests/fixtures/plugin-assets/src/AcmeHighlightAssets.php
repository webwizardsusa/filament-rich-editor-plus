<?php

use Hollyit\RichEditorPlus\Support\RegistersPluginAssets;

/**
 * Stands in for a plugin package's service provider, with its built files in `../dist`.
 */
class AcmeHighlightAssets
{
    use RegistersPluginAssets;

    public static function assetPackage(): string
    {
        return 'acme/highlight';
    }

    public static function assetId(): string
    {
        return 'acme-highlight';
    }

    public function register(): void
    {
        $this->registerPluginAssets();
    }
}

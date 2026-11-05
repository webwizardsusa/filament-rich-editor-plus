<?php

namespace Hollyit\RichEditorPlus\Plugins\Markdown;

use Hollyit\RichEditorPlus\Support\BundledPluginAssets;

/**
 * The Markdown plugin's JS module and stylesheet (paste and the source view), loaded only on fields with
 * {@see MarkdownPlugin}.
 */
final class MarkdownAssets extends BundledPluginAssets
{
    protected static function name(): string
    {
        return 'markdown';
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Table;

use Webwizardsusa\RichEditorPlus\Support\BundledPluginAssets;

/**
 * The table plugin's JS module and stylesheet, loaded only on fields with {@see TablePlugin}.
 */
final class TableAssets extends BundledPluginAssets
{
    protected static function name(): string
    {
        return 'table';
    }
}

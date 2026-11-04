<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

use Hollyit\RichEditorPlus\Content\Contracts\ContentFormat;

/**
 * A plugin that chooses the field's stored format, as `storeAs()` would. Only plugins added to the field explicitly
 * (`plugins()`, `addPlugins()`) are asked, never the defaults.
 */
interface ProvidesContentFormat
{
    public function getContentFormat(): ?ContentFormat;
}

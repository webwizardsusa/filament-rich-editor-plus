<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Contracts;

/**
 * A plugin that only works alongside certain other plugins. The field calls {@see checkFieldPlugins()} with its final
 * plugin list each time it builds its registry; throw to refuse the set.
 */
interface ChecksFieldPlugins
{
    /**
     * @param  array<EditorPlugin>  $plugins
     */
    public function checkFieldPlugins(array $plugins): void;
}

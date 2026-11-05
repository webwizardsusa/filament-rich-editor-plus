<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Concerns;

use Webwizardsusa\RichEditorPlus\Support\Tool;

/**
 * Decrease and increase level buttons for a node that can nest. Each plugin gets its own pair, shown only on its own
 * node, so a field never shows them for a plugin it doesn't have. The commands act on the innermost list or quote at
 * the cursor. In a list item the buttons hide, because the list button's menu has the same two actions.
 */
trait HasLevelTools
{
    /**
     * @return array<Tool>
     */
    protected function getLevelTools(string $node): array
    {
        return [
            Tool::make("{$node}DecreaseLevel")
                ->label(__('rich-editor-plus::tools.decrease_level'))
                ->icon('mdi-format-indent-decrease')
                ->command('decreaseBlockLevel')
                ->block()
                ->nodes([$node])
                ->disableWhenUnavailable()
                ->hideInListItem()
                ->group('level')
                ->order(10),
            Tool::make("{$node}IncreaseLevel")
                ->label(__('rich-editor-plus::tools.increase_level'))
                ->icon('mdi-format-indent-increase')
                ->command('increaseBlockLevel')
                ->block()
                ->nodes([$node])
                ->disableWhenUnavailable()
                ->hideInListItem()
                ->group('level')
                ->order(11),
        ];
    }
}

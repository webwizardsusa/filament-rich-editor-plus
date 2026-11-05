<?php

namespace Webwizardsusa\RichEditorPlus\Support;

/**
 * The parts of a toolbar that are not plugin tools. Their values are the names a toolbar arrangement places them by,
 * so no plugin tool may use one.
 */
enum ToolbarControl: string
{
    case DragHandle = 'dragHandle';

    case BlockSwitcher = 'blockSwitcher';

    case MoveUp = 'moveUp';

    case MoveDown = 'moveDown';

    /** The list type button, which only works inside a list. */
    case ListOptions = 'listOptions';

    /** Where the active block's own tools go. */
    case BlockTools = 'blockTools';

    case More = 'more';
}

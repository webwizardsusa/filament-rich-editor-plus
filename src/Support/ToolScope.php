<?php

namespace Hollyit\RichEditorPlus\Support;

enum ToolScope: string
{
    /** Acts on the current text selection, shown in the block toolbar's formatting group. */
    case Inline = 'inline';

    /** Acts on the whole block, shown in the block toolbar above the active node. */
    case Block = 'block';

    /** Runs from the more menu, for commands that aren't about one block. */
    case Overflow = 'overflow';
}

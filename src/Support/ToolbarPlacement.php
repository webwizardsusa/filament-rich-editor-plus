<?php

namespace Hollyit\RichEditorPlus\Support;

enum ToolbarPlacement: string
{
    /** Floats above the selection in the active block. */
    case Floating = 'floating';

    /** Sits above the editor. */
    case Fixed = 'fixed';
}

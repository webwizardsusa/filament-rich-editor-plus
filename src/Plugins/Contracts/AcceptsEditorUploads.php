<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

/**
 * A plugin that takes files uploaded from the editor (see `RichEditorPlus::pullTemporaryUpload()`). A field with one
 * accepts Livewire uploads under `componentFileAttachments.{statePath}`; a field without one refuses them.
 */
interface AcceptsEditorUploads {}

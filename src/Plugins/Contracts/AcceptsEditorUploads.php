<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

/**
 * A plugin that takes files uploaded from the editor (see `RichEditorPlus::pullTemporaryUpload()`). A field with one
 * accepts Livewire uploads under `componentFileAttachments.{statePath}`; a field without one refuses them. A plugin whose
 * `acceptsEditorUploads()` answers false counts as one without the contract.
 */
interface AcceptsEditorUploads
{
    /**
     * Whether the plugin takes uploads with its current settings.
     */
    public function acceptsEditorUploads(): bool;
}

<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

/**
 * A plugin that stores files and takes the field's Filament attachment settings (`fileAttachmentsDisk()`,
 * `fileAttachmentsDirectory()`, `fileAttachmentsVisibility()`, `fileAttachmentsMaxSize()`,
 * `fileAttachmentsAcceptedFileTypes()` and `fileAttachments()`) as defaults for whatever it was not given itself.
 */
interface InheritsFieldFileAttachments
{
    /**
     * A copy of the plugin with the field's settings filling in what the plugin was not given. Settings the field
     * does not have are missing from `$defaults`.
     *
     * @param  array{disk?: string, directory?: string, visibility?: string, maxSize?: int, acceptedFileTypes?: array<string>, uploads?: bool}  $defaults
     */
    public function withFieldFileAttachments(array $defaults): static;
}

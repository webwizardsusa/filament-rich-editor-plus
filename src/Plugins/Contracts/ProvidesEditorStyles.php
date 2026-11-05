<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Contracts;

/**
 * A plugin whose content needs CSS in the editor, such as palette classes. The field prints it in a `<style>` element,
 * also when disabled, so the plugin must return only CSS it has validated.
 */
interface ProvidesEditorStyles
{
    public function getEditorStyles(): string;
}

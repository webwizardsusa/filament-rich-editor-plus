<?php

namespace Webwizardsusa\RichEditorPlus\Content\Contracts;

use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

/**
 * A text format a field stores its content in, such as Markdown (`RichEditorPlus::storeAs()`). The editor still edits
 * a JSON document; the state cast converts with {@see toDocument()} and {@see fromDocument()}. The format gets the
 * field's registry so it can read plugin settings and build the schema with `ContentSchema::fromRegistry()`.
 */
interface ContentFormat
{
    /**
     * A short id, such as `markdown`.
     */
    public function getId(): string;

    /**
     * @return array<string, mixed> a document
     */
    public function toDocument(string $content, PluginRegistry $registry): array;

    /**
     * @param  array<string, mixed>  $document
     */
    public function fromDocument(array $document, PluginRegistry $registry): string;

    /**
     * @param  array<EditorPlugin>  $plugins
     *
     * @throws UnsupportedContentFormatException naming every plugin the format can't keep, with the reason for each.
     */
    public function assertSupports(array $plugins): void;

    /**
     * Of the given plugins, those the field drops quietly when they came from the defaults.
     *
     * @param  array<EditorPlugin>  $plugins
     * @return array<EditorPlugin>
     */
    public function unsupportedPlugins(array $plugins): array;

    /**
     * Tool names the field removes from every toolbar and the slash menu.
     *
     * @return array<string>
     */
    public function getHiddenTools(): array;
}

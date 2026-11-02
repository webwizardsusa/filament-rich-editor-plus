<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\TextSerializer;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;

/**
 * Converts stored editor content (TipTap JSON as an array or string, or HTML) on the server, using the nodes and marks
 * of the same plugins the editor was configured with.
 */
class RichContentPlusRenderer
{
    protected ?PluginRegistry $registry = null;

    /**
     * @param  string | array<string, mixed> | null  $content
     */
    public function __construct(protected string|array|null $content = null) {}

    /**
     * @param  string | array<string, mixed> | null  $content
     */
    public static function make(string|array|null $content): static
    {
        return new static($content);
    }

    /**
     * Renders several documents together, so plugins make their lookups (such as mention labels) once for all of them.
     *
     * @param  iterable<array-key, string | array<string, mixed> | null>  $contents
     */
    public static function many(iterable $contents): RichContentPlusBatchRenderer
    {
        return RichContentPlusBatchRenderer::make($contents);
    }

    /**
     * Turns stored content (a document array, JSON or HTML) into a document array. An array is returned as given.
     *
     * @param  string | array<string, mixed> | null  $content
     * @return array<string, mixed>
     */
    public static function toDocument(string|array|null $content, ContentSchema $schema): array
    {
        if (blank($content)) {
            return ['type' => 'doc', 'content' => []];
        }

        if (is_array($content)) {
            return $content;
        }

        $decoded = json_decode($content, true);

        if (is_array($decoded) && ($decoded['type'] ?? null) === 'doc') {
            return $decoded;
        }

        return (new HtmlParser($schema))->parse($content);
    }

    /**
     * @param  array<EditorPlugin | class-string<EditorPlugin>>  $plugins
     */
    public function plugins(array $plugins): static
    {
        $this->registry = PluginRegistry::make($plugins);

        return $this;
    }

    /**
     * HTML for display, with data from plugins filled in. It is safe to print. Don't store it: use `toStorableHtml()`.
     */
    public function toHtml(): string
    {
        return (new HtmlSerializer($this->getSchema()))->serialize($this->getPreparedDocument());
    }

    /**
     * HTML that is safe to print and to store: it holds only what is in the document, with nothing looked up.
     */
    public function toStorableHtml(): string
    {
        return (new HtmlSerializer($this->getSchema(), forStorage: true))->serialize($this->getDocument());
    }

    /**
     * The document as stored. An array is returned as given.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->getDocument();
    }

    public function toText(): string
    {
        return (new TextSerializer($this->getSchema()))->serialize($this->getPreparedDocument());
    }

    /**
     * @return array<string, mixed>
     */
    protected function getDocument(): array
    {
        return static::toDocument($this->content, $this->getSchema());
    }

    /**
     * The document as plugins want it rendered. The stored document is not changed.
     *
     * @return array<string, mixed>
     */
    protected function getPreparedDocument(): array
    {
        return $this->getRegistry()->prepareRenderedContents([$this->getDocument()])[0];
    }

    protected function getSchema(): ContentSchema
    {
        return ContentSchema::fromRegistry($this->getRegistry());
    }

    protected function getRegistry(): PluginRegistry
    {
        return $this->registry ??= PluginRegistry::make(PluginRegistry::defaultPlugins());
    }
}

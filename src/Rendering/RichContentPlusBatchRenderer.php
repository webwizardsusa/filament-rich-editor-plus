<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\TextSerializer;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;

/**
 * Renders several pieces of stored content (each an array, JSON or HTML) for display at once, such as a list of posts.
 * Plugins prepare all the documents in one go, so a lookup like mention labels is made once for the whole batch.
 * Results keep the keys they were given.
 */
class RichContentPlusBatchRenderer
{
    protected ?PluginRegistry $registry = null;

    protected ?ContentSchema $schema = null;

    /**
     * @var array<array-key, string | array<string, mixed> | null>
     */
    protected array $contents;

    /**
     * @param  iterable<array-key, string | array<string, mixed> | null>  $contents
     */
    public function __construct(iterable $contents)
    {
        $this->contents = is_array($contents) ? $contents : iterator_to_array($contents);
    }

    /**
     * @param  iterable<array-key, string | array<string, mixed> | null>  $contents
     */
    public static function make(iterable $contents): static
    {
        return new static($contents);
    }

    /**
     * @param  array<EditorPlugin | class-string<EditorPlugin>>  $plugins
     */
    public function plugins(array $plugins): static
    {
        $this->registry = PluginRegistry::make($plugins);
        $this->schema = null;

        return $this;
    }

    /**
     * HTML for display, with data from plugins filled in. It is safe to print.
     *
     * @return array<array-key, string>
     */
    public function toHtml(): array
    {
        $serializer = new HtmlSerializer($this->getSchema());

        return array_map($serializer->serialize(...), $this->getPreparedDocuments());
    }

    /**
     * @return array<array-key, string>
     */
    public function toText(): array
    {
        $serializer = new TextSerializer($this->getSchema());

        return array_map($serializer->serialize(...), $this->getPreparedDocuments());
    }

    /**
     * @return array<array-key, array<string, mixed>>
     */
    protected function getPreparedDocuments(): array
    {
        $schema = $this->getSchema();

        $documents = array_map(
            static fn (string|array|null $content): array => RichContentPlusRenderer::toDocument($content, $schema),
            $this->contents,
        );

        return $this->getRegistry()->prepareRenderedContents($documents);
    }

    protected function getSchema(): ContentSchema
    {
        return $this->schema ??= ContentSchema::fromRegistry($this->getRegistry());
    }

    protected function getRegistry(): PluginRegistry
    {
        return $this->registry ??= PluginRegistry::make(PluginRegistry::defaultPlugins());
    }
}

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

    protected bool $parsesHtml = false;

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
     * Parses stored HTML into documents before rendering, instead of patching it. Use this for HTML that was not
     * written by the field or by `toStorableHtml()`.
     */
    public function parseHtml(bool $condition = true): static
    {
        $this->parsesHtml = $condition;

        return $this;
    }

    /**
     * HTML for display, with data from plugins filled in. It is safe to print when the content was stored by the field
     * or by `toStorableHtml()`: stored HTML is patched, not parsed. Use `->parseHtml()` for HTML from anywhere else.
     *
     * @return array<array-key, string>
     */
    public function toHtml(): array
    {
        $patchable = $this->parsesHtml || ! HtmlPatcher::supports($this->getRegistry())
            ? []
            : array_filter($this->contents, RichContentPlusRenderer::isHtml(...));

        $patched = $patchable === [] ? [] : (new HtmlPatcher($this->getRegistry(), $this->getSchema()))->patch($patchable);

        $remaining = array_diff_key($this->contents, $patchable);
        $serializer = new HtmlSerializer($this->getSchema());
        $rendered = $remaining === [] ? [] : array_map($serializer->serialize(...), $this->getPreparedDocuments($remaining));

        $html = [];

        foreach (array_keys($this->contents) as $key) {
            $html[$key] = array_key_exists($key, $patched) ? $patched[$key] : $rendered[$key];
        }

        return $html;
    }

    /**
     * @return array<array-key, string>
     */
    public function toText(): array
    {
        $serializer = new TextSerializer($this->getSchema());

        return array_map($serializer->serialize(...), $this->getPreparedDocuments($this->contents));
    }

    /**
     * @param  array<array-key, string | array<string, mixed> | null>  $contents
     * @return array<array-key, array<string, mixed>>
     */
    protected function getPreparedDocuments(array $contents): array
    {
        $schema = $this->getSchema();

        $documents = array_map(
            static fn (string|array|null $content): array => RichContentPlusRenderer::toDocument($content, $schema),
            $contents,
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

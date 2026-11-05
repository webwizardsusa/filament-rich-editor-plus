<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\Contracts\ContentFormat;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\TextSerializer;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownFormat;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Illuminate\Support\Traits\Macroable;

/**
 * Converts stored editor content (TipTap JSON as an array or string, or HTML) on the server, using the nodes and marks
 * of the same plugins the editor was configured with.
 */
class RichContentPlusRenderer
{
    use Macroable;

    protected ?PluginRegistry $registry = null;

    protected ?ContentFormat $format = null;

    protected bool $parsesHtml = false;

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
     * Whether stored content is HTML rather than a document (an array, or JSON whose `type` is `doc`). Blank content
     * is neither.
     *
     * @param  string | array<string, mixed> | null  $content
     */
    public static function isHtml(string|array|null $content): bool
    {
        if (! is_string($content) || blank($content)) {
            return false;
        }

        if (! str_starts_with(ltrim($content), '{')) {
            return true;
        }

        $decoded = json_decode($content, true);

        return ! (is_array($decoded) && ($decoded['type'] ?? null) === 'doc');
    }

    /**
     * Parses stored HTML into a document before rendering it, instead of patching it. Use this for HTML that was not
     * written by the field or by `toStorableHtml()`, such as imported markup.
     */
    public function parseHtml(bool $condition = true): static
    {
        $this->parsesHtml = $condition;

        return $this;
    }

    /**
     * Reads string content in this format (such as Markdown) instead of as HTML or JSON. Arrays are still documents.
     */
    public function format(?ContentFormat $format): static
    {
        $this->format = $format;

        return $this;
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
     * HTML for display, with data from plugins filled in. It is safe to print when the content was stored by the field
     * or by `toStorableHtml()`: stored HTML is patched, not parsed. Use `->parseHtml()` for HTML from anywhere else.
     * Don't store the result: use `toStorableHtml()`.
     */
    public function toHtml(): string
    {
        $schema = $this->getSchema();

        if ($this->patchesHtml()) {
            return (new HtmlPatcher($this->getRegistry(), $schema))->patch([$this->content])[0];
        }

        return (new HtmlSerializer($schema))->serialize($this->getPreparedDocument());
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

    /**
     * The content written in another format, from the document as plugins prepare it for rendering.
     */
    public function toFormat(ContentFormat $format): string
    {
        return $format->fromDocument($this->getPreparedDocument(), $this->getRegistry());
    }

    /**
     * The content as Markdown, for export: a node Markdown has no form for is written as its text and such a mark is
     * dropped, instead of throwing.
     */
    public function toMarkdown(): string
    {
        return $this->toFormat(MarkdownFormat::make()->lenient());
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
        if ($this->format !== null && is_string($this->content) && ! blank($this->content)) {
            return $this->format->toDocument($this->content, $this->getRegistry());
        }

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

    protected function patchesHtml(): bool
    {
        return $this->format === null && ! $this->parsesHtml && static::isHtml($this->content) && HtmlPatcher::supports($this->getRegistry());
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

<?php

namespace Hollyit\RichEditorPlus\Content;

use Closure;
use DOMElement;

/**
 * How a node or mark moves between HTML and a TipTap document. Plugins declare these in `getNodes()` and `getMarks()`.
 *
 * Output only ever contains what a spec declares, so unknown attributes in stored content can never reach a page.
 */
abstract class ContentSpec
{
    /**
     * @var array<string>
     */
    protected array $parseTags = [];

    protected ?Closure $parseCallback = null;

    protected int $priority = 50;

    /**
     * @var array<string, array{parse: ?Closure, render: ?Closure, default: mixed, protocols: ?array<string>, transient: bool}>
     */
    protected array $attributes = [];

    /**
     * @var array<string, mixed>
     */
    protected array $fixedAttributes = [];

    protected ?string $renderTag = null;

    protected ?Closure $renderCallback = null;

    protected ?Closure $textCallback = null;

    final public function __construct(protected string $name) {}

    public static function make(string $name): static
    {
        return new static($name);
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getPriority(): int
    {
        return $this->priority;
    }

    /**
     * @param  array<string>  $tags
     */
    public function parseTags(array $tags): static
    {
        $this->parseTags = $tags;

        return $this;
    }

    /**
     * For matches a tag name can't express. The callback gets the `DOMElement` and returns attributes, `true` to match,
     * or `false` to leave it to `parseTags()`.
     */
    public function parseUsing(Closure $callback): static
    {
        $this->parseCallback = $callback;

        return $this;
    }

    /**
     * The order rules are tried and marks are ranked, highest first. The default is 50.
     */
    public function priority(int $priority): static
    {
        $this->priority = $priority;

        return $this;
    }

    public function attribute(string $name, ?Closure $parse = null, ?Closure $render = null, mixed $default = null): static
    {
        $this->attributes[$name] = [
            'parse' => $parse,
            'render' => $render,
            'default' => $default,
            'protocols' => null,
            'transient' => false,
        ];

        return $this;
    }

    /**
     * @param  array<string>  $protocols
     */
    public function urlAttribute(string $name, array $protocols, mixed $default = null): static
    {
        $this->attribute($name, default: $default);
        $this->attributes[$name]['protocols'] = $protocols;

        return $this;
    }

    /**
     * A URL that exists only while rendering for display. It is never parsed from HTML or written to stored HTML.
     *
     * @param  array<string>  $protocols
     */
    public function transientAttribute(string $name, array $protocols): static
    {
        $this->urlAttribute($name, $protocols);
        $this->attributes[$name]['transient'] = true;

        return $this;
    }

    /**
     * Attributes on every rendered element. They win over declared attributes.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function htmlAttributes(array $attributes): static
    {
        $this->fixedAttributes = $attributes;

        return $this;
    }

    public function renderTag(string $tag): static
    {
        $this->renderTag = $tag;

        return $this;
    }

    /**
     * The callback gets the node or mark and its HTML attributes, and returns `['tag', $attributes, ...$children]`, as
     * in ProseMirror. `0` is where the node's children go, a nested array is an inner element, and a string is escaped
     * text. Elements and text may come before or after the `0`.
     */
    public function renderUsing(Closure $callback): static
    {
        $this->renderCallback = $callback;

        return $this;
    }

    /**
     * Plain-text output for an inline node. The callback gets the node.
     */
    public function textUsing(Closure $callback): static
    {
        $this->textCallback = $callback;

        return $this;
    }

    /**
     * @return array<string, mixed> | null Attributes from the rule, or null when the element doesn't match.
     */
    public function match(DOMElement $element): ?array
    {
        $result = $this->parseCallback ? ($this->parseCallback)($element) : false;

        if (is_array($result)) {
            return $result;
        }

        if ($result === true || in_array(strtolower($element->tagName), $this->parseTags, true)) {
            return [];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $matched  Attributes from the parse rule, which win.
     * @return array<string, mixed>
     */
    public function parseAttributes(DOMElement $element, array $matched): array
    {
        $values = [];

        foreach ($this->attributes as $name => $attribute) {
            if ($attribute['transient']) {
                continue;
            }

            $values[$name] = match (true) {
                array_key_exists($name, $matched) => $matched[$name],
                $attribute['parse'] !== null => ($attribute['parse'])($element),
                $element->hasAttribute($name) => $element->getAttribute($name),
                default => null,
            } ?? $attribute['default'];
        }

        return $values;
    }

    /**
     * @param  array<string, mixed>  $item  A node or mark from the document.
     * @param  bool  $forStorage  Leaves out transient attributes.
     * @return array<mixed>
     */
    public function render(array $item, bool $forStorage): array
    {
        $attributes = $this->renderAttributes(is_array($item['attrs'] ?? null) ? $item['attrs'] : [], $forStorage);

        if ($this->renderCallback !== null) {
            return ($this->renderCallback)($item, $attributes);
        }

        return [$this->renderTag, $attributes, 0];
    }

    /**
     * @param  array<string, mixed>  $item
     */
    public function renderText(array $item): string
    {
        return $this->textCallback ? (string) ($this->textCallback)($item) : '';
    }

    /**
     * Relative URLs have no protocol to check and are allowed. Control characters and spaces are removed first because
     * browsers ignore them, so `java\tscript:` is still `javascript:`.
     *
     * @param  array<string>  $protocols
     */
    public static function isAllowedUrl(mixed $url, array $protocols): bool
    {
        if (! is_string($url)) {
            return false;
        }

        $cleaned = preg_replace('/[\x{0000}-\x{0020}\x{007F}-\x{00A0}\x{1680}\x{180E}\x{2000}-\x{2029}\x{205F}\x{3000}]/u', '', $url);

        if ($cleaned === null) {
            return false;
        }

        if (preg_match('/^([a-z][a-z0-9+.\-]*):/i', $cleaned, $matches) !== 1) {
            return true;
        }

        return in_array(strtolower($matches[1]), array_map('strtolower', $protocols), true);
    }

    public static function styleValue(DOMElement $element, string $property): ?string
    {
        foreach (explode(';', $element->getAttribute('style')) as $declaration) {
            [$name, $value] = array_pad(explode(':', $declaration, 2), 2, null);

            if ($value !== null && strtolower(trim($name)) === $property) {
                return strtolower(trim($value));
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $attrs
     * @return array<string, mixed>
     */
    protected function renderAttributes(array $attrs, bool $forStorage): array
    {
        $html = [];

        foreach ($this->attributes as $name => $attribute) {
            if ($forStorage && $attribute['transient']) {
                continue;
            }

            $value = $attrs[$name] ?? $attribute['default'];

            if ($attribute['protocols'] !== null && ! static::isAllowedUrl($value, $attribute['protocols'])) {
                $value = null;
            }

            $rendered = $attribute['render']
                ? ($attribute['render'])([...$attrs, $name => $value])
                : [$name => $value];

            $html = [...$html, ...array_filter($rendered, static fn (mixed $item): bool => $item !== null)];
        }

        return [...$html, ...$this->fixedAttributes];
    }
}

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
     * @var array<string, GlobalAttribute>
     */
    protected array $globalAttributes = [];

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

    /**
     * Adds an attribute another plugin declared for this node or mark, which {@see ContentSchema} does on a copy of the
     * spec. Global attributes are parsed and rendered before the spec's own, as in TipTap. {@see ContentSchema}
     * refuses a name the spec already has or another global attribute already added, so none is replaced here.
     */
    public function globalAttribute(GlobalAttribute $attribute): static
    {
        $this->globalAttributes[$attribute->getName()] = $attribute;

        return $this;
    }

    public function declaresAttribute(string $name): bool
    {
        return array_key_exists($name, $this->attributes);
    }

    public function renderTag(string $tag): static
    {
        $this->renderTag = $tag;

        return $this;
    }

    /**
     * The callback gets the node or mark and its HTML attributes, and returns `['tag', $attributes, ...$children]`, as
     * in ProseMirror. `0` is where the node's children go, a nested array is an inner element, and a string is escaped
     * text. Elements and text may come before or after the `0`. A node with content needs a `0`: nested specs without
     * one put the children after the innermost element, as in ProseMirror.
     */
    public function renderUsing(Closure $callback): static
    {
        $this->renderCallback = $callback;

        return $this;
    }

    /**
     * Plain-text output. For an inline node it is the node's text; for a block node it goes before the text of its
     * children, such as a task item's `[x] `. The callback gets the node.
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

        foreach ($this->globalAttributes as $name => $attribute) {
            $values[$name] = $attribute->parse($element);
        }

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

        foreach ($this->globalAttributes as $name => $attribute) {
            $html = static::mergeHtmlAttributes($html, $attribute->render($attrs[$name] ?? null));
        }

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

            $html = static::mergeHtmlAttributes($html, $rendered);
        }

        return [...$html, ...$this->fixedAttributes];
    }

    /**
     * Merges rendered attributes as TipTap's `mergeAttributes` does, so the server writes the same HTML as the editor:
     * classes are appended without duplicates, `style` declarations are merged by property, and any other attribute
     * takes the later value. Null values are skipped, and an empty earlier value is replaced.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array<string, mixed>  $additional
     * @return array<string, mixed>
     */
    public static function mergeHtmlAttributes(array $attributes, array $additional): array
    {
        foreach ($additional as $name => $value) {
            if ($value === null) {
                continue;
            }

            $existing = $attributes[$name] ?? null;

            if ($existing === null || $existing === '' || $existing === false || $existing === 0) {
                $attributes[$name] = $value;

                continue;
            }

            $attributes[$name] = match ($name) {
                'class' => static::mergeClasses((string) $existing, (string) $value),
                'style' => static::mergeStyles((string) $existing, (string) $value),
                default => $value,
            };
        }

        return $attributes;
    }

    protected static function mergeClasses(string $existing, string $additional): string
    {
        $classes = explode(' ', $existing);

        foreach (explode(' ', $additional) as $class) {
            if (! in_array($class, $classes, true)) {
                $classes[] = $class;
            }
        }

        return implode(' ', $classes);
    }

    protected static function mergeStyles(string $existing, string $additional): string
    {
        $declarations = [];

        foreach ([$existing, $additional] as $style) {
            foreach (explode(';', $style) as $declaration) {
                $colon = strpos($declaration, ':');

                if ($colon === false) {
                    continue;
                }

                $property = trim(substr($declaration, 0, $colon));
                $value = trim(substr($declaration, $colon + 1));

                if ($property !== '' && $value !== '') {
                    $declarations[$property] = $value;
                }
            }
        }

        return implode('; ', array_map(
            static fn (string $property, string $value): string => "{$property}: {$value}",
            array_keys($declarations),
            $declarations,
        ));
    }
}

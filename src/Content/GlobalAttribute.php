<?php

namespace Hollyit\RichEditorPlus\Content;

use DOMElement;
use InvalidArgumentException;

/**
 * An attribute a plugin adds to nodes and marks that other plugins own, like TipTap's `addGlobalAttributes`. It is
 * one of three kinds: a CSS property of `style`, an HTML attribute, or one CSS class out of a map. It is
 * plain data, so one declaration drives the server and, through the `core/global-attributes` JS extension, the
 * browser. Its value is always a string, validated against `values()` or `pattern()` on parse and on render. The
 * default is `null`, which is never rendered.
 */
class GlobalAttribute
{
    /**
     * @var array<string, string>
     */
    protected const array PCRE_ONLY_SYNTAX = [
        '/(?<!\\\\)\\\\[AzZ]/' => 'the anchors \\A, \\z and \\Z',
        '/(?<!\\\\)(?:[*+?]|\\})\\+/' => 'possessive quantifiers',
        '/\\(\\?>/' => 'atomic groups',
        '/\\[\\[:/' => 'POSIX classes',
    ];

    /**
     * @var array<string>
     */
    protected const array URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'background', 'srcset', 'srcdoc', 'ping', 'data', 'codebase', 'cite', 'longdesc', 'xml:base', 'xmlns'];

    /**
     * @var array<string> | string
     */
    protected array|string $types = [];

    /**
     * @var ?array<string>
     */
    protected ?array $values = null;

    protected ?string $pattern = null;

    /**
     * @var ?array<string, string>
     */
    protected ?array $classes = null;

    protected bool $keepsOnSplit = true;

    protected bool $isProvidedByJsExtension = false;

    /**
     * @param  'style' | 'html' | 'class'  $kind
     */
    final public function __construct(protected string $name, protected string $kind, protected string $key) {}

    /**
     * Parsed from and rendered into one CSS property of the `style` attribute.
     */
    public static function style(string $name, string $property): static
    {
        return new static($name, 'style', strtolower($property));
    }

    /**
     * A plain HTML attribute. `style`, event handlers and URL attributes are refused.
     */
    public static function html(string $name, string $attribute): static
    {
        return new static($name, 'html', strtolower($attribute));
    }

    /**
     * One CSS class out of a map, such as a palette: the document stores the key (`red`), the HTML its class
     * (`has-red-color`). Other classes on the element are left alone, so several class attributes can share an element.
     * Keys are lower-case letters, digits and hyphens; the map replaces `values()` and `pattern()`.
     *
     * @param  array<string, string>  $classesByValue
     */
    public static function classes(string $name, array $classesByValue): static
    {
        $attribute = new static($name, 'class', 'class');
        $attribute->classes = $classesByValue;

        return $attribute;
    }

    /**
     * Node and mark names, or `'*'`, `'nodes'` or `'marks'`. Names the editor doesn't have are ignored.
     *
     * @param  array<string> | string  $types
     */
    public function types(array|string $types): static
    {
        $this->types = $types;

        return $this;
    }

    /**
     * The allowed values, matched without regard to case. The value kept is the spelling in this list.
     *
     * @param  array<string>  $values
     */
    public function values(array $values): static
    {
        $this->values = array_values($values);

        return $this;
    }

    /**
     * A regular expression the whole value must match, without delimiters. It is anchored for you and runs with the
     * `u` flag in PHP and in JS, so use syntax both support.
     */
    public function pattern(string $pattern): static
    {
        $this->pattern = $pattern;

        return $this;
    }

    /**
     * Whether a block split with Enter keeps the value.
     */
    public function keepOnSplit(bool $keep = true): static
    {
        $this->keepsOnSplit = $keep;

        return $this;
    }

    /**
     * For an attribute a TipTap extension already declares in the browser, such as `TextAlign`'s `textAlign`. The
     * server still parses and renders it; no JS is generated for it.
     */
    public function providedByJsExtension(): static
    {
        $this->isProvidedByJsExtension = true;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function isProvidedByJsExtension(): bool
    {
        return $this->isProvidedByJsExtension;
    }

    /**
     * @throws InvalidArgumentException
     */
    public function assertValid(): void
    {
        $label = "The global attribute [{$this->name}]";

        if (preg_match('/^[A-Za-z][A-Za-z0-9_]*\z/', $this->name) !== 1) {
            throw new InvalidArgumentException("{$label} needs a name of letters, digits and underscores that starts with a letter.");
        }

        if ($this->types === [] || (is_string($this->types) && ! in_array($this->types, ['*', 'nodes', 'marks'], true))) {
            throw new InvalidArgumentException("{$label} needs types(): a list of node and mark names, or '*', 'nodes' or 'marks'.");
        }

        if ($this->kind === 'class') {
            $this->assertValidClasses($label);

            return;
        }

        if (($this->values === null) === ($this->pattern === null)) {
            throw new InvalidArgumentException("{$label} needs values() or pattern(), but not both.");
        }

        if ($this->values === []) {
            throw new InvalidArgumentException("{$label} needs at least one value.");
        }

        foreach ($this->values ?? [] as $value) {
            if (! is_string($value)) {
                throw new InvalidArgumentException("{$label} needs values() to be strings.");
            }
        }

        foreach (static::PCRE_ONLY_SYNTAX as $regex => $description) {
            if ($this->pattern !== null && preg_match($regex, $this->pattern) === 1) {
                throw new InvalidArgumentException("{$label} uses {$description}, which JavaScript doesn't have. The pattern must use syntax PHP and JavaScript share.");
            }
        }

        if ($this->pattern !== null && @preg_match($this->regex(), '') === false) {
            throw new InvalidArgumentException("{$label} has an invalid pattern.");
        }

        if ($this->kind === 'style') {
            if (preg_match('/^[a-z][a-z0-9-]*\z/', $this->key) !== 1) {
                throw new InvalidArgumentException("{$label} names [{$this->key}], which is not a CSS property.");
            }

            foreach ($this->values ?? [] as $value) {
                if (str_contains($value, ';')) {
                    throw new InvalidArgumentException("{$label} has a value with a semicolon, which would add CSS declarations.");
                }
            }

            return;
        }

        if (preg_match('/^[a-z][a-z0-9:_.-]*\z/', $this->key) !== 1) {
            throw new InvalidArgumentException("{$label} names [{$this->key}], which is not an HTML attribute name.");
        }

        if ($this->key === 'style' || str_starts_with($this->key, 'on') || in_array($this->key, static::URL_ATTRIBUTES, true)) {
            throw new InvalidArgumentException("{$label} can't write [{$this->key}]. Use GlobalAttribute::style() for CSS; script and URL attributes are not supported.");
        }
    }

    /**
     * @throws InvalidArgumentException
     */
    protected function assertValidClasses(string $label): void
    {
        if ($this->values !== null || $this->pattern !== null) {
            throw new InvalidArgumentException("{$label} takes its values from classes(), so values() and pattern() can't be used with it.");
        }

        if ($this->classes === null || $this->classes === []) {
            throw new InvalidArgumentException("{$label} needs at least one class.");
        }

        foreach ($this->classes as $value => $class) {
            if (preg_match('/^[a-z0-9][a-z0-9-]*\z/', (string) $value) !== 1) {
                throw new InvalidArgumentException("{$label} has the value [{$value}], which must be lower-case letters, digits and hyphens.");
            }

            if (! is_string($class) || preg_match('/^-?[A-Za-z_][A-Za-z0-9_-]*\z/', $class) !== 1) {
                throw new InvalidArgumentException("{$label} maps [{$value}] to [".(is_string($class) ? $class : get_debug_type($class)).'], which is not a valid CSS class name.');
            }
        }

        if (count(array_unique($this->classes)) !== count($this->classes)) {
            throw new InvalidArgumentException("{$label} maps two values to the same class.");
        }
    }

    /**
     * The node and mark names this attribute applies to, out of those the editor has.
     *
     * @param  array<string>  $nodeNames
     * @param  array<string>  $markNames
     * @return array<string>
     */
    public function resolveTypes(array $nodeNames, array $markNames): array
    {
        return match ($this->types) {
            '*' => [...$nodeNames, ...$markNames],
            'nodes' => $nodeNames,
            'marks' => $markNames,
            default => array_values(array_intersect((array) $this->types, [...$nodeNames, ...$markNames])),
        };
    }

    /**
     * The value to keep, or null when it isn't valid. The JS extension applies the same rules.
     */
    public function normalize(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        if ($this->kind === 'class') {
            return array_key_exists($value, $this->classes ?? []) ? $value : null;
        }

        $value = trim($value);

        if ($value === '' || ($this->kind === 'style' && str_contains($value, ';'))) {
            return null;
        }

        if ($this->values !== null) {
            foreach ($this->values as $allowed) {
                if (mb_strtolower($allowed) === mb_strtolower($value)) {
                    return $allowed;
                }
            }

            return null;
        }

        return preg_match($this->regex(), $value) === 1 ? $value : null;
    }

    public function parse(DOMElement $element): ?string
    {
        if ($this->kind === 'class') {
            foreach (preg_split('/[ \t\n\f\r]+/', $element->getAttribute('class'), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $token) {
                $value = array_search($token, $this->classes ?? [], true);

                if ($value !== false) {
                    return (string) $value;
                }
            }

            return null;
        }

        if ($this->kind === 'style') {
            return $this->normalize(static::styleValue($element->getAttribute('style'), $this->key));
        }

        return $element->hasAttribute($this->key) ? $this->normalize($element->getAttribute($this->key)) : null;
    }

    /**
     * @return array<string, string>
     */
    public function render(mixed $value): array
    {
        $value = $this->normalize($value);

        if ($value === null) {
            return [];
        }

        if ($this->kind === 'class') {
            return ['class' => $this->classes[$value]];
        }

        return $this->kind === 'style' ? ['style' => "{$this->key}: {$value}"] : [$this->key => $value];
    }

    /**
     * @return array{name: string, kind: 'style'|'html'|'class', key: string, types: array<string> | string, values: ?array<string>, pattern: ?string, keepOnSplit: bool, classes: ?object}
     */
    public function toArray(): array
    {
        $this->assertValid();

        return [
            'name' => $this->name,
            'kind' => $this->kind,
            'key' => $this->key,
            'types' => $this->types,
            'values' => $this->kind === 'class' ? array_map(strval(...), array_keys($this->classes ?? [])) : $this->values,
            'pattern' => $this->pattern,
            'keepOnSplit' => $this->keepsOnSplit,
            'classes' => $this->kind === 'class' ? (object) $this->classes : null,
        ];
    }

    /**
     * One property's value from raw `style` text: split on `;`, then on the first `:`, the property matched without
     * regard to case and the last declaration winning, as in CSS. The value keeps its case.
     */
    public static function styleValue(string $style, string $property): ?string
    {
        $found = null;

        foreach (explode(';', $style) as $declaration) {
            $colon = strpos($declaration, ':');

            if ($colon === false) {
                continue;
            }

            if (strtolower(trim(substr($declaration, 0, $colon))) === strtolower($property)) {
                $found = trim(substr($declaration, $colon + 1));
            }
        }

        return $found;
    }

    protected function regex(): string
    {
        return '~^(?:'.str_replace('~', '\~', (string) $this->pattern).')$~u';
    }
}

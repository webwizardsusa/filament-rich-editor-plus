<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Plugins\Contracts\PatchesRenderedHtml;
use Hollyit\RichEditorPlus\Plugins\Contracts\PatchesRenderedMarkup;
use Hollyit\RichEditorPlus\Plugins\Contracts\PreparesRenderedContent;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use LogicException;
use RuntimeException;

/**
 * Renders stored HTML for display by refreshing only the nodes plugins fill in at render time, such as mentions, and
 * passing every other byte through. Plugins still make each lookup once for the whole batch.
 *
 * Rendered nodes are elements with only text inside, or, when a plugin declares them as markup nodes, elements that
 * contain markup (such as an image's `<figure>`). A document with a markup element that does not parse back to one node
 * of its type is parsed whole instead, so a batch costs at most two calls to the plugins.
 *
 * Stored HTML is trusted: it must have been written by the field or by `toStorableHtml()`.
 */
class HtmlPatcher
{
    protected ContentSchema $schema;

    /**
     * @var array<string, string> `node name => id of the plugin that declared it`
     */
    protected array $renderedNodes = [];

    /**
     * @var array<string, string> `node name => id of the plugin that declared it`, for rendered nodes whose element
     *                            contains markup. They are not in {@see $renderedNodes}.
     */
    protected array $markupNodes = [];

    public function __construct(protected PluginRegistry $registry, ?ContentSchema $schema = null)
    {
        $this->schema = $schema ?? ContentSchema::fromRegistry($registry);

        foreach ($registry->getPlugins() as $plugin) {
            if (! $plugin instanceof PatchesRenderedHtml) {
                continue;
            }

            foreach ($plugin->getRenderedNodes() as $name) {
                if (! $this->schema->node($name)?->isAtom()) {
                    throw new LogicException("The editor plugin [{$plugin->getId()}] declares [{$name}] as a rendered node, but it is not an atom node.");
                }

                $this->renderedNodes[$name] = $plugin->getId();
            }

            if ($plugin instanceof PatchesRenderedMarkup) {
                $this->collectMarkupNodes($plugin);
            }
        }
    }

    /**
     * Moves a plugin's markup nodes out of the text-node set, so only {@see markupPattern()} matches them.
     */
    protected function collectMarkupNodes(PatchesRenderedMarkup $plugin): void
    {
        foreach ($plugin->getRenderedMarkupNodes() as $name) {
            if (! in_array($name, $plugin->getRenderedNodes(), true)) {
                throw new LogicException("The editor plugin [{$plugin->getId()}] declares [{$name}] as a rendered markup node, but not as a rendered node.");
            }

            unset($this->renderedNodes[$name]);
            $this->markupNodes[$name] = $plugin->getId();
        }
    }

    /**
     * Whether stored HTML can be patched: every plugin that prepares rendered content declares the nodes it refreshes.
     */
    public static function supports(PluginRegistry $registry): bool
    {
        foreach ($registry->getPlugins() as $plugin) {
            if ($plugin instanceof PreparesRenderedContent && ! $plugin instanceof PatchesRenderedHtml) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<array-key, string>  $htmlDocuments  Stored HTML.
     * @return array<array-key, string> Display HTML, with the same keys in the same order.
     */
    public function patch(array $htmlDocuments): array
    {
        if ($this->renderedNodes === [] && $this->markupNodes === []) {
            return $htmlDocuments;
        }

        $found = $this->find($htmlDocuments);

        if ($found === []) {
            return $htmlDocuments;
        }

        $nodes = $this->parseElements($found);
        $serializer = new HtmlSerializer($this->schema);
        $patched = array_filter($nodes, static fn (?array $documentNodes): bool => $documentNodes !== null);

        if ($patched !== []) {
            [$standIns, $wrappers] = $this->standIns($patched);
            $prepared = $this->registry->prepareRenderedContents($standIns);

            foreach ($patched as $key => $documentNodes) {
                $htmlDocuments[$key] = $this->substitute($htmlDocuments[$key], $found[$key], $this->flatten($prepared[$key], $wrappers[$key]), $serializer);
            }
        }

        $fallbacks = array_diff_key($nodes, $patched);

        if ($fallbacks !== []) {
            $parser = new HtmlParser($this->schema);
            $documents = array_map(static fn (string $html): array => $parser->parse($html), array_intersect_key($htmlDocuments, $fallbacks));

            foreach ($this->registry->prepareRenderedContents($documents) as $key => $document) {
                $htmlDocuments[$key] = $serializer->serialize($document);
            }
        }

        return $htmlDocuments;
    }

    /**
     * The rendered elements of each document that has any, in document order. A text element inside a markup element
     * is part of that element, so it is not matched on its own.
     *
     * @param  array<array-key, string>  $htmlDocuments
     * @return array<array-key, array<int, array<int | string, array{0: string, 1: int}>>>
     */
    protected function find(array $htmlDocuments): array
    {
        $pattern = $this->renderedNodes === [] ? null : $this->pattern();
        $markupPattern = $this->markupNodes === [] ? null : $this->markupPattern();
        $found = [];

        foreach ($htmlDocuments as $key => $html) {
            $elements = $pattern === null ? [] : $this->match($pattern, $html);
            $markupElements = $markupPattern === null ? [] : $this->match($markupPattern, $html);

            if ($markupElements !== []) {
                $elements = array_filter($elements, static function (array $element) use ($markupElements): bool {
                    foreach ($markupElements as $markupElement) {
                        if ($element[0][1] > $markupElement[0][1] && $element[0][1] < $markupElement[0][1] + strlen($markupElement[0][0])) {
                            return false;
                        }
                    }

                    return true;
                });

                $elements = [...$elements, ...$markupElements];
                usort($elements, static fn (array $a, array $b): int => $a[0][1] <=> $b[0][1]);
            }

            if ($elements !== []) {
                $found[$key] = $elements;
            }
        }

        return $found;
    }

    /**
     * @return array<int, array<int | string, array{0: string, 1: int}>>
     */
    protected function match(string $pattern, string $html): array
    {
        $count = preg_match_all($pattern, $html, $elements, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);

        if ($count === false) {
            throw new RuntimeException('Stored rich content could not be patched: '.preg_last_error_msg().'.');
        }

        return $count > 0 ? $elements : [];
    }

    /**
     * An element marked as a rendered node, with only text inside. Stored text and attribute values are escaped, so
     * they never contain `<` or `>`, and every attribute is written as `name="value"`. Attributes are stepped over
     * whole and possessively, so a very long value (such as a large URL) costs one step, not one per byte.
     */
    protected function pattern(): string
    {
        $types = implode('|', array_map(static fn (string $name): string => preg_quote($name, '/'), array_keys($this->renderedNodes)));

        return '/<(?<tag>[a-zA-Z][a-zA-Z0-9-]*+)(?:\s[^\s=>"]++(?:="[^"]*+")?)*?\sdata-type="(?<type>'.$types.')"[^>]*+>[^<]*+<\/(?P=tag)>/u';
    }

    /**
     * An element marked as a rendered markup node, up to the first closing tag of its own name. Attributes are stepped
     * over as in {@see pattern()}; the body is matched lazily, so the element must not contain one of its own tag.
     */
    protected function markupPattern(): string
    {
        $types = implode('|', array_map(static fn (string $name): string => preg_quote($name, '/'), array_keys($this->markupNodes)));

        return '/<(?<tag>[a-zA-Z][a-zA-Z0-9-]*+)(?:\s[^\s=>"]++(?:="[^"]*+")?)*?\sdata-type="(?<type>'.$types.')"[^>]*+>.*?<\/(?P=tag)>/su';
    }

    /**
     * The node of every rendered element, per document and in element order, or null for a document with a markup
     * element that does not parse back to one node of its type. Markup elements are parsed first, so text elements are
     * only parsed for documents that are patched.
     *
     * @param  array<array-key, array<int, array<int | string, array{0: string, 1: int}>>>  $found
     * @return array<array-key, array<int, array<string, mixed>> | null>
     */
    protected function parseElements(array $found): array
    {
        if ($this->markupNodes === []) {
            $textNodes = $this->parseTextElements(array_merge(...array_values($found)));
            $offset = 0;

            foreach ($found as $key => $elements) {
                $found[$key] = array_slice($textNodes, $offset, count($elements));
                $offset += count($elements);
            }

            return $found;
        }

        $markupElements = [];

        foreach ($found as $elements) {
            foreach ($elements as $element) {
                if (isset($this->markupNodes[$element['type'][0]])) {
                    $markupElements[] = $element;
                }
            }
        }

        $markupNodes = $this->parseMarkupElements($markupElements);
        $position = 0;
        $nodes = [];
        $textElements = [];

        foreach ($found as $key => $elements) {
            $documentNodes = [];
            $documentTextElements = [];

            foreach ($elements as $element) {
                if (isset($this->markupNodes[$element['type'][0]])) {
                    $documentNodes[] = $markupNodes[$position++];
                } else {
                    $documentNodes[] = false;
                    $documentTextElements[] = $element;
                }
            }

            if (in_array(null, $documentNodes, true)) {
                $nodes[$key] = null;
            } else {
                $nodes[$key] = $documentNodes;
                array_push($textElements, ...$documentTextElements);
            }
        }

        $textNodes = $this->parseTextElements($textElements);
        $position = 0;

        foreach ($nodes as $key => $documentNodes) {
            foreach ($documentNodes ?? [] as $index => $node) {
                if ($node === false) {
                    $nodes[$key][$index] = $textNodes[$position++];
                }
            }
        }

        return $nodes;
    }

    /**
     * Every text element in the batch, parsed in a single call.
     *
     * @param  array<int, array<int | string, array{0: string, 1: int}>>  $elements
     * @return array<int, array<string, mixed>>
     */
    protected function parseTextElements(array $elements): array
    {
        if ($elements === []) {
            return [];
        }

        $html = '';
        $types = [];

        foreach ($elements as $element) {
            $html .= $element[0][0];
            $types[] = $element['type'][0];
        }

        $nodes = (new HtmlParser($this->schema))->parse($html)['content'];

        if (count($nodes) !== count($types) || array_column($nodes, 'type') !== $types) {
            $plugins = implode(', ', array_unique(array_intersect_key($this->renderedNodes, array_flip($types))));

            throw new LogicException('Stored HTML for the rendered nodes ['.implode(', ', array_unique($types))."] did not parse back to those nodes. The editor plugins [{$plugins}] must render each one as a single element with only text inside.");
        }

        return $nodes;
    }

    /**
     * Every markup element in the batch, parsed in a single call, or one by one when that does not give one node of
     * the right type per element. An element that does not parse back on its own gives null.
     *
     * @param  array<int, array<int | string, array{0: string, 1: int}>>  $elements
     * @return array<int, array<string, mixed> | null>
     */
    protected function parseMarkupElements(array $elements): array
    {
        if ($elements === []) {
            return [];
        }

        $parser = new HtmlParser($this->schema);
        $types = array_map(static fn (array $element): string => $element['type'][0], $elements);
        $nodes = $parser->parse(implode('', array_map(static fn (array $element): string => $element[0][0], $elements)))['content'];

        if (count($nodes) === count($types) && array_column($nodes, 'type') === $types) {
            return $nodes;
        }

        return array_map(static function (array $element) use ($parser): ?array {
            $nodes = $parser->parse($element[0][0])['content'];

            return count($nodes) === 1 && ($nodes[0]['type'] ?? null) === $element['type'][0] ? $nodes[0] : null;
        }, $elements);
    }

    /**
     * One small document per source document, holding its rendered nodes in order: block nodes directly, and each run
     * of inline nodes in a wrapper paragraph. Alongside, for each document, which of its top-level nodes are wrappers.
     *
     * @param  array<array-key, array<int, array<string, mixed>>>  $nodes
     * @return array{0: array<array-key, array<string, mixed>>, 1: array<array-key, array<int, bool>>}
     */
    protected function standIns(array $nodes): array
    {
        $standIns = [];
        $wrappers = [];

        foreach ($nodes as $key => $documentNodes) {
            $content = [];
            $isWrapper = [];

            foreach ($documentNodes as $node) {
                if (! ($this->schema->node($node['type'])?->isInline() ?? false)) {
                    $content[] = $node;
                    $isWrapper[] = false;
                } elseif (end($isWrapper) === true) {
                    $content[array_key_last($content)]['content'][] = $node;
                } else {
                    $content[] = ['type' => 'paragraph', 'content' => [$node]];
                    $isWrapper[] = true;
                }
            }

            $standIns[$key] = ['type' => 'doc', 'content' => $content];
            $wrappers[$key] = $isWrapper;
        }

        return [$standIns, $wrappers];
    }

    /**
     * The prepared nodes of a stand-in document, one per rendered element, in order.
     *
     * @param  array<string, mixed>  $document
     * @param  array<int, bool>  $wrappers
     * @return array<int, array<string, mixed>>
     */
    protected function flatten(array $document, array $wrappers): array
    {
        $nodes = [];

        foreach (array_values($document['content'] ?? []) as $index => $node) {
            if ($wrappers[$index] ?? false) {
                array_push($nodes, ...array_values($node['content'] ?? []));
            } else {
                $nodes[] = $node;
            }
        }

        return $nodes;
    }

    /**
     * @param  array<int, array<int | string, array{0: string, 1: int}>>  $elements
     * @param  array<int, array<string, mixed>>  $nodes
     */
    protected function substitute(string $html, array $elements, array $nodes, HtmlSerializer $serializer): string
    {
        $nodes = array_values($nodes);

        if (count($nodes) !== count($elements)) {
            throw new LogicException('An editor plugin that patches rendered HTML must keep every rendered node it is given.');
        }

        $patched = '';
        $cursor = 0;

        foreach ($elements as $index => $element) {
            [$text, $offset] = $element[0];

            $patched .= substr($html, $cursor, $offset - $cursor).$serializer->serialize(['type' => 'doc', 'content' => [$nodes[$index]]]);
            $cursor = $offset + strlen($text);
        }

        return $patched.substr($html, $cursor);
    }
}

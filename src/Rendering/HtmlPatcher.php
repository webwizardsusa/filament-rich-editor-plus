<?php

namespace Hollyit\RichEditorPlus\Rendering;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Plugins\Contracts\PatchesRenderedHtml;
use Hollyit\RichEditorPlus\Plugins\Contracts\PreparesRenderedContent;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use LogicException;
use RuntimeException;

/**
 * Renders stored HTML for display by refreshing only the nodes plugins fill in at render time, such as mentions, and
 * passing every other byte through. Plugins still make each lookup once for the whole batch.
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
        if ($this->renderedNodes === []) {
            return $htmlDocuments;
        }

        $pattern = $this->pattern();
        $found = [];

        foreach ($htmlDocuments as $key => $html) {
            $count = preg_match_all($pattern, $html, $elements, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);

            if ($count === false) {
                throw new RuntimeException('Stored rich content could not be patched: '.preg_last_error_msg().'.');
            }

            if ($count > 0) {
                $found[$key] = $elements;
            }
        }

        if ($found === []) {
            return $htmlDocuments;
        }

        $prepared = $this->registry->prepareRenderedContents($this->standIns($found));
        $serializer = new HtmlSerializer($this->schema);

        foreach ($found as $key => $elements) {
            $htmlDocuments[$key] = $this->substitute($htmlDocuments[$key], $elements, $prepared[$key]['content'][0]['content'] ?? [], $serializer);
        }

        return $htmlDocuments;
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
     * One small document per source document, holding its rendered nodes in order. Every element in the batch is
     * parsed in a single call.
     *
     * @param  array<array-key, array<int, array<int | string, array{0: string, 1: int}>>>  $found
     * @return array<array-key, array<string, mixed>>
     */
    protected function standIns(array $found): array
    {
        $html = '';
        $types = [];

        foreach ($found as $elements) {
            foreach ($elements as $element) {
                $html .= $element[0][0];
                $types[] = $element['type'][0];
            }
        }

        $nodes = (new HtmlParser($this->schema))->parse($html)['content'];

        if (count($nodes) !== count($types) || array_column($nodes, 'type') !== $types) {
            $plugins = implode(', ', array_unique(array_intersect_key($this->renderedNodes, array_flip($types))));

            throw new LogicException('Stored HTML for the rendered nodes ['.implode(', ', array_unique($types))."] did not parse back to those nodes. The editor plugins [{$plugins}] must render each one as a single element with only text inside.");
        }

        $standIns = [];
        $offset = 0;

        foreach ($found as $key => $elements) {
            $standIns[$key] = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => array_slice($nodes, $offset, count($elements))]]];
            $offset += count($elements);
        }

        return $standIns;
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

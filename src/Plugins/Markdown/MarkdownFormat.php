<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown;

use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Content\Contracts\ContentFormat;
use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Contracts\ProvidesMarkdownRules;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Parsing\MarkdownParser;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownSerializer;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkRule;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\Rules\CoreRules;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\Rules\ImageRules;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\Rules\TableRules;
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

/**
 * Markdown (GFM) as a stored format: `RichEditorPlus::make('body')->storeAs(MarkdownFormat::make())`. A plugin is
 * supported when every node and mark it declares has a Markdown rule, it adds no global attributes, and its settings
 * produce nothing Markdown can't hold.
 */
class MarkdownFormat implements ContentFormat
{
    public const int MAX_LENGTH = 1_048_576;

    protected bool $isLenient = false;

    public static function make(): static
    {
        return new static;
    }

    /**
     * Writes nodes without a rule as their text and drops marks without a rule, instead of throwing. For export.
     */
    public function lenient(bool $condition = true): static
    {
        $this->isLenient = $condition;

        return $this;
    }

    public function getId(): string
    {
        return 'markdown';
    }

    public function toDocument(string $content, PluginRegistry $registry): array
    {
        return (new MarkdownParser)->parse($content, $registry);
    }

    public function fromDocument(array $document, PluginRegistry $registry): string
    {
        [$nodeRules, $markRules] = $this->rules($registry->getPlugins());

        return (new MarkdownSerializer($nodeRules, $markRules, ! $this->isLenient))
            ->serialize($document, ContentSchema::fromRegistry($registry));
    }

    public function assertSupports(array $plugins): void
    {
        [$nodeRules, $markRules] = $this->rules($plugins);
        $reasons = [];

        foreach ($plugins as $plugin) {
            $reason = $this->reasonFor($plugin, $nodeRules, $markRules);

            if ($reason !== null) {
                $reasons[class_basename($plugin)] = $reason;
            }
        }

        if ($reasons !== []) {
            throw UnsupportedContentFormatException::forPlugins('Markdown', $reasons);
        }
    }

    public function unsupportedPlugins(array $plugins): array
    {
        [$nodeRules, $markRules] = $this->rules($plugins);

        return array_values(array_filter(
            $plugins,
            fn (EditorPlugin $plugin): bool => $this->reasonFor($plugin, $nodeRules, $markRules) !== null,
        ));
    }

    public function getHiddenTools(): array
    {
        return ['mergeOrSplit', 'toggleHeaderRow', 'imageAlign', 'imageWidth'];
    }

    /**
     * The rules for the core, table and image nodes, and those the plugins add (which win).
     *
     * @param  array<EditorPlugin>  $plugins
     * @return array{0: array<string, NodeRule>, 1: array<string, MarkRule>}
     */
    public function rules(array $plugins): array
    {
        $nodeRules = [...CoreRules::nodes(), ...TableRules::nodes(), ...ImageRules::nodes()];
        $markRules = CoreRules::marks();

        foreach ($plugins as $plugin) {
            if ($plugin instanceof ProvidesMarkdownRules) {
                $nodeRules = [...$nodeRules, ...$plugin->getMarkdownNodeRules()];
                $markRules = [...$markRules, ...$plugin->getMarkdownMarkRules()];
            }
        }

        return [$nodeRules, $markRules];
    }

    /**
     * Why Markdown can't keep this plugin's content, or null when it can.
     *
     * @param  array<string, NodeRule>  $nodeRules
     * @param  array<string, MarkRule>  $markRules
     */
    public function reasonFor(EditorPlugin $plugin, array $nodeRules, array $markRules): ?string
    {
        if ($plugin instanceof TablePlugin && $plugin->isResizable()) {
            return 'column widths: call ->resizable(false)';
        }

        if ($plugin instanceof ImagePlugin) {
            if ($plugin->allowsUploads()) {
                return 'uploads: call ->allowUploads(false)';
            }

            if (! $plugin->allowsUrls()) {
                return 'images need ->allowUrls()';
            }
        }

        if ($plugin instanceof ProvidesGlobalAttributes) {
            foreach ($plugin->getGlobalAttributes() as $attribute) {
                return "no Markdown syntax for {$attribute->getName()}";
            }
        }

        foreach ($plugin->getNodes() as $node) {
            if (! isset($nodeRules[$node->getName()])) {
                return "no Markdown syntax for {$node->getName()}";
            }
        }

        foreach ($plugin->getMarks() as $mark) {
            if (! isset($markRules[$mark->getName()])) {
                return "no Markdown syntax for {$mark->getName()}";
            }
        }

        return null;
    }
}

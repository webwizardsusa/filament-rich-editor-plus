<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use DOMElement;
use InvalidArgumentException;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\PatchesRenderedHtml;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;

/**
 * Inline mentions, with one {@see MentionProvider} per trigger. It is opt-in because it does nothing without providers.
 *
 * Give the renderer this plugin too, or mentions are left out of its output.
 */
class MentionPlugin extends Plugin implements PatchesRenderedHtml
{
    public const string ID = 'core/mention';

    /**
     * @var array<string, MentionProvider>
     */
    protected array $providers = [];

    /**
     * Replaces the providers. Two providers cannot share a trigger.
     *
     * @param  array<MentionProvider | class-string<MentionProvider>>  $providers
     */
    public function providers(array $providers): static
    {
        $this->providers = [];

        foreach ($providers as $provider) {
            $provider = $this->resolveProvider($provider);

            if (array_key_exists($provider->getTrigger(), $this->providers)) {
                throw new InvalidArgumentException("The mention trigger [{$provider->getTrigger()}] is used more than once.");
            }

            $this->providers[$provider->getTrigger()] = $provider;
        }

        return $this;
    }

    /**
     * Adds providers, replacing any with the same trigger. Registries are rebuilt often and `extendPlugin()` callbacks
     * run each time, so adding a trigger again cannot be an error.
     *
     * @param  array<MentionProvider | class-string<MentionProvider>>  $providers
     */
    public function addProviders(array $providers): static
    {
        foreach ($providers as $provider) {
            $provider = $this->resolveProvider($provider);

            $this->providers[$provider->getTrigger()] = $provider;
        }

        return $this;
    }

    /**
     * @return array<string, MentionProvider>
     */
    public function getProviders(): array
    {
        return $this->providers;
    }

    public function getProvider(string $trigger): ?MentionProvider
    {
        return $this->providers[$trigger] ?? null;
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function getNodes(): array
    {
        $spec = NodeSpec::make('mention')
            ->inline()
            ->atom()
            ->priority(51)
            ->parseUsing(static fn (DOMElement $element): bool => in_array(strtolower($element->tagName), ['span', 'a'], true)
                && $element->getAttribute('data-type') === 'mention');

        foreach (['id', 'label', 'char'] as $name) {
            $spec->attribute(
                $name,
                parse: static fn (DOMElement $element): ?string => $element->hasAttribute("data-{$name}") ? $element->getAttribute("data-{$name}") : null,
                render: static fn (array $attrs): array => in_array($attrs[$name] ?? null, [null, ''], true) ? [] : ["data-{$name}" => $attrs[$name]],
            );
        }

        return [
            $spec
                ->transientAttribute('href', ['http', 'https'])
                ->htmlAttributes(['data-type' => 'mention', 'class' => 'rep-mention'])
                ->renderUsing(fn (array $node, array $attributes): array => [
                    isset($attributes['href']) ? 'a' : 'span',
                    $attributes,
                    $this->formatMention($node),
                ])
                ->textUsing(fn (array $node): string => $this->formatMention($node)),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), [
            'providers' => array_values(array_map(
                static fn (MentionProvider $provider): array => $provider->toJsConfig(),
                $this->providers,
            )),
        ]);
    }

    /**
     * @return array<int, string>
     */
    public function getRenderedNodes(): array
    {
        return ['mention'];
    }

    /**
     * Looks up the labels and URLs of every mention in every document with one call per trigger, so rendering a list
     * of documents costs the same number of lookups as rendering one.
     */
    public function prepareRenderedContents(array $documents): array
    {
        $idsByTrigger = [];

        foreach ($documents as $document) {
            $this->eachMention($document, static function (array $node) use (&$idsByTrigger): array {
                $idsByTrigger[$node['attrs']['char'] ?? '@'][(string) ($node['attrs']['id'] ?? '')] = (string) ($node['attrs']['label'] ?? '');

                return $node;
            });
        }

        $labels = [];
        $urls = [];

        foreach ($idsByTrigger as $trigger => $storedLabels) {
            $trigger = (string) $trigger;
            $provider = $this->getProvider($trigger);

            if (! $provider) {
                continue;
            }

            $ids = array_map('strval', array_keys($storedLabels));

            $found = rescue(static fn (): array => $provider->getLabels($ids), null);
            $labels[$trigger] = $found ?? [];

            // A provider that looks labels up and leaves an id out says the record is gone (or never existed, when the
            // id was forged): the mention keeps its stored label but links nowhere. When the lookup fails, or the
            // provider has no lookup, every mention keeps its link.
            $linkedIds = $found !== null && $provider->looksUpLabels() ? array_keys($found) : $ids;
            $currentLabels = [];

            foreach ($linkedIds as $id) {
                $id = (string) $id;
                $currentLabels[$id] = $labels[$trigger][$id] ?? $storedLabels[$id];
            }

            $urls[$trigger] = rescue(static fn (): array => $provider->getUrls($currentLabels), []);
        }

        foreach ($documents as $key => $document) {
            $documents[$key] = $this->eachMention($document, static function (array $node) use ($labels, $urls): array {
                $trigger = (string) ($node['attrs']['char'] ?? '@');
                $id = (string) ($node['attrs']['id'] ?? '');

                $node['attrs']['label'] = $labels[$trigger][$id] ?? (string) ($node['attrs']['label'] ?? '');

                // A stored document comes from the browser, so an `href` in it cannot be trusted. Only the provider sets one.
                unset($node['attrs']['href']);

                if (isset($urls[$trigger][$id])) {
                    $node['attrs']['href'] = $urls[$trigger][$id];
                }

                return $node;
            });
        }

        return $documents;
    }

    /**
     * @param  array<string, mixed>  $node
     */
    protected function formatMention(array $node): string
    {
        $char = $node['attrs']['char'] ?? '@';
        $label = $node['attrs']['label'] ?? '';

        $trigger = is_scalar($char) ? (string) $char : '@';
        $label = is_scalar($label) ? (string) $label : '';

        return $this->getProvider($trigger)?->formatLabel($label) ?? "{$trigger}{$label}";
    }

    /**
     * Applies a callback to every mention in a document, however deeply it is nested.
     *
     * @param  array<string, mixed>  $node
     * @param  callable(array<string, mixed>): array<string, mixed>  $callback
     * @return array<string, mixed>
     */
    protected function eachMention(array $node, callable $callback): array
    {
        if (($node['type'] ?? null) === 'mention') {
            return $callback($this->withScalarAttributes($node));
        }

        if (! is_array($node['content'] ?? null)) {
            return $node;
        }

        foreach ($node['content'] as $index => $child) {
            if (is_array($child)) {
                $node['content'][$index] = $this->eachMention($child, $callback);
            }
        }

        return $node;
    }

    /**
     * A stored document comes from the browser, so its attributes can be any shape.
     *
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    protected function withScalarAttributes(array $node): array
    {
        $attributes = is_array($node['attrs'] ?? null) ? $node['attrs'] : [];

        $node['attrs'] = array_filter($attributes, static fn (mixed $value): bool => is_scalar($value) || $value === null);

        return $node;
    }

    /**
     * @param  MentionProvider | class-string<MentionProvider>  $provider
     */
    protected function resolveProvider(MentionProvider|string $provider): MentionProvider
    {
        return is_string($provider) ? $provider::make() : $provider;
    }
}

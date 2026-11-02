<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;

/**
 * Prototype: refreshes the mentions in storable HTML without parsing the rest of the document. It mirrors
 * {@see MentionPlugin::prepareRenderedContents()}: one label and one URL lookup per trigger for the whole batch, the
 * stored label when the entity is gone, and a link only from the provider.
 */
class MentionPatcher
{
    /**
     * A mention element in storable HTML. Label text is escaped, so it never contains `<`.
     */
    protected const string PATTERN = '/<span\b[^>]*\sdata-type="mention"[^>]*>[^<]*<\/span>/';

    protected HtmlSerializer $serializer;

    protected ?MentionPlugin $mentions;

    /**
     * @param  array<EditorPlugin>  $plugins
     */
    public function __construct(array $plugins)
    {
        $registry = PluginRegistry::make($plugins);
        $plugin = $registry->getPlugins()[MentionPlugin::ID] ?? null;

        $this->serializer = new HtmlSerializer(ContentSchema::fromRegistry($registry));
        $this->mentions = $plugin instanceof MentionPlugin ? $plugin : null;
    }

    /**
     * @param  array<array-key, string>  $html  storable HTML
     * @return array<array-key, string> display HTML, with the same keys
     */
    public function patchMany(array $html): array
    {
        $storedLabels = [];

        foreach ($html as $fragment) {
            preg_match_all(self::PATTERN, $fragment, $matches);

            foreach ($matches[0] as $element) {
                $attributes = $this->attributes($element);
                $storedLabels[$attributes['char'] ?? '@'][$attributes['id'] ?? ''] = $attributes['label'] ?? '';
            }
        }

        [$labels, $urls] = $this->lookup($storedLabels);

        return array_map(
            fn (string $fragment): string => (string) preg_replace_callback(
                self::PATTERN,
                fn (array $match): string => $this->render($this->attributes($match[0]), $labels, $urls),
                $fragment,
            ),
            $html,
        );
    }

    /**
     * @param  array<string, array<string, string>>  $storedLabels  `trigger => [id => stored label]`
     * @return array{0: array<string, array<string, string>>, 1: array<string, array<string, string>>}
     */
    protected function lookup(array $storedLabels): array
    {
        $labels = [];
        $urls = [];

        foreach ($storedLabels as $trigger => $stored) {
            $trigger = (string) $trigger;
            $provider = $this->mentions?->getProvider($trigger);

            if (! $provider) {
                continue;
            }

            $ids = array_map('strval', array_keys($stored));
            $labels[$trigger] = rescue(static fn (): array => $provider->getLabels($ids), []);

            $currentLabels = [];

            foreach ($ids as $id) {
                $currentLabels[$id] = $labels[$trigger][$id] ?? $stored[$id];
            }

            $urls[$trigger] = rescue(static fn (): array => $provider->getUrls($currentLabels), []);
        }

        return [$labels, $urls];
    }

    /**
     * @param  array<string, string>  $attributes
     * @param  array<string, array<string, string>>  $labels
     * @param  array<string, array<string, string>>  $urls
     */
    protected function render(array $attributes, array $labels, array $urls): string
    {
        $trigger = $attributes['char'] ?? '@';
        $id = $attributes['id'] ?? '';

        $attributes['label'] = $labels[$trigger][$id] ?? ($attributes['label'] ?? '');

        if (isset($urls[$trigger][$id])) {
            $attributes['href'] = $urls[$trigger][$id];
        }

        return $this->serializer->serialize(['type' => 'doc', 'content' => [['type' => 'mention', 'attrs' => $attributes]]]);
    }

    /**
     * The `data-id`, `data-label` and `data-char` values of a mention's opening tag, unescaped. Any other attribute,
     * such as an `href` someone stored, is ignored.
     *
     * @return array<string, string>
     */
    protected function attributes(string $element): array
    {
        $openingTag = strstr($element, '>', true) ?: $element;

        preg_match_all('/\sdata-(id|label|char)="([^"]*)"/', $openingTag, $matches, PREG_SET_ORDER);

        $attributes = [];

        foreach ($matches as [, $name, $value]) {
            $attributes[$name] = htmlspecialchars_decode($value, ENT_COMPAT);
        }

        return $attributes;
    }
}

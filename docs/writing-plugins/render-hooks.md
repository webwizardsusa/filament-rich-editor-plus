---
title: Render hooks
weight: 100
description: Fill in data when content is rendered, keep stored HTML fast to render, rewrite the rendered HTML, and add CSS to the editor.
---

When content is rendered for display, plugins can take part at two points: before rendering, to change the
**documents** (fill in data looked up on the server), and after, to change the **HTML** (such as highlighting code).
Both get every document of a render at once, so a lookup is made once for a whole batch.

| Interface | Runs on | Use it to |
|---|---|---|
| `PreparesRenderedContent` | documents, before rendering | Fill in data, such as current labels or URLs |
| `PatchesRenderedHtml` | (adds to the above) | Keep stored HTML fast to render while doing so |
| `PatchesRenderedMarkup` | (adds to the above) | The same, for nodes whose element contains markup |
| `TransformsRenderedHtml` | HTML, after rendering | Rewrite the finished HTML |
| `ProvidesEditorStyles` | the editor | Add CSS the content needs inside the editor |

Plugins run in [priority](plugin-class.md#dependencies-and-priority) order. None of them changes stored content.

## Filling in data at render time

`PreparesRenderedContent::prepareRenderedContents(array $documents): array` gets every document being rendered, keyed
as the caller keyed them, and returns them with the **same keys in the same order** (anything else throws a
`LogicException`). It runs for `toHtml()`, `toText()`, `toMarkdown()` and `toFormat()`, but not for `toStorableHtml()`
or `toArray()`, which show the content as stored.

The mention plugin uses it to refresh labels and add links; the image plugin to turn a disk and path into a URL. A
node whose value only exists at render time declares it as a
[transient attribute](schema.md#attributes), so it is never parsed from or written to stored HTML.

An inline node showing a product's current price, refreshed with one query per render:

```php
use App\Models\Product;
use DOMElement;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\PatchesRenderedHtml;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;

class PricePlugin extends Plugin implements PatchesRenderedHtml
{
    public function getId(): string
    {
        return 'acme/price';
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('price')
                ->inline()
                ->atom()
                ->parseUsing(fn (DOMElement $element): bool => strtolower($element->tagName) === 'span'
                    && $element->getAttribute('data-type') === 'price')
                ->attribute('sku', parse: fn (DOMElement $element): ?string => $element->getAttribute('data-sku') ?: null,
                    render: fn (array $attrs): array => ['data-sku' => $attrs['sku'] ?? null])
                ->attribute('label', parse: fn (DOMElement $element): string => $element->textContent,
                    render: fn (): array => [], default: '')
                ->htmlAttributes(['data-type' => 'price'])
                ->renderUsing(fn (array $node, array $attributes): array => ['span', $attributes, (string) ($node['attrs']['label'] ?? '')])
                ->textUsing(fn (array $node): string => (string) ($node['attrs']['label'] ?? '')),
        ];
    }

    public function getRenderedNodes(): array
    {
        return ['price'];
    }

    public function prepareRenderedContents(array $documents): array
    {
        $skus = [];
        array_walk_recursive($documents, function (mixed $value, string|int $key) use (&$skus): void {
            if ($key === 'sku' && is_string($value)) {
                $skus[$value] = true;
            }
        });

        $prices = Product::query()->whereIn('sku', array_keys($skus))->pluck('price_label', 'sku')->all();

        return array_map(fn (array $document): array => $this->fill($document, $prices), $documents);
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  array<string, string>  $prices
     * @return array<string, mixed>
     */
    protected function fill(array $node, array $prices): array
    {
        if (($node['type'] ?? null) === 'price' && isset($prices[$node['attrs']['sku'] ?? ''])) {
            $node['attrs']['label'] = $prices[$node['attrs']['sku']];
        }

        if (isset($node['content']) && is_array($node['content'])) {
            $node['content'] = array_map(fn (array $child): array => $this->fill($child, $prices), $node['content']);
        }

        return $node;
    }

    // getJsExtension()...
}
```

## Keeping stored HTML fast

Stored HTML is normally rendered by **patching**: only the elements plugins fill in are rebuilt, and every other byte
is printed as stored. A plugin that implements `PreparesRenderedContent` alone can't say which elements it changes,
so while it is on a field, every HTML document is parsed whole and rendered from the document. That is correct, but
slower.

Implement `PatchesRenderedHtml` instead (it extends `PreparesRenderedContent`) and name the nodes you refresh in
`getRenderedNodes()`, as the price plugin above does. The renderer then finds just those elements in the stored HTML,
parses them into nodes, hands them to your `prepareRenderedContents()`, and splices the re-rendered elements back.

Each declared node must:

- be an atom, rendered as a single element marked `data-type="<node name>"`,
- have only text inside that element,
- be the only thing your `prepareRenderedContents()` changes.

### Nodes with markup inside

A node whose element contains markup, such as an image's `<figure>` with an `<img>` and a `<figcaption>`, implements
`PatchesRenderedMarkup` (which extends `PatchesRenderedHtml`) and also returns those node names from
`getRenderedMarkupNodes()`. Each must also be in `getRenderedNodes()`.

The patcher finds such an element from its opening tag, which carries `data-type="<node name>"`, to the first closing
tag of the same name. So:

- the element must never contain another element with its own tag name (a `<figure>` must not hold a `<figure>`). A
  document where one does, or where an element isn't closed, is rendered by parsing the whole document;
- a document whose element doesn't parse back to exactly one node of that type, such as hand-edited markup, is rendered
  by parsing the whole document too. Other documents in the same batch are still patched.

Either way, a batch costs at most two calls to each plugin.

## Rewriting rendered HTML

A plugin that needs to change the finished HTML implements `TransformsRenderedHtml`:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\TransformsRenderedHtml;

class ExternalLinksPlugin extends Plugin implements TransformsRenderedHtml
{
    public function transformRenderedHtml(array $htmls): array
    {
        return array_map(
            fn (string $html): string => str_replace('<a href="http', '<a class="external" href="http', $html),
            $htmls,
        );
    }

    // getId(), getJsExtension()...
}
```

- It gets every piece of HTML in a render at once, after patching or serializing, and returns them with the same keys
  in the same order.
- It runs only for display (`toHtml()`, single or batch), never for `toStorableHtml()` or another format.
- Its output is printed as it is, so escape anything you add.

The [Rich Editor Plus Code](docs:rich-editor-plus-code/introduction) plugin uses it to highlight code blocks on the
server. For such plugins, a Markdown code fence with more than a language (```` ```php showLineNumbers ````) keeps its
whole info string in `data-info` on the `<code>`.

## CSS in the editor

A plugin whose content needs CSS inside the editor, such as palette classes or widths from its settings, implements
`ProvidesEditorStyles`:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesEditorStyles;

public function getEditorStyles(): string
{
    return implode("\n", array_map(
        fn (string $name, string $color): string => ".callout-{$name}{border-color:{$color}}",
        array_keys($this->colors),
        $this->colors,
    ));
}
```

The field prints it in a `<style>` element, also when the field is disabled, so return only CSS built from values you
have validated: it is printed as it is.

CSS that doesn't depend on settings belongs in your package's stylesheet instead (see [assets](assets.md)). To let
pages that display content use the same rules, give the plugin a public `getStylesheet()` method that returns them, as
the built-in plugins do, and document it.

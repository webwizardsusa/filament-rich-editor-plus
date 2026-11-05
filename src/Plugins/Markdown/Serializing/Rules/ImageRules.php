<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\Rules;

use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownWriter;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;

/**
 * Images at a URL as `![alt](url "caption")`. Alignment and width have no Markdown form. Images stored on a disk have
 * no URL to write: strict writing refuses them, lenient writing uses the URL the renderer resolved (`src`) or the alt
 * text. An image whose URL isn't http(s) or relative (`javascript:`, `data:`) is written as its alt text.
 */
class ImageRules
{
    /**
     * @return array<string, NodeRule>
     */
    public static function nodes(): array
    {
        return [
            'image' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $attrs = $node['attrs'] ?? [];
                $url = $attrs['url'] ?? null;

                if (! is_string($url) || $url === '') {
                    if ($writer->isStrict()) {
                        throw new UnsupportedContentFormatException("Markdown can't write images stored on a disk.");
                    }

                    $url = is_string($attrs['src'] ?? null) ? $attrs['src'] : null;
                }

                $alt = (string) ($attrs['alt'] ?? '');

                if ($url === null || ! $writer->isAllowedUrl($url, 'image', 'url', ['http', 'https'])) {
                    $writer->write($writer->escape($alt));

                    return;
                }

                $alt = $writer->escape($alt);

                $writer->write('!['.$alt.']('.$writer->linkDestination($url).$writer->linkTitle((string) ($attrs['caption'] ?? '')).')');
            }),
        ];
    }
}

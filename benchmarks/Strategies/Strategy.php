<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Strategies;

use Webwizardsusa\RichEditorPlus\Benchmarks\DocumentStore;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusBatchRenderer;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

abstract class Strategy implements ContentStrategy
{
    public function __construct(protected DocumentStore $store) {}

    public function mentionableChanged(string $id): void {}

    /**
     * @param  string | array<string, mixed> | null  $content
     */
    protected function renderer(string|array|null $content): RichContentPlusRenderer
    {
        return RichContentPlusRenderer::make($content)->plugins($this->store->plugins());
    }

    /**
     * @param  array<array-key, string | array<string, mixed> | null>  $contents
     */
    protected function batch(array $contents): RichContentPlusBatchRenderer
    {
        return RichContentPlusRenderer::many($contents)->plugins($this->store->plugins());
    }
}

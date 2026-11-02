<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusBatchRenderer;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;

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

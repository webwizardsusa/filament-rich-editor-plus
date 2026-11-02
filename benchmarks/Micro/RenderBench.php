<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Micro;

use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use PhpBench\Attributes\BeforeMethods;
use PhpBench\Attributes\ParamProviders;

#[BeforeMethods('setUp')]
#[ParamProviders('provideShapes')]
class RenderBench extends MicroBench
{
    /**
     * @var array<string, mixed>
     */
    protected array $document;

    /**
     * @param  array{shape: string}  $params
     */
    public function setUp(array $params): void
    {
        $this->boot();
        $this->document = $this->factory->make($params['shape']);
    }

    public function benchToHtml(): void
    {
        RichContentPlusRenderer::make($this->document)->plugins($this->plugins)->toHtml();
    }

    public function benchToStorableHtml(): void
    {
        RichContentPlusRenderer::make($this->document)->plugins($this->plugins)->toStorableHtml();
    }

    public function benchToText(): void
    {
        RichContentPlusRenderer::make($this->document)->plugins($this->plugins)->toText();
    }
}

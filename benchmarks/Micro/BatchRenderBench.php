<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Micro;

use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use PhpBench\Attributes\BeforeMethods;
use PhpBench\Attributes\ParamProviders;

#[BeforeMethods('setUp')]
#[ParamProviders(['provideShapes', 'provideBatchSizes'])]
class BatchRenderBench extends MicroBench
{
    /**
     * @var array<int, array<string, mixed>>
     */
    protected array $documents = [];

    /**
     * @param  array{shape: string, size: int}  $params
     */
    public function setUp(array $params): void
    {
        $this->boot();
        $this->documents = array_map(fn (): array => $this->factory->make($params['shape']), range(1, $params['size']));
    }

    public function benchMany(): void
    {
        RichContentPlusRenderer::many($this->documents)->plugins($this->plugins)->toHtml();
    }
}

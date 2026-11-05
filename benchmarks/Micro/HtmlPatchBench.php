<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Micro;

use PhpBench\Attributes\BeforeMethods;
use PhpBench\Attributes\ParamProviders;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

#[BeforeMethods('setUp')]
#[ParamProviders(['provideShapes', 'provideBatchSizes'])]
class HtmlPatchBench extends MicroBench
{
    /**
     * @var array<int, string>
     */
    protected array $html = [];

    /**
     * @param  array{shape: string, size: int}  $params
     */
    public function setUp(array $params): void
    {
        $this->boot();
        $this->html = array_map(
            fn (): string => RichContentPlusRenderer::make($this->factory->make($params['shape']))->plugins($this->plugins)->toStorableHtml(),
            range(1, $params['size']),
        );
    }

    public function benchPatch(): void
    {
        RichContentPlusRenderer::many($this->html)->plugins($this->plugins)->toHtml();
    }
}

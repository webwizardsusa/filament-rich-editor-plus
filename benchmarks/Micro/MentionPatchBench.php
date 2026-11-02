<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Micro;

use Hollyit\RichEditorPlus\Benchmarks\Strategies\MentionPatcher;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use PhpBench\Attributes\BeforeMethods;
use PhpBench\Attributes\ParamProviders;

#[BeforeMethods('setUp')]
#[ParamProviders(['provideShapes', 'provideBatchSizes'])]
class MentionPatchBench extends MicroBench
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
        (new MentionPatcher($this->plugins))->patchMany($this->html);
    }
}

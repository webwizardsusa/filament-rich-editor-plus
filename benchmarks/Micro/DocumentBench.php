<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Micro;

use PhpBench\Attributes\BeforeMethods;
use PhpBench\Attributes\ParamProviders;
use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

#[BeforeMethods('setUp')]
#[ParamProviders('provideShapes')]
class DocumentBench extends MicroBench
{
    protected string $json;

    protected string $html;

    protected ContentSchema $schema;

    /**
     * @param  array{shape: string}  $params
     */
    public function setUp(array $params): void
    {
        $this->boot();

        $document = $this->factory->make($params['shape']);

        $this->json = json_encode($document, JSON_THROW_ON_ERROR);
        $this->html = RichContentPlusRenderer::make($document)->plugins($this->plugins)->toStorableHtml();
        $this->schema = ContentSchema::fromRegistry(PluginRegistry::make($this->plugins));
    }

    public function benchFromJson(): void
    {
        RichContentPlusRenderer::toDocument($this->json, $this->schema);
    }

    public function benchFromStoredHtml(): void
    {
        RichContentPlusRenderer::toDocument($this->html, $this->schema);
    }
}

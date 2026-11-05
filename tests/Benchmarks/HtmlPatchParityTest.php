<?php

use Webwizardsusa\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures\DocumentFactory;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

it('renders patched stored HTML exactly as the document and the parse path do, after renames', function (string $shape): void {
    $names = [];
    $renamed = [];

    for ($id = 1; $id <= 50; $id++) {
        $names[$id] = "Person {$id}";
        $renamed[$id] = "Renamed {$id} & <i>\"Ó'Neil\"</i>";
    }

    unset($renamed[7]);

    $document = (new DocumentFactory(3, $names))->make($shape);
    $stored = RichContentPlusRenderer::make($document)->plugins(BenchmarkPlugins::make(BenchmarkPlugins::inMemoryMentions($names)))->toStorableHtml();
    $plugins = BenchmarkPlugins::make(BenchmarkPlugins::inMemoryMentions($renamed));

    $patched = RichContentPlusRenderer::make($stored)->plugins($plugins)->toHtml();

    expect($patched)
        ->toBe(RichContentPlusRenderer::make($stored)->plugins($plugins)->parseHtml()->toHtml())
        ->toBe(RichContentPlusRenderer::make($document)->plugins($plugins)->toHtml());
})->with(DocumentFactory::SHAPES);

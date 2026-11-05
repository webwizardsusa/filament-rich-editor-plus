<?php

use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\Support\DocumentFactory;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

/**
 * The editor's default plugins plus mentions of the given people.
 *
 * @param  array<int, string>  $names  `id => name`
 * @return array<EditorPlugin>
 */
function parityPluginsMentioning(array $names): array
{
    $mentions = MentionProvider::make('@')
        ->items($names)
        ->getUrlUsing(static fn (string $id): string => "/people/{$id}");

    return PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [
        MentionPlugin::make()->providers([$mentions]),
    ]);
}

it('renders patched stored HTML exactly as the document and the parse path do, after renames', function (string $shape): void {
    $names = [];
    $renamed = [];

    for ($id = 1; $id <= 50; $id++) {
        $names[$id] = "Person {$id}";
        $renamed[$id] = "Renamed {$id} & <i>\"Ó'Neil\"</i>";
    }

    unset($renamed[7]);

    $document = (new DocumentFactory(3, $names))->make($shape);
    $stored = RichContentPlusRenderer::make($document)->plugins(parityPluginsMentioning($names))->toStorableHtml();
    $plugins = parityPluginsMentioning($renamed);

    $patched = RichContentPlusRenderer::make($stored)->plugins($plugins)->toHtml();

    expect($patched)
        ->toBe(RichContentPlusRenderer::make($stored)->plugins($plugins)->parseHtml()->toHtml())
        ->toBe(RichContentPlusRenderer::make($document)->plugins($plugins)->toHtml());
})->with(DocumentFactory::SHAPES);

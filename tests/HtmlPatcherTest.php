<?php

use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Plugins\Contracts\PatchesRenderedHtml;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Rendering\HtmlPatcher;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

/**
 * @param  array<int | string, string>  $names
 */
function htmlPatchProvider(array $names): MentionProvider
{
    return MentionProvider::make('@')->items($names)->getUrlUsing(static fn (string $id): string => "/people/{$id}");
}

/**
 * @return array<EditorPlugin>
 */
function htmlPatchPlugins(MentionProvider $provider): array
{
    return PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [MentionPlugin::make()->providers([$provider])]);
}

/**
 * @param  array<int, array<string, mixed>>  $inline
 * @return array<string, mixed>
 */
function htmlPatchDocument(array $inline): array
{
    return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => $inline]]];
}

/**
 * @return array<string, mixed>
 */
function htmlPatchMention(string $id, string $label, string $char = '@'): array
{
    return ['type' => 'mention', 'attrs' => ['id' => $id, 'label' => $label, 'char' => $char]];
}

/**
 * Stores the document as storable HTML, then patches it with the given provider.
 *
 * @param  array<string, mixed>  $document
 * @return array{0: string, 1: string} The patched HTML, and what the document renders to on the JSON path.
 */
function htmlPatchAndRender(array $document, MentionProvider $provider): array
{
    $plugins = htmlPatchPlugins($provider);
    $stored = RichContentPlusRenderer::make($document)->plugins($plugins)->toStorableHtml();

    return [
        (new HtmlPatcher(PluginRegistry::make($plugins)))->patch(['doc' => $stored])['doc'],
        RichContentPlusRenderer::make($document)->plugins($plugins)->toHtml(),
    ];
}

class ChipPatchTestPlugin extends Plugin implements PatchesRenderedHtml
{
    /**
     * @var array<int, string>
     */
    public array $renderedNodes = ['chip'];

    public function getId(): string
    {
        return 'test/chip';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getNodes(): array
    {
        return [NodeSpec::make('chip')->inline()->atom()->parseTags(['x-chip'])->htmlAttributes(['data-type' => 'chip'])->renderTag('x-chip')];
    }

    public function getRenderedNodes(): array
    {
        return $this->renderedNodes;
    }

    public function prepareRenderedContents(array $documents): array
    {
        return $documents;
    }
}

it('patches live labels and links into stored HTML exactly as the document renders', function (): void {
    [$patched, $expected] = htmlPatchAndRender(
        htmlPatchDocument([['type' => 'text', 'text' => 'Hi '], htmlPatchMention('1', 'Old name'), ['type' => 'text', 'text' => '!']]),
        htmlPatchProvider([1 => 'Ada Lovelace']),
    );

    expect($patched)->toBe($expected)->toContain('@Ada Lovelace')->toContain('href="/people/1"');
});

it('escapes looked-up labels exactly as the document renders them', function (): void {
    [$patched, $expected] = htmlPatchAndRender(
        htmlPatchDocument([htmlPatchMention('1', 'x'), htmlPatchMention('2', 'y'), htmlPatchMention('3', 'z')]),
        htmlPatchProvider([1 => '<b>Bold</b> & "Bob"', 2 => "Seán O'Brien", 3 => '名前 😀']),
    );

    expect($patched)->toBe($expected)->not->toContain('<b>Bold');
});

it('keeps the stored label for a mention whose entity is gone', function (): void {
    [$patched, $expected] = htmlPatchAndRender(
        htmlPatchDocument([htmlPatchMention('99', 'Gone & Forgotten')]),
        htmlPatchProvider([1 => 'Ada']),
    );

    expect($patched)->toBe($expected)->toContain('@Gone &amp; Forgotten');
});

it('patches mentions inside marks and nested blocks', function (): void {
    $document = ['type' => 'doc', 'content' => [
        ['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => [
            ['type' => 'paragraph', 'content' => [
                ['type' => 'text', 'text' => 'see '],
                [...htmlPatchMention('1', 'a'), 'marks' => [['type' => 'bold']]],
            ]],
            ['type' => 'blockquote', 'content' => [htmlPatchDocument([htmlPatchMention('2', 'b')])['content'][0]]],
        ]]]],
    ]];

    [$patched, $expected] = htmlPatchAndRender($document, htmlPatchProvider([1 => 'Ada', 2 => 'Grace']));

    expect($patched)->toBe($expected);
});

it('leaves mentions with no provider for their trigger unlinked', function (): void {
    [$patched, $expected] = htmlPatchAndRender(
        htmlPatchDocument([htmlPatchMention('1', 'Topic', '#')]),
        htmlPatchProvider([1 => 'Ada']),
    );

    expect($patched)->toBe($expected)->not->toContain('href');
});

it('never keeps an href from the stored markup', function (): void {
    $stored = '<p><a data-id="1" data-label="Ada" data-char="@" href="javascript:alert(1)" data-type="mention" class="rep-mention">@Ada</a></p>';
    $patcher = new HtmlPatcher(PluginRegistry::make(htmlPatchPlugins(MentionProvider::make('@')->items([1 => 'Ada']))));

    expect($patcher->patch([$stored])[0])->not->toContain('javascript')->toContain('<span');
});

it('passes every byte outside rendered nodes through untouched', function (): void {
    $stored = '<p onclick="kept()">Hi <span data-id="1" data-label="Old" data-char="@" data-type="mention" class="rep-mention">@Old</span> <em>there</em></p>';
    $patcher = new HtmlPatcher(PluginRegistry::make(htmlPatchPlugins(htmlPatchProvider([1 => 'Ada']))));

    expect($patcher->patch([$stored])[0])
        ->toStartWith('<p onclick="kept()">Hi <a ')
        ->toContain('>@Ada</a>')
        ->toEndWith(' <em>there</em></p>');
});

it('looks labels up once for a whole batch and keeps its keys', function (): void {
    $lookups = 0;
    $provider = MentionProvider::make('@')->getLabelsUsing(function (array $ids) use (&$lookups): array {
        $lookups++;

        return array_fill_keys($ids, 'Someone');
    });
    $plugins = htmlPatchPlugins($provider);
    $stored = [];

    foreach (['z' => '1', 'a' => '2', 'm' => '3'] as $key => $id) {
        $stored[$key] = RichContentPlusRenderer::make(htmlPatchDocument([htmlPatchMention($id, 'x')]))->plugins($plugins)->toStorableHtml();
    }

    $patched = (new HtmlPatcher(PluginRegistry::make($plugins)))->patch($stored);

    expect($lookups)->toBe(1)
        ->and(array_keys($patched))->toBe(['z', 'a', 'm'])
        ->and($patched['a'])->toContain('@Someone');
});

it('does not prepare documents that have no rendered nodes', function (): void {
    $lookups = 0;
    $provider = MentionProvider::make('@')->getLabelsUsing(function (array $ids) use (&$lookups): array {
        $lookups++;

        return [];
    });

    $patched = (new HtmlPatcher(PluginRegistry::make(htmlPatchPlugins($provider))))->patch(['a' => '<p>plain</p>']);

    expect($patched)->toBe(['a' => '<p>plain</p>'])->and($lookups)->toBe(0);
});

it('returns HTML unchanged when no plugin declares rendered nodes', function (): void {
    $stored = ['<p class="anything">a <span data-type="mention">@x</span></p>'];

    expect((new HtmlPatcher(PluginRegistry::make(PluginRegistry::defaultPlugins())))->patch($stored))->toBe($stored);
});

it('throws instead of rendering when stored HTML is not valid UTF-8', function (): void {
    $patcher = new HtmlPatcher(PluginRegistry::make(htmlPatchPlugins(htmlPatchProvider([1 => 'Ada']))));

    $patcher->patch(["<p>\xC3( <span data-type=\"mention\" data-id=\"1\">@a</span></p>"]);
})->throws(RuntimeException::class);

it('rejects a declared rendered node that is not an atom', function (): void {
    $plugin = ChipPatchTestPlugin::make();
    $plugin->renderedNodes = ['paragraph'];

    new HtmlPatcher(PluginRegistry::make([...PluginRegistry::defaultPlugins(), $plugin]));
})->throws(LogicException::class, 'test/chip');

it('rejects stored HTML that does not parse back to the declared node', function (): void {
    $patcher = new HtmlPatcher(PluginRegistry::make([...PluginRegistry::defaultPlugins(), ChipPatchTestPlugin::make()]));

    $patcher->patch(['<p><span data-type="chip">x</span></p>']);
})->throws(LogicException::class, 'chip');

it('patches only when every preparing plugin declares its rendered nodes', function (): void {
    expect(HtmlPatcher::supports(PluginRegistry::make(htmlPatchPlugins(htmlPatchProvider([])))))->toBeTrue()
        ->and(HtmlPatcher::supports(PluginRegistry::make(PluginRegistry::defaultPlugins())))->toBeTrue();
});

it('patches rendered nodes whose tag has a hyphen', function (): void {
    $patcher = new HtmlPatcher(PluginRegistry::make([...PluginRegistry::defaultPlugins(), ChipPatchTestPlugin::make()]));

    expect($patcher->patch(['<p><x-chip data-type="chip">stale</x-chip></p>'])[0])->toBe('<p><x-chip data-type="chip"></x-chip></p>');
});

it('patches documents with very long attributes without hitting the backtrack limit', function (): void {
    $href = 'https://a.test/?q='.str_repeat('a', 2_000_000);
    $document = htmlPatchDocument([
        ['type' => 'text', 'text' => 'link', 'marks' => [['type' => 'link', 'attrs' => ['href' => $href]]]],
        ['type' => 'text', 'text' => ' '],
        htmlPatchMention('1', 'Old'),
    ]);

    [$patched, $expected] = htmlPatchAndRender($document, htmlPatchProvider([1 => 'Ada']));

    expect($patched)->toBe($expected)->toContain('@Ada');
});

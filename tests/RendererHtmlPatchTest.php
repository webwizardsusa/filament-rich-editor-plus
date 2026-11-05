<?php

use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\PreparesRenderedContent;
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

/**
 * @return array<EditorPlugin>
 */
function routingPlugins(?MentionProvider $provider = null): array
{
    return PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [
        MentionPlugin::make()->providers([$provider ?? MentionProvider::make('@')->items([1 => 'Ada'])]),
    ]);
}

function routingStoredMention(string $label = 'Old'): string
{
    return '<p onclick="kept()">Hi <span data-id="1" data-label="'.$label.'" data-char="@" data-type="mention" class="rep-mention">@'.$label.'</span></p>';
}

class PrepareOnlyRoutingTestPlugin extends Plugin implements PreparesRenderedContent
{
    public function getId(): string
    {
        return 'test/prepare-only';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function prepareRenderedContents(array $documents): array
    {
        return $documents;
    }
}

it('tells stored HTML apart from documents', function (mixed $content, bool $isHtml): void {
    expect(RichContentPlusRenderer::isHtml($content))->toBe($isHtml);
})->with([
    'html' => ['<p>a</p>', true],
    'plain text' => ['just words', true],
    'json document' => ['{"type":"doc","content":[]}', false],
    'json document with leading space' => [' {"type":"doc","content":[]}', false],
    'json that is not a document' => ['{"type":"other"}', true],
    'array' => [['type' => 'doc', 'content' => []], false],
    'empty string' => ['', false],
    'null' => [null, false],
]);

it('renders stored HTML by patching only the live nodes', function (): void {
    expect(RichContentPlusRenderer::make(routingStoredMention())->plugins(routingPlugins())->toHtml())
        ->toBe('<p onclick="kept()">Hi <span data-id="1" data-label="Ada" data-char="@" data-type="mention" class="rep-mention">@Ada</span></p>');
});

it('parses stored HTML instead when asked to', function (): void {
    expect(RichContentPlusRenderer::make(routingStoredMention())->plugins(routingPlugins())->parseHtml()->toHtml())
        ->toBe('<p>Hi <span data-id="1" data-label="Ada" data-char="@" data-type="mention" class="rep-mention">@Ada</span></p>');
});

it('renders documents on the JSON path', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'hi']]]]];

    expect(RichContentPlusRenderer::make($document)->plugins(routingPlugins())->toHtml())->toBe('<p>hi</p>')
        ->and(RichContentPlusRenderer::make(json_encode($document))->plugins(routingPlugins())->toHtml())->toBe('<p>hi</p>');
});

it('parses stored HTML when a plugin prepares content without declaring its rendered nodes', function (): void {
    expect(RichContentPlusRenderer::make('<p onclick="x()">a</p>')->plugins([...PluginRegistry::defaultPlugins(), PrepareOnlyRoutingTestPlugin::make()])->toHtml())
        ->toBe('<p>a</p>');
});

it('passes stored HTML through when no plugin prepares content', function (): void {
    expect(RichContentPlusRenderer::make('<p class="x">a</p>')->toHtml())->toBe('<p class="x">a</p>');
});

it('renders blank content as nothing', function (): void {
    expect(RichContentPlusRenderer::make(null)->toHtml())->toBe('')
        ->and(RichContentPlusRenderer::make('')->plugins(routingPlugins())->toHtml())->toBe('');
});

it('still sanitizes HTML on the way into storage', function (): void {
    expect(RichContentPlusRenderer::make('<p onclick="x()">a</p><script>evil()</script>')->plugins(routingPlugins())->toStorableHtml())
        ->toBe('<p>a</p>');
});

it('renders a batch of JSON, HTML and blank content with its keys in order', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'json']]]]];

    $html = RichContentPlusRenderer::many(['b' => routingStoredMention(), 'a' => $document, 'c' => null, 'd' => json_encode($document)])
        ->plugins(routingPlugins())
        ->toHtml();

    expect(array_keys($html))->toBe(['b', 'a', 'c', 'd'])
        ->and($html['b'])->toContain('onclick="kept()"')->toContain('@Ada')
        ->and($html['a'])->toBe('<p>json</p>')
        ->and($html['c'])->toBe('')
        ->and($html['d'])->toBe('<p>json</p>');
});

it('looks mentions up once for a batch of stored HTML', function (): void {
    $lookups = 0;
    $provider = MentionProvider::make('@')->getLabelsUsing(function (array $ids) use (&$lookups): array {
        $lookups++;

        return array_fill_keys($ids, 'Someone');
    });

    $html = RichContentPlusRenderer::many([routingStoredMention('One'), routingStoredMention('Two')])->plugins(routingPlugins($provider))->toHtml();

    expect($lookups)->toBe(1)->and($html[1])->toContain('@Someone');
});

it('parses a batch of stored HTML when asked to', function (): void {
    $html = RichContentPlusRenderer::many(['x' => routingStoredMention()])->plugins(routingPlugins())->parseHtml()->toHtml();

    expect($html['x'])->not->toContain('onclick')->toContain('@Ada');
});

<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\TextSerializer;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

function mentionSchema(): ContentSchema
{
    return ContentSchema::fromRegistry(PluginRegistry::make([
        MentionPlugin::make()->providers([MentionProvider::make('@'), MentionProvider::make('[[')->displayFormat('[[:label]]')]),
        LinkPlugin::make(),
    ]));
}

function mentionDocument(array $attrs): array
{
    return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'mention', 'attrs' => $attrs]]]]];
}

it('renders a mention as the browser does', function (): void {
    $html = (new HtmlSerializer(mentionSchema()))->serialize(mentionDocument(['id' => '1', 'label' => 'Ada', 'char' => '@']));

    expect($html)->toBe('<p><span data-id="1" data-label="Ada" data-char="@" data-type="mention" class="rep-mention">@Ada</span></p>');
});

it('uses the provider display format and escapes it', function (): void {
    $html = (new HtmlSerializer(mentionSchema()))->serialize(mentionDocument(['id' => '1', 'label' => '<b>', 'char' => '[[']));

    expect($html)->toContain('>[[&lt;b&gt;]]<');
});

it('links a mention only when it has an allowed href, and never in stored HTML', function (): void {
    $linked = mentionDocument(['id' => '1', 'label' => 'Ada', 'char' => '@', 'href' => '/people/1']);
    $unsafe = mentionDocument(['id' => '1', 'label' => 'Ada', 'char' => '@', 'href' => 'javascript:alert(1)']);

    expect((new HtmlSerializer(mentionSchema()))->serialize($linked))->toContain('<a ')->toContain('href="/people/1"')
        ->and((new HtmlSerializer(mentionSchema()))->serialize($unsafe))->toContain('<span')->not->toContain('javascript')
        ->and((new HtmlSerializer(mentionSchema(), forStorage: true))->serialize($linked))->toContain('<span')->not->toContain('/people/1');
});

it('parses a mention from a span or a link, ahead of the link mark', function (string $tag): void {
    $html = "<p><{$tag} href=\"/x\" data-type=\"mention\" data-id=\"0\" data-label=\"Ada\" data-char=\"@\">@Ada</{$tag}></p>";

    expect((new HtmlParser(mentionSchema()))->parse($html)['content'][0]['content'])->toBe([
        ['type' => 'mention', 'attrs' => ['id' => '0', 'label' => 'Ada', 'char' => '@']],
    ]);
})->with(['span', 'a']);

it('uses the formatted label in text', function (): void {
    expect((new TextSerializer(mentionSchema()))->serialize(mentionDocument(['id' => '1', 'label' => 'Ada', 'char' => '[['])))->toBe('[[Ada]]');
});

it('survives malformed mention attributes', function (array $attrs): void {
    expect((new HtmlSerializer(mentionSchema()))->serialize(mentionDocument($attrs)))->toContain('rep-mention')
        ->and((new TextSerializer(mentionSchema()))->serialize(mentionDocument($attrs)))->toBeString();
})->with([
    [['label' => ['x'], 'char' => '@']],
    [['label' => 'Ada', 'char' => ['x']]],
    [[]],
]);

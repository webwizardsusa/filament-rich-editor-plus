<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\StrikethroughPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

function pluginSchema(array $plugins): ContentSchema
{
    return ContentSchema::fromRegistry(PluginRegistry::make($plugins));
}

function pluginHtml(array $document, array $plugins): string
{
    return (new HtmlSerializer(pluginSchema($plugins)))->serialize($document);
}

function pluginParse(string $html, array $plugins): array
{
    return (new HtmlParser(pluginSchema($plugins)))->parse($html);
}

it('adds the document nodes automatically', function (): void {
    $document = pluginParse('<p>a<br>b</p>', []);

    expect($document['content'][0]['content'][1]['type'])->toBe('hardBreak')
        ->and(pluginHtml($document, []))->toBe('<p>a<br>b</p>');
});

it('parses and renders each simple mark', function (string $plugin, string $input, string $name, string $output): void {
    $document = pluginParse("<p>{$input}</p>", [$plugin::make()]);

    expect($document['content'][0]['content'][0]['marks'])->toBe([['type' => $name]])
        ->and(pluginHtml($document, [$plugin::make()]))->toBe("<p>{$output}</p>");
})->with([
    [BoldPlugin::class, '<strong>x</strong>', 'bold', '<strong>x</strong>'],
    [BoldPlugin::class, '<b>x</b>', 'bold', '<strong>x</strong>'],
    [BoldPlugin::class, '<span style="font-weight: 700">x</span>', 'bold', '<strong>x</strong>'],
    [BoldPlugin::class, '<span style="font-weight: bolder">x</span>', 'bold', '<strong>x</strong>'],
    [ItalicPlugin::class, '<em>x</em>', 'italic', '<em>x</em>'],
    [ItalicPlugin::class, '<i>x</i>', 'italic', '<em>x</em>'],
    [ItalicPlugin::class, '<span style="font-style: italic">x</span>', 'italic', '<em>x</em>'],
    [UnderlinePlugin::class, '<u>x</u>', 'underline', '<u>x</u>'],
    [UnderlinePlugin::class, '<span style="text-decoration: underline">x</span>', 'underline', '<u>x</u>'],
    [StrikethroughPlugin::class, '<s>x</s>', 'strike', '<s>x</s>'],
    [StrikethroughPlugin::class, '<del>x</del>', 'strike', '<s>x</s>'],
    [StrikethroughPlugin::class, '<strike>x</strike>', 'strike', '<s>x</s>'],
    [StrikethroughPlugin::class, '<span style="text-decoration: line-through">x</span>', 'strike', '<s>x</s>'],
]);

it('does not treat normal weight or style as a mark', function (string $html): void {
    expect(pluginParse("<p>{$html}</p>", [BoldPlugin::make(), ItalicPlugin::make()])['content'][0]['content'][0])
        ->not->toHaveKey('marks');
})->with([
    '<b style="font-weight: normal">x</b>',
    '<i style="font-style: normal">x</i>',
    '<span style="font-weight: 400">x</span>',
]);

it('renders a link with its defaults', function (): void {
    $html = pluginHtml(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'https://a.test', 'title' => 'T']]]],
    ]]]], [LinkPlugin::make()]);

    expect($html)->toBe('<p><a href="https://a.test" target="_blank" rel="noopener noreferrer nofollow" title="T">x</a></p>');
});

it('leaves out new-tab attributes when links stay in the tab', function (): void {
    $html = pluginHtml(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'https://a.test']]]],
    ]]]], [LinkPlugin::make()->openInNewTab(false)]);

    expect($html)->toBe('<p><a href="https://a.test">x</a></p>');
});

it('parses every link attribute the browser stores', function (): void {
    $document = pluginParse('<p><a href="/x" title="T" class="c">x</a></p>', [LinkPlugin::make()->openInNewTab(false)]);

    expect($document['content'][0]['content'][0]['marks'])->toEqual([[
        'type' => 'link',
        'attrs' => ['href' => '/x', 'target' => null, 'rel' => null, 'class' => 'c', 'title' => 'T'],
    ]]);
});

it('keeps the text of a link with a disallowed protocol, without the link', function (string $href): void {
    $text = pluginParse("<p><a href=\"{$href}\">x</a></p>", [LinkPlugin::make()])['content'][0]['content'][0];

    expect($text)->toBe(['type' => 'text', 'text' => 'x']);
})->with(['javascript:alert(1)', 'java&#9;script:alert(1)', 'data:text/html,x']);

it('uses the configured protocols for links', function (): void {
    $link = fn (string $href): array => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'link', 'attrs' => ['href' => $href]]]],
    ]]]];

    expect(pluginHtml($link('tel:123'), [LinkPlugin::make()]))->toContain('href="tel:123"')
        ->and(pluginHtml($link('tel:123'), [LinkPlugin::make()->protocols(['https'])]))->not->toContain('tel:')
        ->and(pluginHtml($link('javascript:alert(1)'), [LinkPlugin::make()]))->not->toContain('javascript');
});

it('dedupes specs shared between plugins, first one wins', function (): void {
    RichEditorPlus::extendPlugin('core/bold', fn (PluginExtension $extension) => $extension
        ->addNodes([NodeSpec::make('paragraph')->renderTag('div')])
        ->addMarks([MarkSpec::make('highlight')->parseTags(['mark'])->renderTag('mark'), MarkSpec::make('bold')->renderTag('b')]));

    $registry = PluginRegistry::make([BoldPlugin::make()]);
    $marks = array_map(fn (MarkSpec $mark): string => $mark->getName(), $registry->getMarks());
    $nodes = array_map(fn (NodeSpec $node): string => $node->getName(), $registry->getNodes());

    expect(array_count_values($marks)['bold'])->toBe(1)
        ->and($marks)->toContain('highlight')
        ->and(array_count_values($nodes)['paragraph'])->toBe(1)
        ->and(pluginHtml(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'bold']]]]]]], [BoldPlugin::make()]))
        ->toBe('<p><strong>x</strong></p>');
});

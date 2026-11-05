<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\CodeBlockPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DividerPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

function blockSchema(array $plugins): ContentSchema
{
    return ContentSchema::fromRegistry(PluginRegistry::make($plugins));
}

function blockHtml(array $plugins, array ...$content): string
{
    return (new HtmlSerializer(blockSchema($plugins)))->serialize(['type' => 'doc', 'content' => $content]);
}

function blockParse(string $html, array $plugins): array
{
    return (new HtmlParser(blockSchema($plugins)))->parse($html)['content'];
}

function blockText(string $text): array
{
    return ['type' => 'text', 'text' => $text];
}

it('renders and parses a blockquote', function (): void {
    $html = blockHtml([BlockquotePlugin::make()], ['type' => 'blockquote', 'content' => [['type' => 'paragraph', 'content' => [blockText('a')]]]]);

    expect($html)->toBe('<blockquote><p>a</p></blockquote>')
        ->and(blockParse($html, [BlockquotePlugin::make()])[0]['type'])->toBe('blockquote');
});

it('renders and parses enabled heading levels', function (): void {
    $plugins = [HeadingPlugin::make()->levels([2, 4])];
    $heading = ['type' => 'heading', 'attrs' => ['level' => 4], 'content' => [blockText('a')]];

    expect(blockHtml($plugins, $heading))->toBe('<h4>a</h4>')
        ->and(blockParse('<h4>a</h4>', $plugins))->toBe([$heading]);
});

it('unwraps a disabled heading level, because parsing does not repair structure', function (): void {
    expect(blockParse('<h1>a</h1>', [HeadingPlugin::make()]))->toBe([blockText('a')]);
});

it('uses the first level for a level that is not on offer', function (mixed $level): void {
    expect(blockHtml([HeadingPlugin::make()], ['type' => 'heading', 'attrs' => ['level' => $level], 'content' => [blockText('a')]]))
        ->toBe('<h2>a</h2>');
})->with([1, 9, '3><script>', null, [['x']]]);

it('renders and parses lists', function (): void {
    $item = ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [blockText('a')]]]];
    $plugins = [BulletListPlugin::make(), OrderedListPlugin::make()];

    expect(blockHtml($plugins, ['type' => 'bulletList', 'content' => [$item]]))->toBe('<ul><li><p>a</p></li></ul>')
        ->and(blockParse('<ul><li><p>a</p></li></ul>', $plugins))->toBe([['type' => 'bulletList', 'content' => [$item]]]);
});

it('leaves bare list item text alone, because parsing does not repair structure', function (): void {
    expect(blockParse('<ul><li>a</li></ul>', [BulletListPlugin::make()])[0]['content'][0]['content'])->toBe([blockText('a')]);
});

it('omits start when it is 1 and the default type', function (): void {
    $list = fn (array $attrs): array => ['type' => 'orderedList', 'attrs' => $attrs, 'content' => []];

    expect(blockHtml([OrderedListPlugin::make()], $list(['start' => 1, 'type' => null])))->toBe('<ol></ol>')
        ->and(blockHtml([OrderedListPlugin::make()], $list(['start' => 1, 'type' => '1'])))->toBe('<ol></ol>')
        ->and(blockHtml([OrderedListPlugin::make()], $list(['start' => 3, 'type' => 'a'])))->toBe('<ol start="3" type="a"></ol>');
});

it('parses list start and type with the defaults the browser stores', function (): void {
    expect(blockParse('<ol></ol>', [OrderedListPlugin::make()])[0]['attrs'])->toBe(['start' => 1, 'type' => null])
        ->and(blockParse('<ol start="3" type="a"></ol>', [OrderedListPlugin::make()])[0]['attrs'])->toBe(['start' => 3, 'type' => 'a']);
});

it('renders and parses code blocks with a language', function (): void {
    $code = ['type' => 'codeBlock', 'attrs' => ['language' => 'php'], 'content' => [blockText("  a\n  b")]];
    $plugins = [CodeBlockPlugin::make()];

    expect(blockHtml($plugins, $code))->toBe("<pre><code class=\"language-php\">  a\n  b</code></pre>")
        ->and(blockParse("<pre><code class=\"x language-php\">  a\n  b</code></pre>", $plugins))->toBe([$code]);
});

it('drops a code block language that could add classes of its own', function (string $language): void {
    $code = ['type' => 'codeBlock', 'attrs' => ['language' => $language], 'content' => [blockText('a')]];

    expect(blockHtml([CodeBlockPlugin::make()], $code))->toBe('<pre><code>a</code></pre>');
})->with(['spaces' => 'php fixed inset-0', 'quote' => 'php"', 'too long' => str_repeat('a', 33)]);

it('renders a code block without a language', function (): void {
    expect(blockHtml([CodeBlockPlugin::make()], ['type' => 'codeBlock', 'content' => [blockText('a')]]))->toBe('<pre><code>a</code></pre>')
        ->and(blockParse('<pre><code>a</code></pre>', [CodeBlockPlugin::make()])[0]['attrs'])->toBe(['language' => null]);
});

it('keeps marks out of code', function (): void {
    expect(blockParse('<pre><strong>a</strong></pre>', [CodeBlockPlugin::make(), BoldPlugin::make()])[0]['content'])->toBe([blockText('a')]);
});

it('renders and parses a divider', function (): void {
    expect(blockHtml([DividerPlugin::make()], ['type' => 'horizontalRule']))->toBe('<hr>')
        ->and(blockParse('<hr>', [DividerPlugin::make()]))->toBe([['type' => 'horizontalRule']]);
});

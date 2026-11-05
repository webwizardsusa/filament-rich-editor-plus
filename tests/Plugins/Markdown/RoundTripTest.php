<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Plugins\Core\CodePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\Plugins\Markdown\Parsing\MarkdownParser;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownSerializer;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\CoreRules;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\ImageRules;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\TableRules;
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

function roundTripRegistry(): PluginRegistry
{
    return PluginRegistry::make([
        ...array_filter(PluginRegistry::defaultPlugins(), static fn ($plugin): bool => ! $plugin instanceof HeadingPlugin),
        HeadingPlugin::make()->levels([1, 2, 3, 4, 5, 6]),
        TaskListPlugin::make(),
        CodePlugin::make(),
        TablePlugin::make()->resizable(false),
        ImagePlugin::make()->disk('public')->allowUrls()->allowUploads(false),
    ]);
}

/**
 * @param  array<string, mixed>  $document
 */
function roundTripWrite(array $document, PluginRegistry $registry): string
{
    return (new MarkdownSerializer([...CoreRules::nodes(), ...TableRules::nodes(), ...ImageRules::nodes()], CoreRules::marks()))->serialize($document, ContentSchema::fromRegistry($registry));
}

dataset('core fixtures', fn (): array => array_map(
    static fn (string $path): array => [substr($path, strlen(__DIR__.'/fixtures/'))],
    glob(__DIR__.'/fixtures/*/*.md'),
));

/**
 * Collects where a document breaks the editor's nesting: items and cells without a leading block, images inside
 * paragraphs or headings, and inline nodes (text, line breaks) where blocks belong.
 *
 * @param  array<string, mixed>  $node
 * @return array<int, string>
 */
function roundTripNestingProblems(array $node): array
{
    $type = $node['type'] ?? '';
    $children = $node['content'] ?? [];
    $problems = [];

    if (in_array($type, ['doc', 'blockquote', 'listItem', 'taskItem', 'tableCell', 'tableHeader'], true)) {
        foreach ($children as $child) {
            if (in_array($child['type'] ?? '', ['text', 'hardBreak', 'mention'], true)) {
                $problems[] = "{$type} holds an inline {$child['type']}";
            }

            if (in_array($child['type'] ?? '', ['listItem', 'taskItem', 'tableRow', 'tableCell', 'tableHeader'], true)) {
                $problems[] = "{$type} holds a stray {$child['type']}";
            }
        }
    }

    if (in_array($type, ['blockquote', 'listItem', 'taskItem'], true) && $children === []) {
        $problems[] = "{$type} is empty";
    }

    if ($type === 'heading' && in_array('image', array_column($children, 'type'), true)) {
        $problems[] = 'heading holds an image';
    }

    if (in_array($type, ['listItem', 'taskItem', 'tableCell', 'tableHeader'], true)) {
        $first = $children[0]['type'] ?? null;

        if ($children === [] || ($type !== 'tableCell' && $type !== 'tableHeader' && $first !== 'paragraph') || $first === 'text') {
            $problems[] = "{$type} starts with ".($first ?? 'nothing');
        }
    }

    if ($type === 'paragraph' && in_array('image', array_column($children, 'type'), true)) {
        $problems[] = 'paragraph holds an image';
    }

    foreach ($children as $child) {
        $problems = [...$problems, ...roundTripNestingProblems($child)];
    }

    return $problems;
}

it('parses fixtures into documents the editor accepts', function (string $fixture): void {
    $registry = roundTripRegistry();

    expect(roundTripNestingProblems((new MarkdownParser)->parse(file_get_contents(__DIR__.'/fixtures/'.$fixture), $registry)))->toBe([]);
})->with('core fixtures');

it('parses raw HTML and awkwardly placed images into documents the editor accepts and Markdown can write', function (string $markdown): void {
    $registry = roundTripRegistry();
    $document = (new MarkdownParser)->parse($markdown, $registry);

    expect(roundTripNestingProblems($document))->toBe([])
        ->and(roundTripWrite($document, $registry))->toBeString();
})->with([
    'div' => ["<div>hi</div>\n"],
    'center' => ['<center>x</center>'],
    'details' => ["<details><summary>More</summary>\n\nbody\n\n</details>\n"],
    'nested divs around a heading' => ["<div align=\"center\">\n\n# Title\n\n</div>\n"],
    'div around an image' => ["<div align=\"center\"><img src=\"https://e.com/l.png\"></div>\n"],
    'adjacent divs' => ['<div>a</div><div>b</div>'],
    'section, article, aside' => ["<section><article>a</article><aside>b</aside></section>\n"],
    'definition list' => ["<dl><dt>Term</dt><dd>Definition</dd></dl>\n"],
    'figure without a type' => ["<figure><img src=\"https://e.com/f.png\" alt=\"f\"><figcaption>cap</figcaption></figure>\n"],
    'stray list item' => ['<div data-type="taskList"><li data-type="taskItem">x</li></div>'],
    'line break between blocks' => ["a\n\n<br>\n\nb"],
    'line break in a quote' => ["> a\n>\n> <br>\n"],
    'raw script and iframe' => ["<script>alert(1)</script>\n\n<iframe src=\"https://e.com\"></iframe>\n"],
    'lone raw image' => ["<img src=\"https://e.com/i.png\" alt=\"i\">\n"],
    'badge link' => ["[![badge](https://e.com/b.svg)](https://ci.example.com)\n"],
    'image inside link text' => ['[a ![x](https://e.com/i.png) b](https://z.example.com)'],
    'image inside emphasis' => ['*a ![x](https://e.com/i.png) b*'],
    'image inside strong inside link' => ['[**a ![x](https://e.com/i.png)**](https://z.example.com)'],
    'image in a list item' => ['- ![x](https://e.com/i.png)'],
    'image in a task item' => ['- [ ] ![x](https://e.com/i.png)'],
    'badge in a list item' => ['- [![x](https://e.com/i.png)](https://z.example.com) text'],
    'image in a heading' => ['# ![x](https://e.com/i.png)'],
    'linked image in a heading' => ['## Logo [![x](https://e.com/i.png)](https://z.example.com)'],
    'image in a quote' => ['> ![x](https://e.com/i.png)'],
    'image in a table cell' => ["| a |\n|---|\n| ![x](https://e.com/i.png) |"],
    'image without a URL' => ['![a]()'],
    'image with an empty destination' => ['![a](<>)'],
    'image with a javascript URL' => ['![a](javascript:alert(1))'],
    'image with a data URL' => ['![a](data:image/png;base64,AAAA)'],
    'raw image with a javascript URL' => ['<img src="javascript:alert(1)" alt="a">'],
    'raw image figure with a javascript URL' => ['<figure data-type="image" data-url="javascript:alert(1)"><img alt="x"></figure>'],
    'raw image figure on a disk' => ['<figure data-type="image" data-disk="local" data-path="../../.env"><img alt="x"></figure>'],
    'item starting with a quote' => ['- > q'],
    'item starting with code' => ["- ```\n  x\n  ```"],
    'item starting with a heading' => ['- # h'],
    'empty item' => ['-'],
    'empty quote' => ['>'],
]);

it('writes Markdown back exactly as it read it', function (string $fixture): void {
    $markdown = file_get_contents(__DIR__.'/fixtures/'.$fixture);
    $registry = roundTripRegistry();

    expect(roundTripWrite((new MarkdownParser)->parse($markdown, $registry), $registry))->toBe($markdown);
})->with('core fixtures');

it('reads its own Markdown back to the same document', function (string $fixture): void {
    $registry = roundTripRegistry();
    $document = (new MarkdownParser)->parse(file_get_contents(__DIR__.'/fixtures/'.$fixture), $registry);

    expect((new MarkdownParser)->parse(roundTripWrite($document, $registry), $registry))->toBe($document);
})->with('core fixtures');

/**
 * @param  array<array<string, mixed>>  $marks
 * @return array<string, mixed>
 */
function roundTripText(string $text, array $marks = []): array
{
    return $marks === [] ? ['type' => 'text', 'text' => $text] : ['type' => 'text', 'text' => $text, 'marks' => $marks];
}

/**
 * @param  array<array<string, mixed>>  $content
 * @return array<string, mixed>
 */
function roundTripParagraph(array $content): array
{
    return ['type' => 'paragraph', 'content' => $content];
}

/**
 * @param  array<array<string, mixed>>  $blocks
 * @return array<string, mixed>
 */
function roundTripItem(array $blocks): array
{
    return ['type' => 'listItem', 'content' => $blocks];
}

dataset('stable documents', function (): array {
    $bold = [['type' => 'bold']];
    $link = [['type' => 'link', 'attrs' => ['href' => 'https://example.com', 'target' => '_blank', 'rel' => 'noopener noreferrer nofollow', 'class' => null, 'title' => null]]];
    $hr = ['type' => 'horizontalRule'];
    $image = ['type' => 'image', 'attrs' => ['disk' => null, 'path' => null, 'url' => 'https://e.com/i.png', 'alt' => 'x', 'caption' => '', 'align' => 'center', 'width' => '100']];
    $p = static fn (string $text): array => roundTripParagraph([roundTripText($text)]);

    return [
        'bold quotes between words' => [[roundTripParagraph([roundTripText('x'), roundTripText('"foo"', $bold), roundTripText('y')])]],
        'bold trailing dot' => [[roundTripParagraph([roundTripText('foo.', $bold), roundTripText('bar')])]],
        'strike parentheses' => [[roundTripParagraph([roundTripText('a'), roundTripText('(x)', [['type' => 'strike']]), roundTripText('b')])]],
        'italic quotes' => [[roundTripParagraph([roundTripText('say'), roundTripText('"hi"', [['type' => 'italic']])])]],
        'bold italic punctuation' => [[roundTripParagraph([roundTripText('x'), roundTripText('"foo"', [['type' => 'bold'], ['type' => 'italic']]), roundTripText('y')])]],
        'bold currency' => [[roundTripParagraph([roundTripText('only'), roundTripText('€5', $bold)])]],
        'bold degree' => [[roundTripParagraph([roundTripText('it was 20'), roundTripText('°C', $bold)])]],
        'bold arrow' => [[roundTripParagraph([roundTripText('a'), roundTripText('→', $bold), roundTripText('b')])]],
        'italic copyright' => [[roundTripParagraph([roundTripText('Acme'), roundTripText('©', [['type' => 'italic']]), roundTripText(' 2024')])]],
        'bold emoji then word' => [[roundTripParagraph([roundTripText('Done ✅', $bold), roundTripText('next')])]],
        'bold around strike' => [[roundTripParagraph([roundTripText('x'), roundTripText('a', [['type' => 'bold'], ['type' => 'strike']]), roundTripText('y')])]],
        'bold then strike glued' => [[roundTripParagraph([roundTripText('x'), roundTripText('a', $bold), roundTripText('b', [['type' => 'strike']]), roundTripText('y')])]],
        'bold strike inside bold' => [[roundTripParagraph([roundTripText('x'), roundTripText('a', $bold), roundTripText('b', [['type' => 'bold'], ['type' => 'strike']]), roundTripText('y')])]],
        'italic then bold touching' => [[roundTripParagraph([roundTripText('x '), roundTripText('a', [['type' => 'italic']]), roundTripText('b', $bold), roundTripText(' y')])]],
        'heading ending in hashes' => [[
            ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [roundTripText('Item ##')]],
            ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [roundTripText('#')]],
            ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [roundTripText('x #')]],
        ]],
        'bang before link' => [[roundTripParagraph([roundTripText('wow!'), roundTripText('x', $link)])]],
        'code with edge spaces' => [[roundTripParagraph([roundTripText('x'), roundTripText(' a ', [['type' => 'code']]), roundTripText('y')])]],
        'pipes around a hard break' => [[roundTripParagraph([roundTripText('a | b'), ['type' => 'hardBreak'], roundTripText('-- | --')])]],
        'item with a rule' => [[['type' => 'bulletList', 'content' => [roundTripItem([$p('a'), $hr])]]]],
        'item with a late ordered list' => [[['type' => 'bulletList', 'content' => [roundTripItem([$p('a'), ['type' => 'orderedList', 'attrs' => ['start' => 3, 'type' => null], 'content' => [roundTripItem([$p('x')])]]])]]]],
        'item starting with a quote' => [[['type' => 'bulletList', 'content' => [roundTripItem([$p('a'), ['type' => 'blockquote', 'content' => [$p('q')]]])]]]],
        'item starting with a rule' => [[['type' => 'bulletList', 'content' => [roundTripItem([['type' => 'paragraph'], $hr, $p('a')])]]]],
        'item starting with a quote block' => [[['type' => 'bulletList', 'content' => [roundTripItem([['type' => 'paragraph'], ['type' => 'blockquote', 'content' => [$p('q')]], $p('a')])]]]],
        'item starting with an image' => [[['type' => 'bulletList', 'content' => [roundTripItem([['type' => 'paragraph'], $image])]]]],
        'empty item' => [[['type' => 'bulletList', 'content' => [roundTripItem([['type' => 'paragraph']])]]]],
        'empty quote' => [[['type' => 'blockquote', 'content' => [['type' => 'paragraph']]]]],
    ];
});

it('reads back the document it was written from', function (array $blocks): void {
    $registry = roundTripRegistry();
    $document = ['type' => 'doc', 'content' => $blocks];

    expect((new MarkdownParser)->parse(roundTripWrite($document, $registry), $registry))->toBe($document);
})->with('stable documents');

it('turns leading whitespace into a stable document instead of other syntax', function (array $content, array $types): void {
    $registry = roundTripRegistry();
    $markdown = roundTripWrite(['type' => 'doc', 'content' => [roundTripParagraph($content)]], $registry);
    $document = (new MarkdownParser)->parse($markdown, $registry);

    expect(array_column($document['content'], 'type'))->toBe($types)
        ->and(roundTripWrite($document, $registry))->toBe($markdown);
})->with([
    'four spaces' => [[['type' => 'text', 'text' => '    four spaces']], ['paragraph']],
    'tab' => [[['type' => 'text', 'text' => "\tindented"]], ['paragraph']],
    'indented heading' => [[['type' => 'text', 'text' => '  # x']], ['paragraph']],
    'indented rule after a break' => [[['type' => 'text', 'text' => 'a'], ['type' => 'hardBreak'], ['type' => 'text', 'text' => '  ---']], ['paragraph']],
    'indented quote after a break' => [[['type' => 'text', 'text' => 'a'], ['type' => 'hardBreak'], ['type' => 'text', 'text' => '  > q']], ['paragraph']],
]);

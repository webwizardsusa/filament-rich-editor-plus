<?php

use Hollyit\RichEditorPlus\Plugins\Core\CodePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\Plugins\Markdown\Parsing\MarkdownParser;
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

/**
 * @param  array<int>  $levels
 * @return array<string, mixed>
 */
function mdParse(string $markdown, array $levels = [1, 2, 3, 4, 5, 6]): array
{
    $registry = PluginRegistry::make([
        ...array_filter(PluginRegistry::defaultPlugins(), static fn ($plugin): bool => ! $plugin instanceof HeadingPlugin),
        HeadingPlugin::make()->levels($levels),
        CodePlugin::make(),
        TaskListPlugin::make(),
        TablePlugin::make()->resizable(false),
        ImagePlugin::make()->disk('public')->allowUrls()->allowUploads(false),
    ]);

    return (new MarkdownParser)->parse($markdown, $registry);
}

it('parses headings, paragraphs and marks', function (): void {
    $doc = mdParse("# Title\n\nSome **bold**, *italic*, ~~gone~~ and `code`.");

    expect($doc['content'][0])->toMatchArray(['type' => 'heading', 'attrs' => ['level' => 1]])
        ->and(data_get($doc, 'content.1.content.1'))->toMatchArray(['text' => 'bold', 'marks' => [['type' => 'bold']]])
        ->and(data_get($doc, 'content.1.content.3.marks.0.type'))->toBe('italic')
        ->and(data_get($doc, 'content.1.content.5.marks.0.type'))->toBe('strike')
        ->and(data_get($doc, 'content.1.content.7.marks.0.type'))->toBe('code');
});

it('clamps headings to the field levels', function (): void {
    $doc = mdParse("# One\n\n#### Four", [2, 3]);

    expect(data_get($doc, 'content.0.attrs.level'))->toBe(2)
        ->and(data_get($doc, 'content.1.attrs.level'))->toBe(3);
});

it('parses task lists, and leaves mixed lists as bullet lists', function (): void {
    $tasks = mdParse("- [ ] a\n- [x] b");
    $mixed = mdParse("- [ ] a\n- b");

    expect(data_get($tasks, 'content.0.type'))->toBe('taskList')
        ->and(data_get($tasks, 'content.0.content.0.attrs.checked'))->toBeFalse()
        ->and(data_get($tasks, 'content.0.content.1.attrs.checked'))->toBeTrue()
        ->and(data_get($tasks, 'content.0.content.0.content.0'))->toMatchArray(['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]])
        ->and(data_get($mixed, 'content.0.type'))->toBe('bulletList');
});

it('parses loose task lists', function (): void {
    $doc = mdParse("- [x] a\n\n- [ ] b");

    expect(data_get($doc, 'content.0.type'))->toBe('taskList')
        ->and(data_get($doc, 'content.0.content.0.attrs.checked'))->toBeTrue()
        ->and(data_get($doc, 'content.0.content.0.content.0.content.0.text'))->toBe('a');
});

it('wraps tight list item text in paragraphs, including nested lists', function (): void {
    $bullets = mdParse("- a\n- b");
    $ordered = mdParse("1. a\n2. b");
    $nested = mdParse("- a\n  - b");

    expect(data_get($bullets, 'content.0.content.1.content'))->toBe([['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'b']]]])
        ->and(data_get($ordered, 'content.0.type'))->toBe('orderedList')
        ->and(data_get($ordered, 'content.0.content.0.content.0.type'))->toBe('paragraph')
        ->and(data_get($nested, 'content.0.content.0.content.0'))->toBe(['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]])
        ->and(data_get($nested, 'content.0.content.0.content.1.type'))->toBe('bulletList')
        ->and(data_get($nested, 'content.0.content.0.content.1.content.0.content.0.content.0.text'))->toBe('b');
});

it('parses code blocks without the trailing newline', function (): void {
    $doc = mdParse("```php\necho 1;\n```");

    expect($doc['content'][0])->toMatchArray([
        'type' => 'codeBlock',
        'attrs' => ['language' => 'php'],
        'content' => [['type' => 'text', 'text' => 'echo 1;']],
    ]);
});

it('parses a standalone image with its title as the caption', function (): void {
    $doc = mdParse('![A cat](https://example.com/cat.jpg "Our cat")');

    expect($doc['content'][0]['type'])->toBe('image')
        ->and($doc['content'][0]['attrs'])->toMatchArray(['url' => 'https://example.com/cat.jpg', 'alt' => 'A cat', 'caption' => 'Our cat', 'disk' => null, 'path' => null]);
});

it('parses tables with column alignment', function (): void {
    $doc = mdParse("| a | b |\n|:--|--:|\n| 1 | 2 |");

    expect(data_get($doc, 'content.0.type'))->toBe('table')
        ->and(data_get($doc, 'content.0.content.0.content.0.type'))->toBe('tableHeader')
        ->and(data_get($doc, 'content.0.content.0.content.0.attrs.align'))->toBe('left')
        ->and(data_get($doc, 'content.0.content.1.content.1.type'))->toBe('tableCell')
        ->and(data_get($doc, 'content.0.content.1.content.1.attrs.align'))->toBe('right');
});

it('drops unsafe links and HTML the field does not have', function (): void {
    $doc = mdParse('[x](javascript:alert(1)) and <u>u</u>');

    expect(collect(data_get($doc, 'content.0.content'))->pluck('marks')->flatten(1)->pluck('type')->all())->not->toContain('link', 'underline')
        ->and(collect(data_get($doc, 'content.0.content'))->pluck('text')->implode(''))->toBe('x and u');
});

it('parses hard breaks', function (): void {
    $doc = mdParse("one\\\ntwo");

    expect(data_get($doc, 'content.0.content'))->toBe([
        ['type' => 'text', 'text' => 'one'],
        ['type' => 'hardBreak'],
        ['type' => 'text', 'text' => 'two'],
    ]);
});

it('parses empty input as an empty document', function (): void {
    expect(mdParse(''))->toBe(['type' => 'doc', 'content' => []]);
});

it('parses table cells as paragraphs, including empty cells', function (): void {
    $doc = mdParse("| a | b |\n| --- | --- |\n| **x** |  |\n");
    $rows = data_get($doc, 'content.0.content');

    expect(data_get($rows, '0.content.0.content.0.type'))->toBe('paragraph')
        ->and(data_get($rows, '1.content.0.content.0.content.0.marks'))->toBe([['type' => 'bold']])
        ->and(data_get($rows, '1.content.1.content'))->toBe([['type' => 'paragraph']]);
});

it('splits a paragraph at an image', function (): void {
    $doc = mdParse('a ![x](https://e.com/u.png) b');

    expect(array_column($doc['content'], 'type'))->toBe(['paragraph', 'image', 'paragraph'])
        ->and(data_get($doc, 'content.0.content.0.text'))->toBe('a')
        ->and(data_get($doc, 'content.2.content.0.text'))->toBe('b');
});

it('drops empty pieces around an image', function (): void {
    $doc = mdParse('![x](https://e.com/u.png) ![y](https://e.com/v.png)');

    expect(array_column($doc['content'], 'type'))->toBe(['image', 'image']);
});

it('unwraps raw HTML containers into paragraphs', function (): void {
    $doc = mdParse("<details><summary>More</summary>\n\nbody\n\n</details>\n\n<center>x</center>\n\n<div>a</div><div>b</div>");

    expect($doc['content'])->toBe([
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'More']]],
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'body']]],
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x']]],
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]],
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'b']]],
    ]);
});

it('drops a line break between blocks', function (): void {
    expect(array_column(mdParse("a\n\n<br>\n\nb")['content'], 'type'))->toBe(['paragraph', 'paragraph']);
});

it('keeps the space between marked words in a list item', function (): void {
    expect(data_get(mdParse('- *a* *b*'), 'content.0.content.0.content.0.content.1'))->toBe(['type' => 'text', 'text' => ' ']);
});

it('lifts an image out of a link, keeping the link on the text around it', function (): void {
    $doc = mdParse('[a ![x](https://e.com/i.png) b](https://z.com)');

    expect(array_column($doc['content'], 'type'))->toBe(['paragraph', 'image', 'paragraph'])
        ->and(data_get($doc, 'content.0.content.0.marks.0.attrs.href'))->toBe('https://z.com')
        ->and(data_get($doc, 'content.1.attrs.url'))->toBe('https://e.com/i.png')
        ->and(data_get($doc, 'content.2.content.0.marks.0.attrs.href'))->toBe('https://z.com')
        ->and(array_column(mdParse('[![badge](https://e.com/b.svg)](https://ci.com)')['content'], 'type'))->toBe(['image'])
        ->and(array_column(mdParse('*a ![x](https://e.com/i.png) b*')['content'], 'type'))->toBe(['paragraph', 'image', 'paragraph']);
});

it('starts a list item with a paragraph when it would start with another block', function (): void {
    expect(array_column(data_get(mdParse('- ![x](https://e.com/i.png)'), 'content.0.content.0.content'), 'type'))->toBe(['paragraph', 'image'])
        ->and(array_column(data_get(mdParse('- [ ] ![x](https://e.com/i.png)'), 'content.0.content.0.content'), 'type'))->toBe(['paragraph', 'image'])
        ->and(array_column(data_get(mdParse("- ```\n  x\n  ```"), 'content.0.content.0.content'), 'type'))->toBe(['paragraph', 'codeBlock'])
        ->and(data_get(mdParse('-'), 'content.0.content.0.content'))->toBe([['type' => 'paragraph']])
        ->and(data_get(mdParse('>'), 'content.0.content'))->toBe([['type' => 'paragraph']]);
});

it('writes an image in a heading as its alt text', function (): void {
    expect(data_get(mdParse('# Logo [![x](https://e.com/i.png)](https://z.com)'), 'content.0.content'))->toBe([
        ['type' => 'text', 'text' => 'Logo '],
        ['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'https://z.com', 'target' => '_blank', 'rel' => 'noopener noreferrer nofollow', 'class' => null, 'title' => null]]]],
    ]);
});

it('keeps images with relative URLs', function (string $url): void {
    expect(mdParse("![logo]({$url})")['content'][0])->toMatchArray(['type' => 'image'])
        ->and(mdParse("![logo]({$url})")['content'][0]['attrs']['url'])->toBe($url);
})->with([
    'root-relative' => ['/img/logo.png'],
    'path-relative' => ['img/logo.png'],
    'dot' => ['./logo.png'],
    'parent' => ['../logo.png'],
    'protocol-relative' => ['//cdn.example.com/logo.png'],
]);

it('writes an image without a usable URL as its alt text', function (string $markdown): void {
    expect(mdParse($markdown)['content'])->toBe([['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]]]);
})->with([
    'no URL' => ['![a]()'],
    'empty destination' => ['![a](<>)'],
    'javascript' => ['![a](javascript:alert(1))'],
    'data' => ['![a](data:image/png;base64,AAAA)'],
    'mixed-case javascript' => ['![a](JaVaScript:alert(1))'],
    'raw image with javascript hidden by a tab' => ['<img src="java&#9;script:alert(1)" alt="a">'],
    'file' => ['![a](file:///etc/passwd)'],
    'raw image' => ['<img src="javascript:alert(1)" alt="a">'],
    'raw figure' => ['<figure data-type="image" data-url="javascript:alert(1)"><img alt="a"></figure>'],
    'raw figure on a disk' => ['<figure data-type="image" data-disk="local" data-path="../../.env"><img alt="a"></figure>'],
]);

it('stops nesting deep input', function (): void {
    $doc = mdParse(str_repeat('>', 1000).' x');
    $depth = 0;
    $node = $doc['content'][0];

    while (($node['type'] ?? null) === 'blockquote') {
        $depth++;
        $node = $node['content'][0];
    }

    expect($depth)->toBeLessThanOrEqual(MarkdownParser::MAX_NESTING_LEVEL)
        ->and(json_encode($doc))->toBeString();
});

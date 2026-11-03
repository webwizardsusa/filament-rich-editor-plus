<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Tests\TestCase;

uses(TestCase::class);

/**
 * @return array<array<string, mixed>>
 */
function parseContent(string $html): array
{
    $schema = new ContentSchema([
        NodeSpec::make('paragraph')->parseTags(['p']),
        NodeSpec::make('blockquote')->parseTags(['blockquote']),
        NodeSpec::make('hardBreak')->inline()->atom()->parseTags(['br']),
        NodeSpec::make('codeBlock')->preserveWhitespace()->withoutMarks()->parseTags(['pre']),
        NodeSpec::make('token')->inline()->atom()->priority(51)->attribute('label', parse: fn (DOMElement $element): string => $element->getAttribute('data-label'))
            ->parseUsing(fn (DOMElement $element): bool => $element->getAttribute('data-type') === 'token'),
    ], [
        MarkSpec::make('bold')->parseTags(['strong', 'b']),
        MarkSpec::make('italic')->parseTags(['em']),
        MarkSpec::make('link')->priority(1000)->parseTags(['a'])->attribute('href'),
    ]);

    return (new HtmlParser($schema))->parse($html)['content'];
}

it('returns a document', function (): void {
    $schema = new ContentSchema([], []);

    expect((new HtmlParser($schema))->parse(''))->toBe(['type' => 'doc', 'content' => []]);
});

it('builds nested nodes', function (): void {
    expect(parseContent('<blockquote><p>a</p></blockquote>'))->toBe([
        ['type' => 'blockquote', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]]]],
    ]);
});

it('leaves content off empty nodes', function (): void {
    expect(parseContent('<p></p>'))->toBe([['type' => 'paragraph']]);
});

it('applies marks to text and inline nodes', function (): void {
    expect(parseContent('<p><strong>a<br></strong></p>')[0]['content'])->toBe([
        ['type' => 'text', 'text' => 'a', 'marks' => [['type' => 'bold']]],
        ['type' => 'hardBreak', 'marks' => [['type' => 'bold']]],
    ]);
});

it('orders marks by rank and does not repeat them', function (): void {
    $marks = parseContent('<p><b><em><a href="/x"><strong>a</strong></a></em></b></p>')[0]['content'][0]['marks'];

    expect(array_column($marks, 'type'))->toBe(['link', 'bold', 'italic'])
        ->and($marks[0]['attrs'])->toBe(['href' => '/x']);
});

it('merges adjacent text with the same marks', function (): void {
    expect(parseContent('<p>a<span>b</span><strong>c</strong></p>')[0]['content'])->toBe([
        ['type' => 'text', 'text' => 'ab'],
        ['type' => 'text', 'text' => 'c', 'marks' => [['type' => 'bold']]],
    ]);
});

it('unwraps unknown tags and keeps their text', function (): void {
    expect(parseContent('<p><mystery>a</mystery></p>')[0]['content'])->toBe([['type' => 'text', 'text' => 'a']]);
});

it('keeps the words of unknown block tags apart', function (): void {
    expect(parseContent('<div>a</div><div>b</div>'))->toBe([['type' => 'text', 'text' => 'a b']]);
});

it('adds no stray spaces around known blocks inside unknown block tags', function (): void {
    expect(parseContent('<div><p>a</p></div><div><p>b</p></div>'))->toBe([
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]],
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'b']]],
    ]);
});

it('drops script, style and comments with their content', function (string $html): void {
    expect(json_encode(parseContent($html)))->not->toContain('evil');
})->with([
    '<script>evil()</script><p>a</p>',
    '<p>a<script>evil()</script></p>',
    '<style>evil{}</style><p>a</p>',
    '<template><p>evil</p></template><p>a</p>',
    '<noscript>evil</noscript><p>a</p>',
    '<!-- evil --><p>a</p>',
    '<title>evil</title><p>a</p>',
    '<head><title>evil</title></head><p>a</p>',
    '<html><head><title>evil</title></head><body><p>a</p></body></html>',
    '<object data="x"><p>evil</p></object><p>a</p>',
]);

it('ignores what is inside an atom', function (): void {
    expect(parseContent('<p><span data-type="token" data-label="0">@0</span></p>')[0]['content'])->toBe([
        ['type' => 'token', 'attrs' => ['label' => '0']],
    ]);
});

it('collapses whitespace and drops it between blocks', function (): void {
    expect(parseContent("\n<p>  a \n  b  </p>\n  <p> c</p>\n"))->toBe([
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a b']]],
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'c']]],
    ]);
});

it('keeps single spaces between inline nodes', function (): void {
    expect(parseContent('<p><strong>a </strong>b <span data-type="token" data-label="x"></span> c</p>')[0]['content'])->toBe([
        ['type' => 'text', 'text' => 'a ', 'marks' => [['type' => 'bold']]],
        ['type' => 'text', 'text' => 'b '],
        ['type' => 'token', 'attrs' => ['label' => 'x']],
        ['type' => 'text', 'text' => ' c'],
    ]);
});

it('does not double a space across marks', function (): void {
    expect(parseContent('<p><strong>a </strong> b</p>')[0]['content'][1]['text'])->toBe('b');
});

it('keeps non-breaking spaces', function (): void {
    expect(parseContent("<p>\u{A0}a\u{A0}</p>")[0]['content'][0]['text'])->toBe("\u{A0}a\u{A0}");
});

it('preserves whitespace and turns br into a newline in code', function (): void {
    expect(parseContent("<pre><code>  a\n\n    b<br>c  </code></pre>")[0]['content'])->toBe([
        ['type' => 'text', 'text' => "  a\n\n    b\nc  "],
    ]);
});

it('drops marks inside nodes that do not allow them', function (): void {
    expect(parseContent('<pre><strong>a</strong></pre>')[0]['content'])->toBe([['type' => 'text', 'text' => 'a']]);
});

it('keeps multibyte text and decodes entities', function (): void {
    expect(parseContent('<p>é 日本語 🎉 &amp; &lt;</p>')[0]['content'][0]['text'])->toBe('é 日本語 🎉 & <');
});

it('survives invalid UTF-8 and NUL bytes', function (): void {
    expect(parseContent("<p>a\xFFb\0c</p>")[0]['content'][0]['text'])->toContain('a')->toContain('c');
});

it('survives broken HTML', function (): void {
    expect(parseContent('<p>a<strong>b</p></div><p>c')[0]['type'])->toBe('paragraph');
});

it('leaves bare text where it is, because parsing does not repair structure', function (): void {
    expect(parseContent('a'))->toBe([['type' => 'text', 'text' => 'a']]);
});

function excludingMarksParse(string $html): array
{
    $schema = new ContentSchema([NodeSpec::make('paragraph')->parseTags(['p'])->renderTag('p')], [
        MarkSpec::make('bold')->parseTags(['strong'])->renderTag('strong'),
        MarkSpec::make('link')->parseTags(['a'])->attribute('href')->renderTag('a'),
        MarkSpec::make('code')->parseTags(['code'])->excludes('_')->renderTag('code'),
        MarkSpec::make('subscript')->parseTags(['sub'])->excludes(['superscript'])->renderTag('sub'),
        MarkSpec::make('superscript')->parseTags(['sup'])->excludes(['subscript'])->renderTag('sup'),
    ]);

    return (new HtmlParser($schema))->parse($html)['content'][0]['content'][0]['marks'];
}

it('drops marks inside a mark that excludes every other mark', function (string $html): void {
    expect(excludingMarksParse($html))->toBe([['type' => 'code']]);
})->with([
    'bold inside code' => '<p><code><strong>x</strong></code></p>',
    'code inside bold' => '<p><strong><code>x</code></strong></p>',
    'link inside code' => '<p><code><a href="https://example.com">x</a></code></p>',
]);

it('keeps only the inner mark of two that exclude each other', function (): void {
    expect(excludingMarksParse('<p><sup><sub>x</sub></sup></p>'))->toBe([['type' => 'subscript']])
        ->and(excludingMarksParse('<p><sub><sup>x</sup></sub></p>'))->toBe([['type' => 'superscript']]);
});

it('keeps marks that do not exclude each other', function (): void {
    expect(excludingMarksParse('<p><strong><sub>x</sub></strong></p>'))->toBe([['type' => 'bold'], ['type' => 'subscript']]);
});

it('leaves existing marks untouched when an existing mark excludes the new one', function (): void {
    $schema = new ContentSchema([NodeSpec::make('paragraph')->parseTags(['p'])], [
        MarkSpec::make('x')->parseTags(['em']),
        MarkSpec::make('y')->parseTags(['strong'])->excludes(['n']),
        MarkSpec::make('n')->parseTags(['code'])->excludes(['x']),
    ]);

    $marks = (new HtmlParser($schema))->parse('<p><em><strong><code>t</code></strong></em></p>')['content'][0]['content'][0]['marks'];

    expect($marks)->toBe([['type' => 'x'], ['type' => 'y']]);
});

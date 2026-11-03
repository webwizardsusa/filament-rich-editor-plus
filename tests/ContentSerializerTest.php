<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\GlobalAttribute;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Tests\TestCase;

uses(TestCase::class);

function serializerSchema(): ContentSchema
{
    return new ContentSchema([
        NodeSpec::make('paragraph')->renderTag('p'),
        NodeSpec::make('hardBreak')->inline()->atom()->renderTag('br'),
        NodeSpec::make('code')->withoutMarks()->renderUsing(fn (array $node, array $attributes): array => ['pre', ['code', $attributes, 0]]),
        NodeSpec::make('token')->inline()->atom()->attribute('label')
            ->renderUsing(fn (array $node, array $attributes): array => ['span', $attributes, (string) ($node['attrs']['label'] ?? '')]),
        NodeSpec::make('evil')->renderUsing(fn (): array => ['div', ['onclick' => 'x', 'ONLOAD' => 'y', 'bad name' => 'z', 'ok' => 'yes'], 0]),
        NodeSpec::make('badTag')->renderUsing(fn (): array => ['di v><script', [], 0]),
    ], [
        MarkSpec::make('bold')->renderTag('strong'),
        MarkSpec::make('italic')->renderTag('em'),
        MarkSpec::make('link')->urlAttribute('href', ['https'])->renderTag('a'),
    ]);
}

function serializeContent(array ...$content): string
{
    return (new HtmlSerializer(serializerSchema()))->serialize(['type' => 'doc', 'content' => $content]);
}

function paragraphOf(array ...$content): array
{
    return ['type' => 'paragraph', 'content' => $content];
}

function textOf(string $text, array ...$marks): array
{
    return ['type' => 'text', 'text' => $text, ...($marks === [] ? [] : ['marks' => $marks])];
}

it('renders nodes, void tags and empty nodes', function (): void {
    expect(serializeContent(paragraphOf(textOf('a'), ['type' => 'hardBreak'], textOf('b')), ['type' => 'paragraph']))
        ->toBe('<p>a<br>b</p><p></p>');
});

it('renders nested elements around children', function (): void {
    expect(serializeContent(['type' => 'code', 'content' => [textOf('x')]]))->toBe('<pre><code>x</code></pre>');
});

it('renders string children as escaped text', function (): void {
    expect(serializeContent(paragraphOf(['type' => 'token', 'attrs' => ['label' => '<b>']])))
        ->toBe('<p><span label="&lt;b&gt;">&lt;b&gt;</span></p>');
});

it('keeps a shared mark open across text nodes', function (): void {
    expect(serializeContent(paragraphOf(textOf('a', ['type' => 'bold'], ['type' => 'italic']), textOf('b', ['type' => 'bold']))))
        ->toBe('<p><strong><em>a</em>b</strong></p>');
});

it('closes marks that differ only by attributes', function (): void {
    $first = ['type' => 'link', 'attrs' => ['href' => 'https://a.test']];
    $second = ['type' => 'link', 'attrs' => ['href' => 'https://b.test']];

    expect(serializeContent(paragraphOf(textOf('a', $first), textOf('b', $second))))
        ->toBe('<p><a href="https://a.test">a</a><a href="https://b.test">b</a></p>');
});

it('keeps marks on inline nodes', function (): void {
    expect(serializeContent(paragraphOf(textOf('a', ['type' => 'bold']), ['type' => 'hardBreak', 'marks' => [['type' => 'bold']]], textOf('b', ['type' => 'bold']))))
        ->toBe('<p><strong>a<br>b</strong></p>');
});

it('ignores marks in nodes that do not allow them', function (): void {
    expect(serializeContent(['type' => 'code', 'content' => [textOf('x', ['type' => 'bold'])]]))
        ->toBe('<pre><code>x</code></pre>');
});

it('escapes text and attributes', function (): void {
    expect(serializeContent(paragraphOf(textOf('a & <b>'))))->toBe('<p>a &amp; &lt;b&gt;</p>')
        ->and(serializeContent(paragraphOf(textOf('x', ['type' => 'link', 'attrs' => ['href' => 'https://a.test/"><script>']]))))
        ->not->toContain('"><script>');
});

it('keeps the children of unknown nodes and ignores unknown marks', function (): void {
    expect(serializeContent(['type' => 'mystery', 'content' => [paragraphOf(textOf('a', ['type' => 'mystery']))]]))
        ->toBe('<p>a</p>');
});

it('refuses event handlers and bad attribute names even from a plugin', function (): void {
    expect(serializeContent(['type' => 'evil']))->toBe('<div ok="yes"></div>');
});

it('refuses bad tag names and keeps the children', function (): void {
    expect(serializeContent(['type' => 'badTag', 'content' => [paragraphOf(textOf('a'))]]))->toBe('<p>a</p>');
});

it('skips malformed content instead of throwing', function (array $node): void {
    expect(serializeContent(paragraphOf(textOf('ok')), $node))->toContain('<p>ok</p>');
})->with([
    'string content' => [['type' => 'paragraph', 'content' => 'x']],
    'non-string text' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => ['x']]]]],
    'non-array child' => [['type' => 'paragraph', 'content' => ['x', 1, null]]],
    'missing type' => [['content' => []]],
    'non-string type' => [['type' => ['x']]],
    'string marks' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x', 'marks' => 'bold']]]],
    'non-array mark' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x', 'marks' => ['bold', ['nope' => 1]]]]]],
    'string attrs' => [['type' => 'token', 'attrs' => 'x']],
    'array attribute value' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'link', 'attrs' => ['href' => ['x']]]]]]]],
]);

it('renders sibling elements before and after the children', function (): void {
    $schema = new ContentSchema([
        NodeSpec::make('paragraph')->renderTag('p'),
        NodeSpec::make('item')->renderUsing(fn (array $node, array $attributes): array => [
            'li', $attributes, ['label', ['input', ['type' => 'checkbox', 'disabled' => 'disabled']], ['span']], ['div', 0], 'after',
        ]),
    ], []);

    $html = (new HtmlSerializer($schema))->serialize(['type' => 'doc', 'content' => [
        ['type' => 'item', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'x']]]]],
    ]]);

    expect($html)->toBe('<li><label><input type="checkbox" disabled="disabled"><span></span></label><div><p>x</p></div>after</li>');
});

it('renders text and elements that come before the children', function (): void {
    $schema = new ContentSchema([
        NodeSpec::make('paragraph')->renderTag('p'),
        NodeSpec::make('box')->renderUsing(fn (): array => ['div', 'before', ['hr'], 0]),
    ], []);

    $html = (new HtmlSerializer($schema))->serialize(['type' => 'doc', 'content' => [
        ['type' => 'box', 'content' => [['type' => 'paragraph']]],
    ]]);

    expect($html)->toBe('<div>before<hr><p></p></div>');
});

it('renders nothing for a global attribute value that is not valid', function (mixed $value): void {
    $schema = new ContentSchema(
        [NodeSpec::make('paragraph')->renderTag('p')],
        [],
        [GlobalAttribute::style('color', 'color')->types(['paragraph'])->pattern('[a-z]+|#[0-9a-fA-F]{3,6}')],
    );

    expect((new HtmlSerializer($schema))->serialize(['type' => 'doc', 'content' => [
        ['type' => 'paragraph', 'attrs' => ['color' => $value], 'content' => [['type' => 'text', 'text' => 'a']]],
    ]]))->toBe('<p>a</p>');
})->with(['red; background: url(x)', 'url(x)', 'red"><script>', [['red']], 12, null]);

it('leaves out an attribute whose name ends in a newline', function (): void {
    $schema = new ContentSchema([
        NodeSpec::make('paragraph')->renderUsing(fn (): array => ['p', ["href\n" => 'javascript:x', "title\n" => 't', 'id' => 'ok'], 0]),
    ], []);

    expect((new HtmlSerializer($schema))->serialize(['type' => 'doc', 'content' => [['type' => 'paragraph']]]))->toBe('<p id="ok"></p>');
});

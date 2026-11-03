<?php

use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Tests\TestCase;

uses(TestCase::class);

function markedText(string $text, string $mark, array $attrs = []): array
{
    return ['type' => 'text', 'text' => $text, 'marks' => [['type' => $mark, 'attrs' => $attrs]]];
}

it('renders every core mark and node to HTML', function (): void {
    $html = RichContentPlusRenderer::make([
        'type' => 'doc',
        'content' => [
            ['type' => 'paragraph', 'content' => [
                markedText('bold', 'bold'),
                markedText('italic', 'italic'),
                markedText('under', 'underline'),
                markedText('strike', 'strike'),
                markedText('link', 'link', ['href' => 'https://example.com']),
            ]],
            ['type' => 'blockquote', 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'quoted']]],
            ]],
        ],
    ])->toHtml();

    expect($html)
        ->toContain('<strong>bold</strong>')
        ->toContain('<em>italic</em>')
        ->toContain('<u>under</u>')
        ->toContain('<s>strike</s>')
        ->toContain('href="https://example.com"')
        ->toContain('target="_blank"')
        ->toContain('<blockquote><p>quoted</p></blockquote>');
});

it('only understands the plugins it was given', function (): void {
    $html = RichContentPlusRenderer::make([
        'type' => 'doc',
        'content' => [['type' => 'paragraph', 'content' => [markedText('bold', 'bold')]]],
    ])->plugins([BlockquotePlugin::make()])->toHtml();

    expect($html)->not->toContain('<strong>');
});

it('renders bold when the bold plugin is registered', function (): void {
    $html = RichContentPlusRenderer::make([
        'type' => 'doc',
        'content' => [['type' => 'paragraph', 'content' => [markedText('bold', 'bold')]]],
    ])->plugins([BoldPlugin::make()])->toHtml();

    expect($html)->toContain('<strong>bold</strong>');
});

it('converts HTML to a document array', function (): void {
    $document = RichContentPlusRenderer::make('<p><strong>hi</strong></p>')->toArray();

    expect($document['type'])->toBe('doc')
        ->and($document['content'][0]['content'][0]['marks'][0]['type'])->toBe('bold');
});

it('renders empty content as an empty string', function (): void {
    expect(RichContentPlusRenderer::make(null)->toHtml())->toBe('');
});

it('renders the block plugins on the server', function (): void {
    $text = fn (string $value): array => ['type' => 'text', 'text' => $value];
    $item = fn (string $value): array => ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [$text($value)]]]];

    $html = RichContentPlusRenderer::make([
        'type' => 'doc',
        'content' => [
            ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [$text('Title')]],
            ['type' => 'bulletList', 'content' => [$item('one')]],
            ['type' => 'orderedList', 'attrs' => ['start' => 1], 'content' => [$item('two')]],
            ['type' => 'codeBlock', 'content' => [$text('code')]],
            ['type' => 'horizontalRule'],
        ],
    ])->toHtml();

    expect($html)
        ->toContain('<h2>Title</h2>')
        ->toContain('<ul><li><p>one</p></li></ul>')
        ->toContain('<ol')
        ->toContain('<pre><code>code</code></pre>')
        ->toContain('<hr');
});

it('treats JSON that is not a document as text, not as a document', function (string $content): void {
    $html = RichContentPlusRenderer::make($content)->toHtml();

    expect($html)->toBeString()
        ->and(RichContentPlusRenderer::make($content)->toArray()['type'])->toBe('doc');
})->with(['123', '{}', '[]', '"x"', 'null', 'true', '{"content":"x"}', '{"type":"paragraph"}']);

it('renders a JSON string document', function (): void {
    $json = json_encode(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]]]]);

    expect(RichContentPlusRenderer::make($json)->toHtml())->toBe('<p>a</p>');
});

it('returns an array document as given', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'mystery', 'attrs' => ['x' => 1]]]];

    expect(RichContentPlusRenderer::make($document)->toArray())->toBe($document);
});

it('makes HTML from outside the field safe to print and to store', function (string $input, string $forbidden): void {
    expect(RichContentPlusRenderer::make($input)->parseHtml()->toHtml())->not->toContain($forbidden)
        ->and(RichContentPlusRenderer::make($input)->toStorableHtml())->not->toContain($forbidden);
})->with([
    ['<script>alert(1)</script><p>a</p>', 'alert'],
    ['<p onclick="alert(1)">a</p>', 'onclick'],
    ['<img src=x onerror=alert(1)>', 'onerror'],
    ['<a href="javascript:alert(1)">a</a>', 'javascript'],
    ['<a href="java&#9;script:alert(1)">a</a>', 'script:'],
    ['<a href="https://a.test" onclick="x">a</a>', 'onclick'],
    ['<p style="background: url(x)">a</p>', 'style'],
    ['<iframe src="https://a.test"></iframe>', 'iframe'],
]);

it('makes crafted documents safe to print', function (array $node, string $forbidden): void {
    expect(RichContentPlusRenderer::make(['type' => 'doc', 'content' => [$node]])->toHtml())->not->toContain($forbidden);
})->with([
    [['type' => 'paragraph', 'attrs' => ['onclick' => 'x'], 'content' => [['type' => 'text', 'text' => '<script>']]], '<script>'],
    [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]]]]], 'javascript'],
    [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'https://a.test', 'title' => '"><script>']]]]]], '"><script>'],
    [['type' => 'heading', 'attrs' => ['level' => '2><script>'], 'content' => []], '<script>'],
    [['type' => 'codeBlock', 'attrs' => ['language' => '"><script>'], 'content' => []], '"><script>'],
]);

it('keeps prepared data out of storable HTML', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'mention', 'attrs' => ['id' => '1', 'label' => 'Old', 'char' => '@']],
    ]]]];

    $provider = MentionProvider::make('@')
        ->getLabelsUsing(fn (): array => ['1' => 'New'])
        ->getUrlUsing(fn (): string => '/people/1');

    $renderer = RichContentPlusRenderer::make($document)->plugins([MentionPlugin::make()->providers([$provider])]);

    expect($renderer->toHtml())->toContain('New')->toContain('href="/people/1"')
        ->and($renderer->toStorableHtml())->toContain('Old')->not->toContain('New')->not->toContain('href');
});

it('never stores a forged mention href', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'mention', 'attrs' => ['id' => '1', 'label' => 'Ada', 'char' => '@', 'href' => 'https://evil.example']],
    ]]]];

    expect(RichContentPlusRenderer::make($document)->plugins([MentionPlugin::make()])->toStorableHtml())->not->toContain('evil');
});

it('survives a malformed document with mentions in it', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => 'x'], 'y', ['type' => 'blockquote', 'content' => ['z']]]];

    expect(RichContentPlusRenderer::make($document)->plugins([MentionPlugin::make()])->toHtml())->toBeString()
        ->and(RichContentPlusRenderer::make($document)->plugins([MentionPlugin::make()])->toText())->toBeString();
});

it('survives malformed mention attributes when preparing a document', function (mixed $attrs): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'mention', 'attrs' => $attrs]]]]];
    $renderer = RichContentPlusRenderer::make($document)->plugins([MentionPlugin::make()->providers([MentionProvider::make('@')])]);

    expect($renderer->toHtml())->toContain('rep-mention')
        ->and($renderer->toText())->toBeString();
})->with([
    'array label' => [['id' => '1', 'label' => ['x'], 'char' => '@']],
    'array id' => [['id' => ['x'], 'label' => 'Ada', 'char' => '@']],
    'array char' => [['id' => '1', 'label' => 'Ada', 'char' => ['x']]],
    'string attrs' => ['x'],
]);

it('produces the same HTML after the first save', function (string $html): void {
    $once = RichContentPlusRenderer::make($html)->toStorableHtml();

    expect(RichContentPlusRenderer::make($once)->toStorableHtml())->toBe($once);
})->with([
    '<p>a <strong>b</strong> c</p>',
    '<div>a</div><div>b</div>',
    '<ul><li>a</li><li><p>b</p></li></ul>',
    '<pre><code class="language-php">  a

    b</code></pre>',
    '<p><a href="https://a.test" target="_blank">x</a></p>',
    'bare text',
]);

it('round trips every core node', function (): void {
    $document = ['type' => 'doc', 'content' => [
        ['type' => 'paragraph', 'content' => [
            ['type' => 'text', 'text' => 'a'],
            ['type' => 'hardBreak'],
            ['type' => 'text', 'text' => 'b', 'marks' => [['type' => 'bold'], ['type' => 'italic']]],
            ['type' => 'text', 'text' => 'c', 'marks' => [['type' => 'underline'], ['type' => 'strike']]],
        ]],
        ['type' => 'heading', 'attrs' => ['level' => 3], 'content' => [['type' => 'text', 'text' => 'd']]],
        ['type' => 'blockquote', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'e']]]]],
        ['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'f']]]]]]],
        ['type' => 'orderedList', 'attrs' => ['start' => 2, 'type' => 'a'], 'content' => [['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'g']]]]]]],
        ['type' => 'codeBlock', 'attrs' => ['language' => 'php'], 'content' => [['type' => 'text', 'text' => "  h\n  i"]]],
        ['type' => 'horizontalRule'],
    ]];

    $html = RichContentPlusRenderer::make($document)->toStorableHtml();

    expect(RichContentPlusRenderer::make($html)->toArray())->toEqual($document);
});

it('renders many documents, keeping their keys and order', function (): void {
    $paragraph = fn (string $text): array => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]]];

    $html = RichContentPlusRenderer::many(collect([
        'json' => json_encode($paragraph('from json')),
        'array' => $paragraph('from array'),
        'html' => '<p><strong>from html</strong></p>',
        'empty' => null,
    ]))->toHtml();

    expect($html)->toBe([
        'json' => '<p>from json</p>',
        'array' => '<p>from array</p>',
        'html' => '<p><strong>from html</strong></p>',
        'empty' => '',
    ]);
});

it('renders many documents to text', function (): void {
    expect(RichContentPlusRenderer::many(['<p>one</p>', '<p>two</p>'])->toText())->toBe(['one', 'two']);
});

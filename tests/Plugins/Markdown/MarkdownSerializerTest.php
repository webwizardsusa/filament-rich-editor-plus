<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\UnsupportedContentFormatException;
use Hollyit\RichEditorPlus\Plugins\Core\CodePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownSerializer;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkRule;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\CoreRules;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

/**
 * @param  array<array<string, mixed>>  $blocks
 */
function mdWrite(array $blocks, bool $strict = true): string
{
    $registry = PluginRegistry::make([
        ...array_filter(PluginRegistry::defaultPlugins(), static fn ($plugin): bool => ! $plugin instanceof HeadingPlugin),
        HeadingPlugin::make()->levels([1, 2, 3, 4, 5, 6]),
        TaskListPlugin::make(),
        CodePlugin::make(),
    ]);

    return (new MarkdownSerializer(CoreRules::nodes(), CoreRules::marks(), $strict))
        ->serialize(['type' => 'doc', 'content' => $blocks], ContentSchema::fromRegistry($registry));
}

/**
 * @param  array<array<string, mixed>>  $marks
 * @return array<string, mixed>
 */
function mdText(string $text, array $marks = []): array
{
    return $marks === [] ? ['type' => 'text', 'text' => $text] : ['type' => 'text', 'text' => $text, 'marks' => $marks];
}

/**
 * @param  array<array<string, mixed>>  $content
 * @return array<string, mixed>
 */
function mdP(array $content = []): array
{
    return ['type' => 'paragraph', 'content' => $content];
}

it('writes an empty document as an empty string', function (): void {
    expect(mdWrite([]))->toBe('');
});

it('drops empty paragraphs', function (): void {
    expect(mdWrite([mdP([mdText('a')]), mdP(), mdP([mdText('b')]), mdP()]))->toBe("a\n\nb\n");
});

it('moves spaces outside marks', function (): void {
    expect(mdWrite([mdP([mdText('a '), mdText('bold ', [['type' => 'bold']]), mdText('end')])]))->toBe("a **bold** end\n");
});

it('nests marks', function (): void {
    expect(mdWrite([mdP([mdText('both', [['type' => 'bold'], ['type' => 'italic']])])]))->toBe("***both***\n");
});

it('fences code spans around backticks', function (string $code, string $expected): void {
    expect(mdWrite([mdP([mdText($code, [['type' => 'code']])])]))->toBe($expected."\n");
})->with([
    ['a`b', '``a`b``'],
    ['`a', '`` `a ``'],
    ['plain', '`plain`'],
]);

it('writes link titles and awkward URLs', function (): void {
    expect(mdWrite([mdP([mdText('x', [['type' => 'link', 'attrs' => ['href' => 'https://e.com/a b', 'title' => 'Say "hi"']]])])]))
        ->toBe("[x](<https://e.com/a b> \"Say \\\"hi\\\"\")\n");
});

it('writes a link with an unsafe URL as its text only, strict or lenient', function (string $href, bool $strict): void {
    $link = [['type' => 'link', 'attrs' => ['href' => $href]]];

    expect(mdWrite([mdP([mdText('see '), mdText('x', $link), mdText(' now')])], $strict))->toBe("see x now\n");
})->with([
    'javascript' => ['javascript:alert(1)'],
    'mixed case' => ['JaVaScRiPt:alert(1)'],
    'split by a newline' => ["java\nscript:alert(1)"],
    'data' => ['data:text/html;base64,PHNjcmlwdD4='],
    'vbscript' => ['vbscript:x'],
])->with(['strict' => true, 'lenient' => false]);

it('keeps links with allowed or relative URLs', function (string $href): void {
    expect(mdWrite([mdP([mdText('x', [['type' => 'link', 'attrs' => ['href' => $href]]])])]))->toBe("[x]({$href})\n");
})->with(['https://e.com', 'http://e.com', 'mailto:a@e.com', 'tel:+123', '/docs/page', '#section', 'page.html']);

it('checks links against the protocols the link plugin allows', function (): void {
    $registry = PluginRegistry::make([LinkPlugin::make()->protocols(['https'])]);
    $writer = new MarkdownSerializer(CoreRules::nodes(), CoreRules::marks());
    $text = static fn (string $href): array => mdText('x', [['type' => 'link', 'attrs' => ['href' => $href]]]);

    expect($writer->serialize(['type' => 'doc', 'content' => [mdP([$text('https://e.com')])]], ContentSchema::fromRegistry($registry)))->toBe("[x](https://e.com)\n")
        ->and($writer->serialize(['type' => 'doc', 'content' => [mdP([$text('mailto:a@e.com')])]], ContentSchema::fromRegistry($registry)))->toBe("x\n");
});

it('percent-encodes line breaks in link destinations', function (): void {
    expect(mdWrite([mdP([mdText('x', [['type' => 'link', 'attrs' => ['href' => "https://a\r\n\n<img src=x>"]]])])]))
        ->toBe("[x](<https://a%0D%0A%0A\\<img src=x\\>>)\n");
});

it('strips all whitespace and backticks from a code block language', function (): void {
    $code = ['type' => 'codeBlock', 'attrs' => ['language' => "js\n```\t<b>\r\nx"], 'content' => [mdText('code')]];

    expect(mdWrite([$code]))->toBe("```js<b>x\ncode\n```\n");
});

it('keeps the ordered list start', function (): void {
    $item = static fn (string $text): array => ['type' => 'listItem', 'content' => [mdP([mdText($text)])]];

    expect(mdWrite([['type' => 'orderedList', 'attrs' => ['start' => 9], 'content' => [$item('nine'), $item('ten')]]]))
        ->toBe("9. nine\n10. ten\n");
});

it('keeps adjacent lists apart', function (): void {
    $item = static fn (string $text): array => ['type' => 'listItem', 'content' => [mdP([mdText($text)])]];
    $task = static fn (string $text): array => ['type' => 'taskItem', 'attrs' => ['checked' => false], 'content' => [mdP([mdText($text)])]];

    expect(mdWrite([
        ['type' => 'bulletList', 'content' => [$item('a')]],
        ['type' => 'bulletList', 'content' => [$item('b')]],
        ['type' => 'taskList', 'content' => [$task('c')]],
        ['type' => 'orderedList', 'attrs' => ['start' => 1], 'content' => [$item('d')]],
        ['type' => 'orderedList', 'attrs' => ['start' => 1], 'content' => [$item('e')]],
    ]))->toBe("- a\n\n* b\n\n- [ ] c\n\n1. d\n\n1) e\n");
});

it('escapes only what would start Markdown', function (string $text, string $expected): void {
    expect(mdWrite([mdP([mdText($text)])]))->toBe($expected."\n");
})->with([
    'snake case' => ['snake_case stays', 'snake_case stays'],
    'emphasis underscores' => ['_not italic_', '\_not italic\_'],
    'stars' => ['2 * 3', '2 \* 3'],
    'heading' => ['# no', '\# no'],
    'hash mid-line' => ['C# yes', 'C# yes'],
    'ordered' => ['1. no', '1\. no'],
    'bullet' => ['- no', '\- no'],
    'quote' => ['> no', '\> no'],
    'brackets' => ['[a]', '\[a\]'],
    'html' => ['a <b> c', 'a \<b> c'],
    'less than' => ['1 < 2', '1 < 2'],
    'entity' => ['&amp; and &', '\&amp; and &'],
    'backslash' => ['a\\b', 'a\\\\b'],
    'tilde' => ['~~no~~', '\~\~no\~\~'],
    'leading spaces' => ['    four spaces', 'four spaces'],
    'leading tab' => ["\tindented", 'indented'],
    'indented heading' => ['  # x', '\# x'],
]);

it('keeps emphasis working next to punctuation by writing HTML', function (array $parts, string $expected): void {
    $text = static fn (array $part): array => mdText($part[0], array_map(static fn (string $type): array => ['type' => $type], $part[1] ?? []));

    expect(mdWrite([mdP(array_map($text, $parts))]))->toBe($expected."\n");
})->with([
    'bold quotes between words' => [[['x'], ['"foo"', ['bold']], ['y']], 'x<strong>"foo"</strong>y'],
    'bold trailing dot' => [[['foo.', ['bold']], ['bar']], '<strong>foo.</strong>bar'],
    'strike parentheses' => [[['a'], ['(x)', ['strike']], ['b']], 'a<del>(x)</del>b'],
    'italic quotes' => [[['say'], ['"hi"', ['italic']]], 'say<em>"hi"</em>'],
    'currency symbol' => [[['only'], ['€5', ['bold']]], 'only<strong>€5</strong>'],
    'degree symbol' => [[['it was 20'], ['°C', ['bold']]], 'it was 20<strong>°C</strong>'],
    'arrow' => [[['a'], ['→', ['bold']], ['b']], 'a<strong>→</strong>b'],
    'copyright' => [[['Acme'], ['©', ['italic']], [' 2024']], 'Acme<em>©</em> 2024'],
    'emoji then word' => [[['Done ✅', ['bold']], ['next']], '<strong>Done ✅</strong>next'],
    'bold around strike' => [[['x'], ['a', ['bold', 'strike']], ['y']], 'x<strong>~~a~~</strong>y'],
    'bold then strike glued to letters' => [[['x'], ['a', ['bold']], ['b', ['strike']], ['y']], 'x**a**~~b~~y'],
    'italic then bold touching' => [[['x '], ['a', ['italic']], ['b', ['bold']], [' y']], 'x <em>a</em><strong>b</strong> y'],
    'punctuation next to space keeps delimiters' => [[['x '], ['"foo"', ['bold']], [' y']], 'x **"foo"** y'],
    'words keep delimiters' => [[['x'], ['foo', ['bold']], ['y']], 'x**foo**y'],
]);

it('closes heading text that ends like an ATX closing sequence', function (string $text, string $expected): void {
    expect(mdWrite([['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [mdText($text)]]]))->toBe($expected."\n");
})->with([
    'trailing hashes' => ['Item ##', '## Item \#\#'],
    'only a hash' => ['#', '## \#'],
    'hash inside a word' => ['C#', '## C#'],
]);

it('escapes an exclamation mark before a link', function (): void {
    expect(mdWrite([mdP([mdText('wow!'), mdText('x', [['type' => 'link', 'attrs' => ['href' => 'https://e.com']]])])]))
        ->toBe("wow\\![x](https://e.com)\n");
});

it('keeps the spaces inside a code span', function (): void {
    expect(mdWrite([mdP([mdText(' a ', [['type' => 'code']])])]))->toBe("`  a  `\n");
});

it('applies every wrapping mark to the already wrapped text', function (): void {
    $marks = [...CoreRules::marks(), 'sup' => MarkRule::wrapping(static fn (string $text): string => '<sup>'.$text.'</sup>')];
    $registry = PluginRegistry::make([...PluginRegistry::defaultPlugins(), CodePlugin::make()]);
    $document = ['type' => 'doc', 'content' => [mdP([mdText('x', [['type' => 'code'], ['type' => 'sup']])])]];

    expect((new MarkdownSerializer(CoreRules::nodes(), $marks))->serialize($document, ContentSchema::fromRegistry($registry)))
        ->toBe("<sup>`x`</sup>\n");
});

it('escapes pipes in paragraphs with hard breaks so no table can form', function (): void {
    expect(mdWrite([mdP([mdText('a | b'), ['type' => 'hardBreak'], mdText('-- | --')]), mdP([mdText('c | d')])]))
        ->toBe("a \\| b\\\n-- \\| --\n\nc | d\n");
});

it('writes unknown block nodes as separate escaped paragraphs when lenient', function (): void {
    expect(mdWrite([['type' => 'mystery', 'content' => [mdP([mdText('one')]), mdP([mdText('# two')])]]], strict: false))
        ->toBe("one\n\n\\# two\n");
});

it('opens a list item with a non-paragraph block on the next line', function (): void {
    $item = ['type' => 'listItem', 'content' => [['type' => 'horizontalRule']]];

    expect(mdWrite([['type' => 'bulletList', 'content' => [$item]]]))->toBe("-\n  ---\n");
});

it('loosens list items that hold more than a paragraph and nested lists', function (): void {
    $item = ['type' => 'listItem', 'content' => [mdP([mdText('a')]), ['type' => 'horizontalRule']]];

    expect(mdWrite([['type' => 'bulletList', 'content' => [$item]]]))->toBe("- a\n\n  ---\n");
});

it('drops a trailing hard break', function (): void {
    expect(mdWrite([mdP([mdText('a'), ['type' => 'hardBreak']])]))->toBe("a\n");
});

it('refuses nodes and marks without rules when strict', function (): void {
    mdWrite([mdP([mdText('u', [['type' => 'underline']])])]);
})->throws(UnsupportedContentFormatException::class);

it('falls back to text and drops marks when lenient', function (): void {
    expect(mdWrite([mdP([mdText('u', [['type' => 'underline']])]), ['type' => 'mystery', 'content' => [mdP([mdText('inside')])]]], strict: false))
        ->toBe("u\n\ninside\n");
});

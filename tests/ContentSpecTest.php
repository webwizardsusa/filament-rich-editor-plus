<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\ContentSpec;
use Hollyit\RichEditorPlus\Content\GlobalAttribute;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Tests\TestCase;

uses(TestCase::class);

function specElement(string $html): DOMElement
{
    $document = new DOMDocument;
    $document->loadHTML('<?xml encoding="utf-8" ?><html><body>'.$html.'</body></html>', LIBXML_NOERROR);

    return $document->getElementsByTagName('body')->item(0)->firstElementChild;
}

it('matches by tag or by callback', function (): void {
    $spec = MarkSpec::make('bold')
        ->parseTags(['strong'])
        ->parseUsing(fn (DOMElement $element): bool => $element->getAttribute('data-bold') === 'yes');

    expect($spec->match(specElement('<strong>x</strong>')))->toBe([])
        ->and($spec->match(specElement('<span data-bold="yes">x</span>')))->toBe([])
        ->and($spec->match(specElement('<span>x</span>')))->toBeNull();
});

it('takes attributes from a parse callback', function (): void {
    $spec = NodeSpec::make('thing')->parseUsing(fn (): array => ['kind' => 'a'])->attribute('kind');

    expect($spec->parseAttributes(specElement('<div></div>'), $spec->match(specElement('<div></div>'))))
        ->toBe(['kind' => 'a']);
});

it('reads declared attributes, keeps 0 and fills in defaults', function (): void {
    $spec = NodeSpec::make('thing')->attribute('title')->attribute('size', default: 3);

    expect($spec->parseAttributes(specElement('<div title="0"></div>'), []))->toBe(['title' => '0', 'size' => 3]);
});

it('renders only declared attributes, with fixed attributes last', function (): void {
    $spec = NodeSpec::make('thing')->attribute('title')->htmlAttributes(['class' => 'fixed'])->renderTag('div');

    expect($spec->render(['attrs' => ['title' => 'x', 'onclick' => 'y']], false))
        ->toBe(['div', ['title' => 'x', 'class' => 'fixed'], 0]);
});

it('hands render callbacks the node and its HTML attributes', function (): void {
    $spec = NodeSpec::make('thing')
        ->attribute('title')
        ->renderUsing(fn (array $node, array $attributes): array => ['b', $attributes, $node['type']]);

    expect($spec->render(['type' => 'thing', 'attrs' => ['title' => 'x']], false))->toBe(['b', ['title' => 'x'], 'thing']);
});

it('leaves transient attributes out of parsing and storage', function (): void {
    $spec = NodeSpec::make('thing')->transientAttribute('href', ['https'])->renderTag('a');

    expect($spec->parseAttributes(specElement('<a href="https://a.test"></a>'), []))->toBe([])
        ->and($spec->render(['attrs' => ['href' => 'https://a.test']], true))->toBe(['a', [], 0])
        ->and($spec->render(['attrs' => ['href' => 'https://a.test']], false))->toBe(['a', ['href' => 'https://a.test'], 0]);
});

it('drops URL attributes that fail the protocol check', function (): void {
    $spec = MarkSpec::make('link')->urlAttribute('href', ['https'])->renderTag('a');

    expect($spec->render(['attrs' => ['href' => 'javascript:alert(1)']], false))->toBe(['a', [], 0]);
});

it('checks URLs against the allowed protocols', function (mixed $url, bool $allowed): void {
    expect(ContentSpec::isAllowedUrl($url, ['https', 'mailto']))->toBe($allowed);
})->with([
    ['https://a.test', true],
    ['HTTPS://a.test', true],
    ['mailto:a@a.test', true],
    ['/relative', true],
    ['#anchor', true],
    ['page.html?x=a:b', true],
    ['http://a.test', false],
    ['javascript:alert(1)', false],
    ['JaVaScRiPt:alert(1)', false],
    ["java\tscript:alert(1)", false],
    ["java\nscript:alert(1)", false],
    [" \x01javascript:alert(1)", false],
    ['data:text/html,x', false],
    [null, false],
    [['https://a.test'], false],
]);

it('reads a value from an inline style', function (): void {
    $element = specElement('<span style="color: red; FONT-WEIGHT: Bold">x</span>');

    expect(ContentSpec::styleValue($element, 'font-weight'))->toBe('bold')
        ->and(ContentSpec::styleValue($element, 'font-style'))->toBeNull();
});

it('uses the higher priority node rule, then registration order', function (): void {
    $schema = new ContentSchema([
        NodeSpec::make('first')->parseTags(['div']),
        NodeSpec::make('second')->parseTags(['div']),
        NodeSpec::make('urgent')->parseTags(['div'])->priority(51),
    ], []);

    expect($schema->matchNode(specElement('<div></div>'))[0]->getName())->toBe('urgent')
        ->and($schema->matchNode(specElement('<span></span>')))->toBeNull()
        ->and($schema->node('first'))->not->toBeNull()
        ->and($schema->node('missing'))->toBeNull();
});

it('matches every mark rule and ranks marks by priority', function (): void {
    $schema = new ContentSchema([], [
        MarkSpec::make('a')->parseTags(['b']),
        MarkSpec::make('b')->parseTags(['b']),
        MarkSpec::make('c')->priority(1000),
    ]);

    expect(array_map(fn (array $match): string => $match[0]->getName(), $schema->matchMarks(specElement('<b>x</b>'))))->toBe(['a', 'b'])
        ->and($schema->markRank('c'))->toBeLessThan($schema->markRank('a'))
        ->and($schema->markRank('a'))->toBeLessThan($schema->markRank('b'));
});

function alignAttribute(array|string $types = ['paragraph']): GlobalAttribute
{
    return GlobalAttribute::style('textAlign', 'text-align')->types($types)->values(['left', 'center', 'right']);
}

function globalSchema(array $globalAttributes, array $nodes = [], array $marks = []): ContentSchema
{
    return new ContentSchema(
        [NodeSpec::make('paragraph')->parseTags(['p'])->renderTag('p'), ...$nodes],
        [MarkSpec::make('bold')->parseTags(['strong'])->renderTag('strong'), ...$marks],
        $globalAttributes,
    );
}

function globalHtml(ContentSchema $schema, array ...$content): string
{
    return (new HtmlSerializer($schema))->serialize(['type' => 'doc', 'content' => $content]);
}

it('adds global attributes to the specs they name, and only to copies', function (): void {
    $paragraph = NodeSpec::make('paragraph')->parseTags(['p'])->renderTag('p');
    $schema = new ContentSchema([$paragraph], [], [alignAttribute()]);
    $element = specElement('<p style="text-align: center">x</p>');

    expect($schema->node('paragraph'))->not->toBe($paragraph)
        ->and($schema->node('paragraph')->parseAttributes($element, []))->toBe(['textAlign' => 'center'])
        ->and($paragraph->parseAttributes($element, []))->toBe([]);
});

it('applies to every node, every mark, or both', function (array|string $types, array $expected): void {
    $schema = globalSchema([alignAttribute($types)], [NodeSpec::make('heading')->parseTags(['h2'])->renderTag('h2')]);
    $element = specElement('<p style="text-align: right">x</p>');

    expect([
        'paragraph' => array_key_exists('textAlign', $schema->node('paragraph')->parseAttributes($element, [])),
        'heading' => array_key_exists('textAlign', $schema->node('heading')->parseAttributes($element, [])),
        'bold' => array_key_exists('textAlign', $schema->mark('bold')->parseAttributes($element, [])),
    ])->toBe($expected);
})->with([
    'all' => ['*', ['paragraph' => true, 'heading' => true, 'bold' => true]],
    'nodes' => ['nodes', ['paragraph' => true, 'heading' => true, 'bold' => false]],
    'marks' => ['marks', ['paragraph' => false, 'heading' => false, 'bold' => true]],
    'named' => [['heading'], ['paragraph' => false, 'heading' => true, 'bold' => false]],
]);

it('ignores types the editor does not have', function (): void {
    $schema = globalSchema([alignAttribute(['paragraph', 'missing'])]);

    expect($schema->node('missing'))->toBeNull()
        ->and($schema->node('paragraph')->parseAttributes(specElement('<p style="text-align: left">x</p>'), []))->toBe(['textAlign' => 'left']);
});

it('rejects an invalid global attribute when the schema is built', function (): void {
    expect(fn () => globalSchema([GlobalAttribute::style('a', 'color')->types(['paragraph'])]))
        ->toThrow(InvalidArgumentException::class);
});

it('rejects a global attribute that shares its name with an attribute of the spec', function (): void {
    expect(fn () => new ContentSchema([NodeSpec::make('paragraph')->parseTags(['p'])->attribute('textAlign')->renderTag('p')], [], [alignAttribute()]))
        ->toThrow(InvalidArgumentException::class, 'textAlign');
});

it('rejects two global attributes with the same name on one type', function (): void {
    expect(fn () => globalSchema([alignAttribute(), alignAttribute(['paragraph', 'heading'])]))
        ->toThrow(InvalidArgumentException::class, 'textAlign');
});

it('allows global attributes with the same name on different types', function (): void {
    expect(fn () => globalSchema([alignAttribute(['paragraph']), alignAttribute(['heading'])], [NodeSpec::make('heading')->renderTag('h2')]))
        ->not->toThrow(InvalidArgumentException::class);
});

it('parses global attributes before the spec its own, null included', function (): void {
    $schema = globalSchema([alignAttribute(['heading'])], [NodeSpec::make('heading')->parseTags(['h2'])->attribute('level', default: 2)->renderTag('h2')]);
    $attributes = $schema->node('heading')->parseAttributes(specElement('<h2>x</h2>'), []);

    expect($attributes)->toBe(['textAlign' => null, 'level' => 2])
        ->and(array_keys($attributes))->toBe(['textAlign', 'level']);
});

it('renders global attributes before the spec its own', function (): void {
    $anchor = GlobalAttribute::html('anchor', 'id')->types(['note'])->pattern('[a-z]+');
    $schema = globalSchema([$anchor], [NodeSpec::make('note')->attribute('title')->renderTag('aside')]);

    expect(globalHtml($schema, ['type' => 'note', 'attrs' => ['title' => 't', 'anchor' => 'n']]))->toBe('<aside id="n" title="t"></aside>');
});

it('merges two style attributes into one style', function (): void {
    $lineHeight = GlobalAttribute::style('lineHeight', 'line-height')->types(['paragraph'])->pattern('[0-9.]+');
    $schema = globalSchema([alignAttribute(), $lineHeight]);

    expect(globalHtml($schema, ['type' => 'paragraph', 'attrs' => ['textAlign' => 'center', 'lineHeight' => '1.5']]))
        ->toBe('<p style="text-align: center; line-height: 1.5"></p>');
});

it('merges classes without duplicates, and fixed attributes still win', function (): void {
    $tone = GlobalAttribute::html('tone', 'class')->types(['note', 'boxed'])->values(['lead', 'own']);
    $schema = globalSchema([$tone], [
        NodeSpec::make('note')->attribute('kind', render: fn (array $attrs): array => ['class' => 'own kind'])->renderTag('div'),
        NodeSpec::make('boxed')->htmlAttributes(['class' => 'fixed'])->renderTag('div'),
    ]);

    expect(globalHtml($schema, ['type' => 'note', 'attrs' => ['tone' => 'own']]))->toBe('<div class="own kind"></div>')
        ->and(globalHtml($schema, ['type' => 'note', 'attrs' => ['tone' => 'lead']]))->toBe('<div class="lead own kind"></div>')
        ->and(globalHtml($schema, ['type' => 'boxed', 'attrs' => ['tone' => 'lead']]))->toBe('<div class="fixed"></div>');
});

it('merges styles by property, later values replacing earlier ones in place', function (): void {
    expect(ContentSpec::mergeHtmlAttributes(['style' => 'color: red; top: 0'], ['style' => 'color: blue', 'title' => null]))
        ->toBe(['style' => 'color: blue; top: 0'])
        ->and(ContentSpec::mergeHtmlAttributes(['title' => ''], ['title' => 'x']))->toBe(['title' => 'x'])
        ->and(ContentSpec::mergeHtmlAttributes(['title' => 'a'], ['title' => 'b']))->toBe(['title' => 'b']);
});

it('parses and renders global attributes on marks', function (): void {
    $tone = GlobalAttribute::html('tone', 'class')->types(['bold'])->values(['loud']);
    $schema = globalSchema([$tone]);
    $document = (new HtmlParser($schema))->parse('<p><strong class="LOUD">a</strong></p>');

    expect($document['content'][0]['content'][0]['marks'])->toBe([['type' => 'bold', 'attrs' => ['tone' => 'loud']]])
        ->and(globalHtml($schema, ...$document['content']))->toBe('<p><strong class="loud">a</strong></p>');
});

it('drops invalid values when parsing and keeps listed spellings', function (): void {
    $schema = globalSchema([alignAttribute()]);
    $parse = fn (string $html): mixed => (new HtmlParser($schema))->parse($html)['content'][0]['attrs'] ?? null;

    expect($parse('<p style="text-align: middle">a</p>'))->toBe(['textAlign' => null])
        ->and($parse('<p style="TEXT-ALIGN: CENTER">a</p>'))->toBe(['textAlign' => 'center'])
        ->and($parse('<p style="text-align: center; text-align: right">a</p>'))->toBe(['textAlign' => 'right']);
});

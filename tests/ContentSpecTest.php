<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\ContentSpec;
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

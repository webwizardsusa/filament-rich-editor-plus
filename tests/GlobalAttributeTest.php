<?php

use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

function globalAttributeElement(string $html): DOMElement
{
    $document = new DOMDocument;
    $document->loadHTML('<?xml encoding="utf-8" ?><html><body>'.$html.'</body></html>', LIBXML_NOERROR);

    return $document->getElementsByTagName('body')->item(0)->firstElementChild;
}

function textAlign(): GlobalAttribute
{
    return GlobalAttribute::style('textAlign', 'text-align')
        ->types(['paragraph', 'heading'])
        ->values(['left', 'center', 'right', 'justify']);
}

function anchor(): GlobalAttribute
{
    return GlobalAttribute::html('anchor', 'id')->types(['heading'])->pattern('[A-Za-z][A-Za-z0-9_-]*');
}

it('needs values or a pattern, but not both', function (): void {
    expect(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->assertValid())
        ->toThrow(InvalidArgumentException::class, 'values() or pattern()')
        ->and(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->values(['red'])->pattern('.+')->assertValid())
        ->toThrow(InvalidArgumentException::class, 'values() or pattern()')
        ->and(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->values([])->assertValid())
        ->toThrow(InvalidArgumentException::class);
});

it('needs types', function (): void {
    expect(fn () => GlobalAttribute::style('a', 'color')->values(['red'])->assertValid())
        ->toThrow(InvalidArgumentException::class, 'types()')
        ->and(fn () => GlobalAttribute::style('a', 'color')->types('blocks')->values(['red'])->assertValid())
        ->toThrow(InvalidArgumentException::class);
});

it('refuses attributes that can carry script or URLs', function (string $name): void {
    expect(fn () => GlobalAttribute::html('a', $name)->types(['paragraph'])->pattern('.+')->assertValid())
        ->toThrow(InvalidArgumentException::class);
})->with(['style', 'onclick', 'ONLOAD', 'href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'background', 'srcset', 'srcdoc', 'ping', 'data', 'codebase', 'cite', 'longdesc', 'xml:base', 'xmlns', 'bad name', "href\n", "onclick\n"]);

it('allows class and data attributes', function (string $name): void {
    expect(fn () => GlobalAttribute::html('a', $name)->types(['paragraph'])->values(['x'])->assertValid())
        ->not->toThrow(InvalidArgumentException::class);
})->with(['class', 'data-tone', 'id']);

it('refuses a style value list that could add declarations, and a broken pattern', function (): void {
    expect(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->values(['red; top: 0'])->assertValid())
        ->toThrow(InvalidArgumentException::class)
        ->and(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->pattern('(')->assertValid())
        ->toThrow(InvalidArgumentException::class, 'pattern')
        ->and(fn () => GlobalAttribute::style('a', 'not a property')->types(['paragraph'])->values(['x'])->assertValid())
        ->toThrow(InvalidArgumentException::class);
});

it('keeps listed values in their listed spelling, matched without regard to case', function (): void {
    $attribute = GlobalAttribute::style('a', 'text-align')->types(['paragraph'])->values(['Center', 'left']);

    expect($attribute->normalize('center'))->toBe('Center')
        ->and($attribute->normalize(' LEFT '))->toBe('left')
        ->and($attribute->normalize('middle'))->toBeNull();
});

it('anchors patterns', function (): void {
    expect(anchor()->normalize('intro'))->toBe('intro')
        ->and(anchor()->normalize('intro section'))->toBeNull()
        ->and(anchor()->normalize('1intro'))->toBeNull();
});

it('treats non-strings, empty values and style values with a semicolon as invalid', function (mixed $value): void {
    expect(GlobalAttribute::style('a', 'color')->types(['paragraph'])->pattern('.+')->normalize($value))->toBeNull();
})->with([null, 1, 1.5, true, [['red']], '', '   ', 'red; background: url(x)']);

it('allows a semicolon in an html attribute value', function (): void {
    expect(GlobalAttribute::html('a', 'title')->types(['paragraph'])->pattern('.+')->normalize('a; b'))->toBe('a; b');
});

it('reads a style property from raw style text, the last declaration winning', function (): void {
    expect(GlobalAttribute::styleValue('color: red; TEXT-ALIGN : Center ;', 'text-align'))->toBe('Center')
        ->and(GlobalAttribute::styleValue('text-align: left; text-align: right', 'text-align'))->toBe('right')
        ->and(GlobalAttribute::styleValue('color: #F00', 'color'))->toBe('#F00')
        ->and(GlobalAttribute::styleValue('color red', 'color'))->toBeNull()
        ->and(GlobalAttribute::styleValue('', 'color'))->toBeNull();
});

it('parses from an element', function (): void {
    expect(textAlign()->parse(globalAttributeElement('<p style="text-align: CENTER">x</p>')))->toBe('center')
        ->and(textAlign()->parse(globalAttributeElement('<p style="text-align: middle">x</p>')))->toBeNull()
        ->and(textAlign()->parse(globalAttributeElement('<p>x</p>')))->toBeNull()
        ->and(anchor()->parse(globalAttributeElement('<h2 id="intro">x</h2>')))->toBe('intro')
        ->and(anchor()->parse(globalAttributeElement('<h2>x</h2>')))->toBeNull();
});

it('renders valid values only', function (): void {
    expect(textAlign()->render('center'))->toBe(['style' => 'text-align: center'])
        ->and(textAlign()->render('center; background: url(x)'))->toBe([])
        ->and(textAlign()->render(null))->toBe([])
        ->and(anchor()->render('intro'))->toBe(['id' => 'intro']);
});

it('resolves its types against the schema', function (): void {
    $nodes = ['paragraph', 'heading'];
    $marks = ['bold'];

    expect(textAlign()->types('*')->resolveTypes($nodes, $marks))->toBe(['paragraph', 'heading', 'bold'])
        ->and(textAlign()->types('nodes')->resolveTypes($nodes, $marks))->toBe(['paragraph', 'heading'])
        ->and(textAlign()->types('marks')->resolveTypes($nodes, $marks))->toBe(['bold'])
        ->and(textAlign()->types(['heading', 'missing', 'bold'])->resolveTypes($nodes, $marks))->toBe(['heading', 'bold']);
});

it('describes itself for the browser', function (): void {
    expect(textAlign()->keepOnSplit(false)->toArray())->toBe([
        'name' => 'textAlign',
        'kind' => 'style',
        'key' => 'text-align',
        'types' => ['paragraph', 'heading'],
        'values' => ['left', 'center', 'right', 'justify'],
        'pattern' => null,
        'keepOnSplit' => false,
        'classes' => null,
    ])
        ->and(fn () => GlobalAttribute::style('a', 'color')->toArray())->toThrow(InvalidArgumentException::class)
        ->and(textAlign()->isProvidedByJsExtension())->toBeFalse()
        ->and(textAlign()->providedByJsExtension()->isProvidedByJsExtension())->toBeTrue();
});

it('refuses a style property with a custom property name or a trailing newline', function (string $property): void {
    expect(fn () => GlobalAttribute::style('a', $property)->types(['paragraph'])->values(['x'])->assertValid())
        ->toThrow(InvalidArgumentException::class);
})->with(['--x', "color\n"]);

it('needs a name of letters, digits and underscores', function (string $name): void {
    expect(fn () => GlobalAttribute::style($name, 'color')->types(['paragraph'])->values(['red'])->assertValid())
        ->toThrow(InvalidArgumentException::class, 'name');
})->with(['', '1a', 'a-b', 'a b', "a\n"]);

it('needs values to be strings', function (): void {
    expect(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->values(['red', 1])->assertValid())
        ->toThrow(InvalidArgumentException::class, 'strings');
});

it('refuses pattern syntax that only PCRE has', function (string $pattern): void {
    expect(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->pattern($pattern)->assertValid())
        ->toThrow(InvalidArgumentException::class, 'PHP and JavaScript share');
})->with(['\\Ared', 'red\\z', 'red\\Z', 'a++', 'a*+', 'a?+', 'a{1,2}+', '(?>a|ab)', '[[:alpha:]]']);

it('allows an escaped plus before a quantifier', function (): void {
    expect(fn () => GlobalAttribute::style('a', 'color')->types(['paragraph'])->pattern('\\++a')->assertValid())
        ->not->toThrow(InvalidArgumentException::class);
});

function palette(): GlobalAttribute
{
    return GlobalAttribute::classes('color', ['red' => 'has-red-color', 'blue' => 'has-blue-color'])->types(['textStyle']);
}

it('reads a class kind value from its class among others', function (): void {
    expect(palette()->parse(globalAttributeElement('<span class="x has-blue-color y">a</span>')))->toBe('blue')
        ->and(palette()->parse(globalAttributeElement('<span class="has-red-color has-blue-color">a</span>')))->toBe('red')
        ->and(palette()->parse(globalAttributeElement('<span class="has-teal-color">a</span>')))->toBeNull()
        ->and(palette()->parse(globalAttributeElement('<span>a</span>')))->toBeNull();
});

it('renders a class kind value as its class, and only known keys', function (mixed $value, array $expected): void {
    expect(palette()->render($value))->toBe($expected);
})->with([
    'known' => ['red', ['class' => 'has-red-color']],
    'unknown' => ['teal', []],
    'other case' => ['RED', []],
    'padded' => [' red', []],
    'number' => [3, []],
    'null' => [null, []],
]);

it('describes a class kind for the browser', function (): void {
    $array = palette()->toArray();

    expect($array)->toMatchArray(['name' => 'color', 'kind' => 'class', 'key' => 'class', 'values' => ['red', 'blue'], 'pattern' => null])
        ->and(json_encode($array['classes']))->toBe('{"red":"has-red-color","blue":"has-blue-color"}')
        ->and(textAlign()->toArray()['classes'])->toBeNull();
});

it('keeps numeric keys as strings for the browser', function (): void {
    $array = GlobalAttribute::classes('size', ['1' => 'size-1', '2' => 'size-2'])->types(['textStyle'])->toArray();

    expect($array['values'])->toBe(['1', '2'])
        ->and(json_encode($array['classes']))->toBe('{"1":"size-1","2":"size-2"}');
});

it('validates a class kind', function (Closure $make, string $message): void {
    expect(fn () => $make()->assertValid())->toThrow(InvalidArgumentException::class, $message);
})->with([
    'empty map' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', [])->types(['textStyle']), 'at least one class'],
    'bad key' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['Red' => 'red'])->types(['textStyle']), '[Red]'],
    'bad class' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => 'has red'])->types(['textStyle']), '[has red]'],
    'class with newline' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => "red\n"])->types(['textStyle']), 'not a valid CSS class'],
    'non-string class' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => 1])->types(['textStyle']), 'not a valid CSS class'],
    'shared class' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => 'x', 'rouge' => 'x'])->types(['textStyle']), 'same class'],
    'values too' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => 'x'])->types(['textStyle'])->values(['red']), 'values() and pattern()'],
    'pattern too' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => 'x'])->types(['textStyle'])->pattern('.+'), 'values() and pattern()'],
    'no types' => [fn (): GlobalAttribute => GlobalAttribute::classes('color', ['red' => 'x']), 'types()'],
]);

it('splits class lists on HTML whitespace only', function (string $class, ?string $expected): void {
    $document = new DOMDocument;
    $document->loadHTML('<?xml encoding="utf-8" ?><html><body><span></span></body></html>', LIBXML_NOERROR);
    $element = $document->getElementsByTagName('span')->item(0);
    $element->setAttribute('class', $class);

    expect(GlobalAttribute::classes('color', ['red' => 'has-red-color'])->parse($element))->toBe($expected);
})->with([
    'non-breaking space' => ["x\u{a0}has-red-color", null],
    'tab' => ["x\thas-red-color", 'red'],
    'newline' => ["x\nhas-red-color ", 'red'],
]);

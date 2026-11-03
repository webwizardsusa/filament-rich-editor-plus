<?php

use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\PaletteColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextColorPlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

function colouredHtml(string $html): string
{
    return RichContentPlusRenderer::make($html)->parseHtml()->plugins([BoldPlugin::make(), TextColorPlugin::make(), BackgroundColorPlugin::make()])->toHtml();
}

function colourElement(string $html): DOMElement
{
    $document = new DOMDocument;
    $document->loadHTML('<?xml encoding="utf-8" ?><html><body>'.$html.'</body></html>', LIBXML_NOERROR);

    return $document->getElementsByTagName('body')->item(0)->firstElementChild;
}

dataset('colour plugins', [
    'text' => [fn (): PaletteColorPlugin => TextColorPlugin::make(), [
        'id' => 'core/text-color', 'attribute' => 'color', 'tool' => 'textColor', 'label' => 'Text colour', 'current' => 'Text colour: :item',
        'icon' => 'mdi-format-color-text', 'order' => 65, 'set' => 'setTextColor', 'unset' => 'unsetTextColor', 'class' => 'has-red-color',
        'red' => '#dc2626', 'entry' => ['label' => 'Red', 'color' => '#dc2626'], 'property' => 'color', 'text' => 'A',
    ]],
    'background' => [fn (): PaletteColorPlugin => BackgroundColorPlugin::make(), [
        'id' => 'core/background-color', 'attribute' => 'backgroundColor', 'tool' => 'backgroundColor', 'label' => 'Highlight', 'current' => 'Highlight: :item',
        'icon' => 'mdi-format-color-highlight', 'order' => 66, 'set' => 'setBackgroundColor', 'unset' => 'unsetBackgroundColor', 'class' => 'has-red-background-color',
        'red' => '#fecaca', 'entry' => ['label' => 'Red', 'color' => '#fecaca', 'text' => '#1f2937'], 'property' => 'background-color', 'text' => null,
    ]],
]);

it('has its id, a default palette, and stays out of the defaults', function (Closure $make, array $expected): void {
    $plugin = $make();

    expect($plugin->getId())->toBe($expected['id'])
        ->and(array_keys($plugin->getColors()))->toBe(['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'])
        ->and($plugin->getColors()['red'])->toBe($expected['entry'])
        ->and($plugin->getClass('red'))->toBe($expected['class'])
        ->and(array_map(fn ($default): string => $default->getId(), PluginRegistry::defaultPlugins()))->not->toContain($expected['id']);
})->with('colour plugins');

it('declares the text style mark and a class attribute on it', function (Closure $make, array $expected): void {
    $plugin = $make()->colors(['red' => ['label' => 'Red', 'color' => '#f00']]);
    $attribute = $plugin->getGlobalAttributes()[0]->toArray();

    expect(array_map(fn (MarkSpec $mark): string => $mark->getName(), $plugin->getMarks()))->toBe(['textStyle'])
        ->and($attribute)->toMatchArray(['name' => $expected['attribute'], 'kind' => 'class', 'types' => ['textStyle'], 'values' => ['red']])
        ->and(json_encode($attribute['classes']))->toBe(json_encode(['red' => $expected['class']]))
        ->and($plugin->getJsExtension()->toArray())->toBe(['id' => $expected['id'], 'options' => ['colors' => ['red']]]);
})->with('colour plugins');

it('offers an inline swatch menu with a fallback default', function (Closure $make, array $expected): void {
    $tool = $make()->colors(['red' => ['label' => 'Red', 'color' => '#f00'], 'sky' => ['label' => 'Sky', 'color' => 'rgb(0, 128, 255)']])->getTools()[0];
    $items = array_map(fn (ToolMenuItem $item): array => $item->toArray(), $tool->getMenu());

    expect($tool->getName())->toBe($expected['tool'])
        ->and($tool->getLabel())->toBe($expected['label'])
        ->and($tool->getCurrentLabel())->toBe($expected['current'])
        ->and($tool->getIcon())->toBe($expected['icon'])
        ->and($tool->toArray())->toMatchArray(['scope' => 'inline', 'group' => 'color', 'order' => $expected['order']])
        ->and(array_column($items, 'name'))->toBe(['default', 'red', 'sky'])
        ->and($items[0])->toMatchArray(['label' => 'Default', 'command' => $expected['unset'], 'arguments' => [], 'active' => null, 'fallback' => true, 'swatch' => ['class' => 'rep-swatch-default', 'text' => $expected['text']]])
        ->and($items[1])->toMatchArray(['label' => 'Red', 'command' => $expected['set'], 'arguments' => ['red'], 'fallback' => false, 'swatch' => ['class' => $expected['class'], 'text' => $expected['text']]])
        ->and(json_encode($items[1]['active']))->toBe(json_encode(['name' => null, 'attributes' => [$expected['attribute'] => 'red']]));
})->with('colour plugins');

it('writes a stylesheet for its palette', function (Closure $make, array $expected): void {
    $css = $make()->colors(['red' => ['label' => 'Red', 'color' => '#f00'], 'sky' => ['label' => 'Sky', 'color' => 'rgb(0, 128, 255)']])->getStylesheet();

    expect($css)->toBe(".{$expected['class']}{{$expected['property']}:#f00}\n.".str_replace('red', 'sky', $expected['class'])."{{$expected['property']}:rgb(0, 128, 255)}");
})->with('colour plugins');

it('writes the default highlight stylesheet with dark text at zero specificity', function (): void {
    expect(BackgroundColorPlugin::make()->getStylesheet())->toStartWith(".has-gray-background-color{background-color:#e5e7eb}\n:where(.has-gray-background-color){color:#1f2937}\n.has-red-background-color{background-color:#fecaca}\n:where(.has-red-background-color){color:#1f2937}");
});

it('writes a text rule only for highlight entries that have one', function (): void {
    $css = BackgroundColorPlugin::make()->colors([
        'red' => ['label' => 'Red', 'color' => '#f00', 'text' => '#111'],
        'sky' => ['label' => 'Sky', 'color' => '#0af'],
    ])->getStylesheet();

    expect($css)->toBe(".has-red-background-color{background-color:#f00}\n:where(.has-red-background-color){color:#111}\n.has-sky-background-color{background-color:#0af}");
});

it('ignores a text key on a text colour palette', function (): void {
    expect(TextColorPlugin::make()->colors(['red' => ['label' => 'Red', 'color' => '#f00', 'text' => '#111']])->getStylesheet())->toBe('.has-red-color{color:#f00}');
});

it('sends palette names as strings, even digit-only ones', function (): void {
    $plugin = TextColorPlugin::make()->colors(['500' => ['label' => 'Five hundred', 'color' => '#f00']]);
    $items = array_map(fn (ToolMenuItem $item): array => $item->toArray(), $plugin->getTools()[0]->getMenu());

    expect($plugin->getJsExtension()->toArray()['options'])->toBe(['colors' => ['500']])
        ->and($items[1]['arguments'])->toBe(['500'])
        ->and(json_encode($items[1]['active']))->toBe(json_encode(['name' => null, 'attributes' => ['color' => '500']]));
});

it('names classes with classUsing()', function (): void {
    $plugin = TextColorPlugin::make()->colors(['red' => ['label' => 'Red', 'color' => '#f00']])->classUsing(fn (string $name): string => "text-{$name}");

    expect($plugin->getStylesheet())->toBe('.text-red{color:#f00}')
        ->and(json_encode($plugin->getGlobalAttributes()[0]->toArray()['classes']))->toBe('{"red":"text-red"}');
});

it('refuses a palette that could break the stylesheet or the menu', function (array $colors, ?Closure $classUsing): void {
    $plugin = TextColorPlugin::make()->colors($colors);

    if ($classUsing) {
        $plugin->classUsing($classUsing);
    }

    expect(fn () => $plugin->getStylesheet())->toThrow(InvalidArgumentException::class, 'TextColorPlugin')
        ->and(fn () => $plugin->getTools())->toThrow(InvalidArgumentException::class, 'TextColorPlugin');
})->with([
    'empty' => [[], null],
    'bad name' => [['Red' => ['label' => 'Red', 'color' => '#f00']], null],
    'named default' => [['default' => ['label' => 'D', 'color' => '#f00']], null],
    'missing label' => [['red' => ['color' => '#f00']], null],
    'missing colour' => [['red' => ['label' => 'Red']], null],
    'empty colour' => [['red' => ['label' => 'Red', 'color' => ' ']], null],
    'brace' => [['red' => ['label' => 'Red', 'color' => 'red;}body{display:none']], null],
    'tag' => [['red' => ['label' => 'Red', 'color' => '</style><script>']], null],
    'quote' => [['red' => ['label' => 'Red', 'color' => "url('x')"]], null],
    'backslash' => [['red' => ['label' => 'Red', 'color' => '\\66 00']], null],
    'open parenthesis' => [['red' => ['label' => 'Red', 'color' => 'rgb(1 2 3']], null],
    'url open' => [['red' => ['label' => 'Red', 'color' => 'url(']], null],
    'close first' => [['red' => ['label' => 'Red', 'color' => ')']], null],
    'extra close' => [['red' => ['label' => 'Red', 'color' => 'rgb(1 2 3))']], null],
    'comment start' => [['red' => ['label' => 'Red', 'color' => 'red/*']], null],
    'comment end' => [['red' => ['label' => 'Red', 'color' => '*/red']], null],
    'control character' => [['red' => ['label' => 'Red', 'color' => "#f00\n"]], null],
    'empty label' => [['red' => ['label' => '', 'color' => '#f00']], null],
    'blank label' => [['red' => ['label' => "  \n", 'color' => '#f00']], null],
    'bad class' => [['red' => ['label' => 'Red', 'color' => '#f00']], fn (string $name): string => "a {$name}"],
    'shared class' => [['red' => ['label' => 'Red', 'color' => '#f00'], 'rouge' => ['label' => 'Rouge', 'color' => '#f00']], fn (): string => 'same'],
]);

it('refuses a highlight text colour that could break the stylesheet', function (mixed $text): void {
    $plugin = BackgroundColorPlugin::make()->colors(['red' => ['label' => 'Red', 'color' => '#f00', 'text' => $text]]);

    expect(fn () => $plugin->getStylesheet())->toThrow(InvalidArgumentException::class, 'BackgroundColorPlugin');
})->with(['}', ' ', '/*', 3, 'rgb(0 0 0']);

it('accepts colours with balanced parentheses', function (string $color): void {
    expect(TextColorPlugin::make()->colors(['x' => ['label' => 'X', 'color' => $color]])->getStylesheet())->toBe(".has-x-color{color:{$color}}");
})->with(['rgb(1 2 3)', 'hsl(10 20% 30% / 50%)']);

it('matches spans with a class or style, and not mentions', function (): void {
    $mark = TextColorPlugin::make()->getMarks()[0];

    expect($mark->getName())->toBe('textStyle')
        ->and($mark->match(colourElement('<span class="has-red-color">a</span>')))->toBe([])
        ->and($mark->match(colourElement('<span style="color: red">a</span>')))->toBe([])
        ->and($mark->match(colourElement('<span>a</span>')))->toBeNull()
        ->and($mark->match(colourElement('<em class="x">a</em>')))->toBeNull()
        ->and($mark->match(colourElement('<span data-type="mention" class="mention">a</span>')))->toBeNull();
});

it('keeps palette colours through parse and render, and drops unknown ones', function (): void {
    expect(colouredHtml('<p><span class="has-red-color has-yellow-background-color">a</span></p>'))
        ->toBe('<p><span class="has-red-color has-yellow-background-color">a</span></p>')
        ->and(colouredHtml('<p><span class="has-yellow-background-color x has-red-color">a</span></p>'))
        ->toBe('<p><span class="has-red-color has-yellow-background-color">a</span></p>')
        ->and(colouredHtml('<p><strong><span class="has-blue-color">a</span></strong></p>'))
        ->toBe('<p><span class="has-blue-color"><strong>a</strong></span></p>');
});

it('turns a span with only unknown classes or styles into a plain span', function (string $html): void {
    $document = RichContentPlusRenderer::make($html)->plugins([TextColorPlugin::make(), BackgroundColorPlugin::make()])->toArray();

    expect($document['content'][0]['content'][0]['marks'])->toBe([['type' => 'textStyle', 'attrs' => ['color' => null, 'backgroundColor' => null]]])
        ->and(colouredHtml($html))->toBe('<p><span>a</span></p>');
})->with([
    'unknown class' => ['<p><span class="has-teal-color">a</span></p>'],
    'unknown style' => ['<p><span style="font-weight: 300">a</span></p>'],
]);

it('renders nothing for colours outside the palette in stored JSON', function (mixed $value): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'a', 'marks' => [['type' => 'textStyle', 'attrs' => ['color' => $value, 'backgroundColor' => null]]]],
    ]]]];

    expect(RichContentPlusRenderer::make($document)->plugins([TextColorPlugin::make(), BackgroundColorPlugin::make()])->toHtml())->toBe('<p><span>a</span></p>');
})->with(['teal', 3, 'has-red-color', 'red" onclick="x']);

it('renders the palettes into the field once', function (): void {
    $html = RichEditorPlus::make('body')->addPlugins([TextColorPlugin::make(), BackgroundColorPlugin::make()])->getEditorStylesHtml();

    expect(substr_count($html, '<style data-rep-editor-styles>'))->toBe(1)
        ->and($html)->toContain('.has-red-color{color:#dc2626}')
        ->toContain('.has-red-background-color{background-color:#fecaca}')
        ->and(RichEditorPlus::make('body')->getEditorStylesHtml())->toBe('');
});

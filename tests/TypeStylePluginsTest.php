<?php

use Hollyit\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\FontFamilyPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\FontSizePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LineHeightPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\PaletteStylePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\ToolMenuItem;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

dataset('type style plugins', [
    'font family' => [fn (): PaletteStylePlugin => FontFamilyPlugin::make(), [
        'id' => 'core/font-family', 'attribute' => 'fontFamily', 'tool' => 'fontFamily', 'label' => 'Font', 'current' => 'Font: :item',
        'icon' => 'mdi-format-font', 'order' => 70, 'set' => 'setFontFamily', 'unset' => 'unsetFontFamily', 'getter' => 'getFonts', 'setter' => 'fonts', 'key' => 'family',
        'names' => ['sans', 'serif', 'mono'], 'first' => ['label' => 'Sans serif', 'family' => 'ui-sans-serif, system-ui, sans-serif'],
        'class' => 'has-serif-font-family', 'property' => 'font-family', 'sample' => 'Georgia, serif', 'swatch' => 'Aa',
    ]],
    'font size' => [fn (): PaletteStylePlugin => FontSizePlugin::make(), [
        'id' => 'core/font-size', 'attribute' => 'fontSize', 'tool' => 'fontSize', 'label' => 'Size', 'current' => 'Size: :item',
        'icon' => 'mdi-format-size', 'order' => 71, 'set' => 'setFontSize', 'unset' => 'unsetFontSize', 'getter' => 'getSizes', 'setter' => 'sizes', 'key' => 'size',
        'names' => ['small', 'large', 'x-large', 'xx-large'], 'first' => ['label' => 'Small', 'size' => '0.875em'],
        'class' => 'has-serif-font-size', 'property' => 'font-size', 'sample' => '1.25rem', 'swatch' => null,
    ]],
    'line height' => [fn (): PaletteStylePlugin => LineHeightPlugin::make(), [
        'id' => 'core/line-height', 'attribute' => 'lineHeight', 'tool' => 'lineHeight', 'label' => 'Line height', 'current' => 'Line height: :item',
        'icon' => 'mdi-format-line-spacing', 'order' => 72, 'set' => 'setLineHeight', 'unset' => 'unsetLineHeight', 'getter' => 'getHeights', 'setter' => 'heights', 'key' => 'height',
        'names' => ['tight', 'relaxed', 'loose'], 'first' => ['label' => 'Tight', 'height' => '1.25'],
        'class' => 'has-serif-line-height', 'property' => 'line-height', 'sample' => '1.6', 'swatch' => null,
    ]],
]);

it('has its id and default palette, and stays out of the defaults', function (Closure $make, array $expected): void {
    $plugin = $make();

    expect($plugin->getId())->toBe($expected['id'])
        ->and(array_keys($plugin->{$expected['getter']}()))->toBe($expected['names'])
        ->and($plugin->{$expected['getter']}()[$expected['names'][0]])->toBe($expected['first'])
        ->and(array_map(fn ($default): string => $default->getId(), PluginRegistry::defaultPlugins()))->not->toContain($expected['id']);
})->with('type style plugins');

it('declares a class attribute, sends its names as values, and writes its stylesheet', function (Closure $make, array $expected): void {
    $plugin = $make()->{$expected['setter']}(['serif' => ['label' => 'Serif', $expected['key'] => $expected['sample']]]);
    $attribute = $plugin->getGlobalAttributes()[0]->toArray();

    expect($attribute)->toMatchArray(['name' => $expected['attribute'], 'kind' => 'class', 'types' => ['textStyle'], 'values' => ['serif']])
        ->and(json_encode($attribute['classes']))->toBe(json_encode(['serif' => $expected['class']]))
        ->and($plugin->getJsExtension()->toArray())->toBe(['id' => $expected['id'], 'options' => ['values' => ['serif']]])
        ->and($plugin->getStylesheet())->toBe(".{$expected['class']}{{$expected['property']}:{$expected['sample']}}");
})->with('type style plugins');

it('offers an inline menu with a fallback default', function (Closure $make, array $expected): void {
    $tool = $make()->{$expected['setter']}(['serif' => ['label' => 'Serif', $expected['key'] => $expected['sample']]])->getTools()[0];
    $items = array_map(fn (ToolMenuItem $item): array => $item->toArray(), $tool->getMenu());
    $swatch = fn (string $class): ?array => $expected['swatch'] === null ? null : ['class' => $class, 'text' => $expected['swatch']];

    expect($tool->getName())->toBe($expected['tool'])
        ->and($tool->getLabel())->toBe($expected['label'])
        ->and($tool->getCurrentLabel())->toBe($expected['current'])
        ->and($tool->getIcon())->toBe($expected['icon'])
        ->and($tool->toArray())->toMatchArray(['scope' => 'inline', 'group' => 'type', 'order' => $expected['order']])
        ->and($items[0])->toMatchArray(['name' => 'default', 'label' => 'Default', 'command' => $expected['unset'], 'arguments' => [], 'fallback' => true, 'icon' => null, 'swatch' => $swatch('rep-swatch-default')])
        ->and($items[1])->toMatchArray(['name' => 'serif', 'label' => 'Serif', 'command' => $expected['set'], 'arguments' => ['serif'], 'fallback' => false, 'icon' => null, 'swatch' => $swatch($expected['class'])])
        ->and(json_encode($items[1]['active']))->toBe(json_encode(['name' => null, 'attributes' => [$expected['attribute'] => 'serif']]));
})->with('type style plugins');

it('checks font families', function (string $family, bool $accepted): void {
    $plugin = FontFamilyPlugin::make()->fonts(['x' => ['label' => 'X', 'family' => $family]]);

    if ($accepted) {
        expect($plugin->getStylesheet())->toBe(".has-x-font-family{font-family:{$family}}");
    } else {
        expect(fn () => $plugin->getStylesheet())->toThrow(InvalidArgumentException::class, 'FontFamilyPlugin');
    }
})->with([
    'bare' => ['Georgia', true],
    'stack' => ['ui-sans-serif, system-ui, sans-serif', true],
    'double quoted' => ['"Open Sans", sans-serif', true],
    'single quoted' => ["'Fira Code', monospace", true],
    'quote inside' => ['"Open "Sans"', false],
    'backslash' => ['"x\\"', false],
    'semicolon' => ['"a"; b', false],
    'brace' => ['Arial}', false],
    'unclosed' => ['"unclosed', false],
    'empty' => ['', false],
    'digit first' => ['1font', false],
    'empty quotes' => ['""', false],
    'comment' => ['Arial /* x */', false],
    'leading hyphen' => ['-apple-system, BlinkMacSystemFont, sans-serif', true],
    'digit word' => ['Font 1', false],
    'newline' => ["\"a\nb\"", false],
    'form feed' => ["\"a\fb\"", false],
    'carriage return' => ["'x\ry'", false],
]);

it('checks font sizes', function (string $size, bool $accepted): void {
    $plugin = FontSizePlugin::make()->sizes(['x' => ['label' => 'X', 'size' => $size]]);

    if ($accepted) {
        expect($plugin->getStylesheet())->toBe(".has-x-font-size{font-size:{$size}}");
    } else {
        expect(fn () => $plugin->getStylesheet())->toThrow(InvalidArgumentException::class, 'FontSizePlugin');
    }
})->with([
    'px' => ['16px', true],
    'em' => ['1.25em', true],
    'leading dot' => ['.875rem', true],
    'zero' => ['0', true],
    'keyword' => ['large', true],
    'variable' => ['var(--size-lg)', true],
    'clamp' => ['clamp(1rem, 2vw, 2rem)', true],
    'calc' => ['calc(1em + 2px)', true],
    'ch unit' => ['2ch', true],
    'viewport unit in clamp' => ['clamp(1rem, 1rem + 2svw, 3rem)', true],
    'nested' => ['min(1rem, calc(0.5rem + 1vw))', true],
    'calc with variable' => ['calc(var(--base) * 1.25)', true],
    'open parenthesis' => ['calc((1em)', false],
    'extra close' => ['calc(1em))', false],
    'url inside' => ['calc(url(x))', false],
    'second value' => ['max(1px), url(x)', false],
    'two functions' => ['min(1px) image-set(a)', false],
    'newline' => ["1em\n", false],
    'semicolon' => ['1.5;x', false],
    'no unit' => ['16', false],
    'unknown keyword' => ['huge', false],
    'expression' => ['expression(1)', false],
    'comment' => ['calc(1em /* x */)', false],
    'url' => ['url(x)', false],
    'quote' => ['"16px"', false],
]);

it('checks line heights', function (string $height, bool $accepted): void {
    $plugin = LineHeightPlugin::make()->heights(['x' => ['label' => 'X', 'height' => $height]]);

    if ($accepted) {
        expect($plugin->getStylesheet())->toBe(".has-x-line-height{line-height:{$height}}");
    } else {
        expect(fn () => $plugin->getStylesheet())->toThrow(InvalidArgumentException::class, 'LineHeightPlugin');
    }
})->with([
    'number' => ['1.5', true],
    'px' => ['24px', true],
    'percent' => ['150%', true],
    'line unit' => ['2lh', true],
    'normal' => ['normal', true],
    'variable' => ['var(--lh)', true],
    'semicolon' => ['1.5;', false],
    'word' => ['tall', false],
    'important' => ['1.5 !important', false],
    'quote' => ["'1.5'", false],
]);

it('orders the inline tools after the formatting tools', function (): void {
    $registry = PluginRegistry::make([
        BoldPlugin::make(), ItalicPlugin::make(), UnderlinePlugin::make(),
        TextColorPlugin::make(), BackgroundColorPlugin::make(), FontFamilyPlugin::make(), FontSizePlugin::make(), LineHeightPlugin::make(),
    ]);
    $names = array_map(fn ($tool): string => $tool->getName(), $registry->getInlineTools());

    expect($names)->toBe(['bold', 'italic', 'underline', 'textColor', 'backgroundColor', 'fontFamily', 'fontSize', 'lineHeight']);
});

it('keeps all styles on one span through parse and render', function (): void {
    $plugins = [TextColorPlugin::make(), BackgroundColorPlugin::make(), FontFamilyPlugin::make(), FontSizePlugin::make(), LineHeightPlugin::make()];
    $html = '<p><span class="has-loose-line-height has-red-color has-large-font-size has-serif-font-family">a</span></p>';

    expect(RichContentPlusRenderer::make($html)->parseHtml()->plugins($plugins)->toHtml())
        ->toBe('<p><span class="has-red-color has-serif-font-family has-large-font-size has-loose-line-height">a</span></p>')
        ->and(RichContentPlusRenderer::make($html)->plugins([FontSizePlugin::make()])->toArray()['content'][0]['content'][0]['marks'])
        ->toBe([['type' => 'textStyle', 'attrs' => ['fontSize' => 'large']]]);
});

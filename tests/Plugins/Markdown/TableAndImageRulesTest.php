<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\UnsupportedContentFormatException;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownSerializer;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\CoreRules;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\ImageRules;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules\TableRules;
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

/**
 * @param  array<array<string, mixed>>  $blocks
 */
function tiWrite(array $blocks, bool $strict = true): string
{
    $registry = PluginRegistry::make([
        ...PluginRegistry::defaultPlugins(),
        TablePlugin::make()->resizable(false),
        ImagePlugin::make()->disk('public')->allowUrls()->allowUploads(false),
    ]);

    return (new MarkdownSerializer([...CoreRules::nodes(), ...TableRules::nodes(), ...ImageRules::nodes()], CoreRules::marks(), $strict))
        ->serialize(['type' => 'doc', 'content' => $blocks], ContentSchema::fromRegistry($registry));
}

/**
 * @param  array<array<string, mixed>>  $content
 * @param  array<string, mixed>  $attrs
 * @return array<string, mixed>
 */
function tiCell(string $type, array $content, array $attrs = []): array
{
    return ['type' => $type, 'attrs' => ['colspan' => 1, 'rowspan' => 1, 'colwidth' => null, 'align' => null, ...$attrs], 'content' => $content];
}

/**
 * @return array<array<string, mixed>>
 */
function tiPara(string $text): array
{
    return [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]];
}

it('unmerges merged cells', function (): void {
    $table = ['type' => 'table', 'content' => [
        ['type' => 'tableRow', 'content' => [tiCell('tableHeader', tiPara('wide'), ['colspan' => 2]), tiCell('tableHeader', tiPara('c'))]],
        ['type' => 'tableRow', 'content' => [tiCell('tableCell', tiPara('tall'), ['rowspan' => 2]), tiCell('tableCell', tiPara('b')), tiCell('tableCell', tiPara('c'))]],
        ['type' => 'tableRow', 'content' => [tiCell('tableCell', tiPara('y')), tiCell('tableCell', tiPara('z'))]],
    ]];

    expect(tiWrite([$table]))->toBe("| wide |  | c |\n| --- | --- | --- |\n| tall | b | c |\n|  | y | z |\n");
});

it('takes column alignment from the header row', function (): void {
    $table = ['type' => 'table', 'content' => [
        ['type' => 'tableRow', 'content' => [tiCell('tableHeader', tiPara('a'), ['align' => 'center'])]],
        ['type' => 'tableRow', 'content' => [tiCell('tableCell', tiPara('b'), ['align' => 'right'])]],
    ]];

    expect(tiWrite([$table]))->toBe("| a |\n| :-: |\n| b |\n");
});

it('flattens blocks in cells to one line', function (): void {
    $table = ['type' => 'table', 'content' => [
        ['type' => 'tableRow', 'content' => [tiCell('tableHeader', [...tiPara('one'), ...tiPara('two')])]],
        ['type' => 'tableRow', 'content' => [tiCell('tableCell', [['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => tiPara('item')]]]])]],
    ]];

    expect(tiWrite([$table]))->toBe("| one<br>two |\n| --- |\n| item |\n");
});

it('writes images with the caption as the title', function (): void {
    $image = ['type' => 'image', 'attrs' => ['disk' => null, 'path' => null, 'url' => 'https://e.com/a.png', 'alt' => 'A [b]', 'caption' => 'Say "hi"', 'align' => 'left', 'width' => '50']];

    expect(tiWrite([$image]))->toBe("![A \\[b\\]](https://e.com/a.png \"Say \\\"hi\\\"\")\n");
});

it('refuses stored images when strict, and writes their alt text when lenient', function (): void {
    $image = ['type' => 'image', 'attrs' => ['disk' => 'public', 'path' => 'a.png', 'url' => null, 'alt' => 'Alt', 'caption' => '', 'align' => 'center', 'width' => '100']];

    expect(tiWrite([$image], strict: false))->toBe("Alt\n")
        ->and(fn () => tiWrite([$image]))->toThrow(UnsupportedContentFormatException::class);
});

it('writes stored images that have a resolved src when lenient', function (): void {
    $image = ['type' => 'image', 'attrs' => ['disk' => 'public', 'path' => 'a.png', 'url' => null, 'src' => 'https://files.test/a.png', 'alt' => 'Alt', 'caption' => '', 'align' => 'center', 'width' => '100']];

    expect(tiWrite([$image], strict: false))->toBe("![Alt](https://files.test/a.png)\n");
});

it('writes an image with an unsafe URL as its alt text, strict or lenient', function (string $url, bool $strict): void {
    $image = ['type' => 'image', 'attrs' => ['disk' => null, 'path' => null, 'url' => $url, 'alt' => 'Alt', 'caption' => '', 'align' => 'center', 'width' => '100']];

    expect(tiWrite([$image], $strict))->toBe("Alt\n");
})->with([
    'javascript' => ['javascript:alert(1)'],
    'data' => ['data:image/svg+xml;base64,PHN2Zz4='],
    'split by a newline' => ["java\nscript:alert(1)"],
])->with(['strict' => true, 'lenient' => false]);

it('writes an unsafe resolved src as alt text when lenient', function (): void {
    $image = ['type' => 'image', 'attrs' => ['disk' => 'public', 'path' => 'a.png', 'url' => null, 'src' => 'javascript:alert(1)', 'alt' => 'Alt', 'caption' => '', 'align' => 'center', 'width' => '100']];

    expect(tiWrite([$image], strict: false))->toBe("Alt\n");
});

it('collapses newlines in cell text and writes standalone rows with outer pipes', function (): void {
    $table = ['type' => 'table', 'content' => [
        ['type' => 'tableRow', 'content' => [tiCell('tableHeader', tiPara("a\nb"))]],
    ]];
    $row = ['type' => 'tableRow', 'content' => [tiCell('tableCell', tiPara('x')), tiCell('tableCell', tiPara('y'))]];

    expect(tiWrite([$table]))->toBe("| a b |\n| --- |\n")
        ->and(tiWrite([$row]))->toBe("| x | y |\n");
});

<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Content\HtmlSerializer;
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

function tableSchema(): ContentSchema
{
    return ContentSchema::fromRegistry(PluginRegistry::make([TablePlugin::make()]));
}

function tableOf(string $cellType, array $attrs): array
{
    return ['type' => 'doc', 'content' => [['type' => 'table', 'content' => [['type' => 'tableRow', 'content' => [
        ['type' => $cellType, 'attrs' => $attrs, 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'a']]]]],
    ]]]]]];
}

it('renders table cells with their attributes', function (): void {
    $html = (new HtmlSerializer(tableSchema()))->serialize(tableOf('tableCell', ['colspan' => 2, 'rowspan' => 3, 'colwidth' => [120, 80], 'align' => 'center']));

    expect($html)->toBe('<table><tbody><tr><td colspan="2" rowspan="3" colwidth="120,80" style="text-align: center"><p>a</p></td></tr></tbody></table>');
});

it('renders default spans as the browser does', function (): void {
    expect((new HtmlSerializer(tableSchema()))->serialize(tableOf('tableHeader', [])))->toContain('<th colspan="1" rowspan="1">');
});

it('round trips a table through HTML', function (string $cellType): void {
    $document = tableOf($cellType, ['colspan' => 2, 'rowspan' => 1, 'colwidth' => [120, 80], 'align' => 'right']);

    $html = (new HtmlSerializer(tableSchema()))->serialize($document);

    expect((new HtmlParser(tableSchema()))->parse($html))->toEqual($document);
})->with(['tableCell', 'tableHeader']);

it('reads the legacy align attribute', function (): void {
    $document = (new HtmlParser(tableSchema()))->parse('<table><tr><td align="LEFT"><p>a</p></td></tr></table>');

    expect($document['content'][0]['content'][0]['content'][0]['attrs']['align'])->toBe('left');
});

it('ignores alignments the browser does not support', function (string $html): void {
    $document = (new HtmlParser(tableSchema()))->parse("<table><tr>{$html}</tr></table>");

    expect($document['content'][0]['content'][0]['content'][0]['attrs']['align'])->toBeNull();
})->with(['<td style="text-align: justify"></td>', '<td align="middle"></td>']);

it('keeps a stored alignment out of the style attribute unless it is supported', function (): void {
    $html = (new HtmlSerializer(tableSchema()))->serialize(tableOf('tableCell', ['align' => 'left; background: url(x)']));

    expect($html)->not->toContain('background')->not->toContain('style=');
});

it('reads header rows and table sections', function (): void {
    $document = (new HtmlParser(tableSchema()))->parse("<table><thead>\n<tr><th><p>a</p></th></tr></thead><tbody><tr><td><p>b</p></td></tr></tbody></table>");

    expect(array_column($document['content'][0]['content'], 'type'))->toBe(['tableRow', 'tableRow']);
});

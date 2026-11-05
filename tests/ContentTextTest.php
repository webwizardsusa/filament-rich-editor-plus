<?php

use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Content\TextSerializer;
use Hollyit\RichEditorPlus\Plugins\Core\TaskListPlugin;
use Hollyit\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

function contentToText(array ...$content): string
{
    $schema = new ContentSchema([
        NodeSpec::make('paragraph')->renderTag('p'),
        NodeSpec::make('blockquote')->renderTag('blockquote'),
        NodeSpec::make('divider')->atom()->renderTag('hr'),
        NodeSpec::make('hardBreak')->inline()->atom()->renderTag('br')->textUsing(fn (): string => "\n"),
        NodeSpec::make('token')->inline()->atom()->textUsing(fn (array $node): string => '@'.$node['attrs']['label']),
    ], [MarkSpec::make('bold')->renderTag('strong')]);

    return (new TextSerializer($schema))->serialize(['type' => 'doc', 'content' => $content]);
}

function textParagraph(array ...$content): array
{
    return ['type' => 'paragraph', 'content' => $content];
}

it('joins inline nodes without splitting them', function (): void {
    expect(contentToText(textParagraph(
        ['type' => 'text', 'text' => 'a '],
        ['type' => 'text', 'text' => 'b', 'marks' => [['type' => 'bold']]],
        ['type' => 'text', 'text' => ' c'],
    )))->toBe('a b c');
});

it('separates blocks with a blank line, including nested ones', function (): void {
    expect(contentToText(
        textParagraph(['type' => 'text', 'text' => 'a']),
        ['type' => 'blockquote', 'content' => [textParagraph(['type' => 'text', 'text' => 'b']), textParagraph(['type' => 'text', 'text' => 'c'])]],
    ))->toBe("a\n\nb\n\nc");
});

it('skips blocks with no text', function (): void {
    expect(contentToText(
        textParagraph(['type' => 'text', 'text' => 'a']),
        ['type' => 'divider'],
        ['type' => 'paragraph'],
        textParagraph(['type' => 'text', 'text' => 'b']),
    ))->toBe("a\n\nb");
});

it('uses the text of inline nodes', function (): void {
    expect(contentToText(textParagraph(
        ['type' => 'text', 'text' => 'a'],
        ['type' => 'hardBreak'],
        ['type' => 'token', 'attrs' => ['label' => 'Ada']],
    )))->toBe("a\n@Ada");
});

it('does not HTML-escape', function (): void {
    expect(contentToText(textParagraph(['type' => 'text', 'text' => 'a & <b>'])))->toBe('a & <b>');
});

it('keeps the text inside unknown nodes', function (): void {
    expect(contentToText(['type' => 'mystery', 'content' => [textParagraph(['type' => 'text', 'text' => 'a'])]]))->toBe('a');
});

it('skips malformed content instead of throwing', function (): void {
    expect(contentToText(
        ['type' => 'paragraph', 'content' => 'x'],
        ['type' => 'paragraph', 'content' => ['x', 1, ['type' => 'text', 'text' => ['y']], ['type' => ['z']]]],
        textParagraph(['type' => 'text', 'text' => 'ok']),
    ))->toBe('ok');
});

it('puts a block node\'s text before its children', function (): void {
    $schema = new ContentSchema([
        NodeSpec::make('paragraph')->renderTag('p'),
        NodeSpec::make('task')->renderTag('li')->textUsing(fn (array $node): string => $node['attrs']['done'] ? '[x] ' : '[ ] '),
    ], []);

    $text = (new TextSerializer($schema))->serialize(['type' => 'doc', 'content' => [
        ['type' => 'task', 'attrs' => ['done' => true], 'content' => [textParagraph(['type' => 'text', 'text' => 'a'])]],
        ['type' => 'task', 'attrs' => ['done' => false], 'content' => [textParagraph(['type' => 'text', 'text' => 'b'])]],
    ]]);

    expect($text)->toBe("[x] a\n\n[ ] b");
});

it('marks task items as done or not in plain text', function (): void {
    $schema = new ContentSchema([NodeSpec::make('paragraph')->renderTag('p'), ...TaskListPlugin::make()->getNodes()], []);

    $item = fn (bool $checked, string $text): array => ['type' => 'taskItem', 'attrs' => ['checked' => $checked], 'content' => [textParagraph(['type' => 'text', 'text' => $text])]];

    expect((new TextSerializer($schema))->serialize(['type' => 'doc', 'content' => [
        ['type' => 'taskList', 'content' => [$item(true, 'a'), $item(false, 'b')]],
    ]]))->toBe("[x] a\n\n[ ] b");
});

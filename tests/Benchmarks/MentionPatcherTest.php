<?php

use Hollyit\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\MentionPatcher;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Tests\TestCase;

uses(TestCase::class);

/**
 * @param  array<int, array<string, mixed>>  $inline
 */
function patcherDocument(array $inline): array
{
    return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => $inline]]];
}

function patcherMention(string $id, string $label, string $char = '@'): array
{
    return ['type' => 'mention', 'attrs' => ['id' => $id, 'label' => $label, 'char' => $char]];
}

/**
 * @param  array<string, mixed>  $document
 * @return array{0: string, 1: string} The patched storable HTML, and what `toHtml()` renders.
 */
function patchAndRender(array $document, MentionProvider $provider): array
{
    $plugins = BenchmarkPlugins::make($provider);
    $storable = RichContentPlusRenderer::make($document)->plugins($plugins)->toStorableHtml();

    return [
        (new MentionPatcher($plugins))->patchMany(['doc' => $storable])['doc'],
        RichContentPlusRenderer::make($document)->plugins($plugins)->toHtml(),
    ];
}

it('patches live labels and links into stored HTML exactly as toHtml renders them', function (): void {
    [$patched, $expected] = patchAndRender(
        patcherDocument([['type' => 'text', 'text' => 'Hi '], patcherMention('1', 'Old name'), ['type' => 'text', 'text' => '!']]),
        BenchmarkPlugins::inMemoryMentions([1 => 'Ada Lovelace']),
    );

    expect($patched)->toBe($expected)->toContain('@Ada Lovelace')->toContain('href="/bench/mentionables/1"');
});

it('escapes labels that contain HTML exactly as toHtml does', function (): void {
    [$patched, $expected] = patchAndRender(
        patcherDocument([patcherMention('1', 'x'), patcherMention('2', 'y')]),
        BenchmarkPlugins::inMemoryMentions([1 => '<b>Bold</b> & "Bob"', 2 => "Seán O'Brien"]),
    );

    expect($patched)->toBe($expected)->not->toContain('<b>Bold');
});

it('keeps the stored label for a mention whose entity is gone', function (): void {
    [$patched, $expected] = patchAndRender(
        patcherDocument([patcherMention('99', 'Gone & Forgotten')]),
        BenchmarkPlugins::inMemoryMentions([1 => 'Ada']),
    );

    expect($patched)->toBe($expected)->toContain('@Gone &amp; Forgotten');
});

it('patches mentions inside marks and nested blocks', function (): void {
    $document = ['type' => 'doc', 'content' => [
        ['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'see '], patcherMention('1', 'a')]],
            ['type' => 'blockquote', 'content' => [patcherDocument([patcherMention('2', 'b')])['content'][0]]],
        ]]]],
    ]];

    [$patched, $expected] = patchAndRender($document, BenchmarkPlugins::inMemoryMentions([1 => 'Ada', 2 => 'Grace']));

    expect($patched)->toBe($expected);
});

it('leaves mentions with no provider for their trigger unlinked, as toHtml does', function (): void {
    [$patched, $expected] = patchAndRender(
        patcherDocument([patcherMention('1', 'Topic', '#')]),
        BenchmarkPlugins::inMemoryMentions([1 => 'Ada']),
    );

    expect($patched)->toBe($expected)->not->toContain('href');
});

it('never keeps an href from the stored markup', function (): void {
    $stored = '<p><span data-id="1" data-label="Ada" data-char="@" href="javascript:alert(1)" data-type="mention" class="rep-mention">@Ada</span></p>';
    $plugins = BenchmarkPlugins::make(MentionProvider::make('@')->items([1 => 'Ada']));

    expect((new MentionPatcher($plugins))->patchMany([$stored])[0])->not->toContain('javascript');
});

it('looks labels up once for a whole batch', function (): void {
    $lookups = 0;
    $provider = MentionProvider::make('@')->getLabelsUsing(function (array $ids) use (&$lookups): array {
        $lookups++;

        return array_fill_keys($ids, 'Someone');
    });
    $plugins = BenchmarkPlugins::make($provider);
    $stored = array_map(
        static fn (string $id): string => RichContentPlusRenderer::make(patcherDocument([patcherMention($id, 'x')]))->plugins($plugins)->toStorableHtml(),
        ['1', '2', '3'],
    );

    (new MentionPatcher($plugins))->patchMany($stored);

    expect($lookups)->toBe(1);
});

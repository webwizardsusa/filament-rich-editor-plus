<?php

use Hollyit\RichEditorPlus\Content\UnsupportedContentFormatException;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownFormat;
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownPlugin;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

function markdownPluginField(?MarkdownPlugin $plugin = null): RichEditorPlus
{
    return RichEditorPlus::make('content')->addPlugins([$plugin ?? MarkdownPlugin::make()->store()]);
}

/**
 * Quotes nested `$depth` deep: twice as deep in JSON, past `json_encode()`'s limit of 512 at 300.
 *
 * @return array<string, mixed>
 */
function markdownPluginNested(int $depth): array
{
    $node = ['type' => 'paragraph'];

    for ($level = 0; $level < $depth; $level++) {
        $node = ['type' => 'blockquote', 'content' => [$node]];
    }

    return $node;
}

it('chooses Markdown storage only when asked', function (): void {
    expect(MarkdownPlugin::make()->getContentFormat())->toBeNull()
        ->and(MarkdownPlugin::make()->store()->getContentFormat())->toBeInstanceOf(MarkdownFormat::class);
});

it('shows the source toggle by default only when storing Markdown', function (): void {
    expect(MarkdownPlugin::make()->hasSourceToggle())->toBeFalse()
        ->and(MarkdownPlugin::make()->store()->hasSourceToggle())->toBeTrue()
        ->and(MarkdownPlugin::make()->store()->sourceToggle(false)->hasSourceToggle())->toBeFalse()
        ->and(array_map(fn ($tool) => $tool->getName(), MarkdownPlugin::make()->store()->getTools()))->toBe(['markdownSource'])
        ->and(MarkdownPlugin::make()->getTools())->toBe([]);
});

it('refuses the source toggle on fields whose content Markdown cannot hold', function (): void {
    markdownPluginField(MarkdownPlugin::make()->sourceToggle())->getPluginRegistry();
})->throws(UnsupportedContentFormatException::class, 'UnderlinePlugin');

it('pastes Markdown on any field', function (): void {
    expect(markdownPluginField(MarkdownPlugin::make())->getPluginRegistry())->toBeInstanceOf(PluginRegistry::class)
        ->and(MarkdownPlugin::make()->getJsExtension()->toArray()['options'])->toMatchArray(['paste' => true, 'source' => false])
        ->and(MarkdownPlugin::make()->pasteMarkdown(false)->getJsExtension()->toArray()['options']['paste'])->toBeFalse();
});

it('converts Markdown for the editor', function (): void {
    $field = markdownPluginField();

    expect($field->answerPluginRequestForJs('hollyit/markdown', 'toDocument', ['markdown' => '**hi**']))
        ->toMatchArray(['document' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'hi', 'marks' => [['type' => 'bold']]]]]]]]);
});

it('converts documents to Markdown for the editor', function (): void {
    $document = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'hi']]]]];

    expect(markdownPluginField()->answerPluginRequestForJs('hollyit/markdown', 'toMarkdown', ['document' => $document]))
        ->toBe(['markdown' => "hi\n"]);
});

it('refuses bad and oversized requests', function (string $request, array $payload, string $error): void {
    expect(markdownPluginField()->answerPluginRequestForJs('hollyit/markdown', $request, $payload))
        ->toBe(['error' => __("rich-editor-plus::markdown.errors.{$error}")]);
})->with([
    'no markdown' => ['toDocument', [], 'invalid'],
    'markdown too large' => ['toDocument', ['markdown' => str_repeat('a', MarkdownFormat::MAX_LENGTH + 1)], 'too_large'],
    'no document' => ['toMarkdown', ['document' => 'x'], 'invalid'],
    'document too large' => ['toMarkdown', ['document' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => str_repeat('a', MarkdownFormat::MAX_LENGTH)]]]]]], 'too_large'],
    'document too deep to encode' => ['toMarkdown', ['document' => ['type' => 'doc', 'content' => [markdownPluginNested(300)]]], 'invalid'],
    'unsupported content' => ['toMarkdown', ['document' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'u', 'marks' => [['type' => 'underline']]]]]]]], 'unsupported'],
]);

it('keeps the source toggle usable while the editor is read-only', function (): void {
    expect(MarkdownPlugin::make()->store()->getTools()[0]->isAvailableWhileReadOnly())->toBeTrue();
});

it('passes the Done label to the source view', function (): void {
    expect(MarkdownPlugin::make()->getJsExtension()->toArray()['options']['labels']['done'])->toBe('Done');
});

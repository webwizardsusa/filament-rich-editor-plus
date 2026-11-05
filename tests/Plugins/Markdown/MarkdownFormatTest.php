<?php

use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Content\UnsupportedContentFormatException;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextAlignPlugin;
use Hollyit\RichEditorPlus\Plugins\Image\AttachmentPlugin;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\Plugins\Markdown\Contracts\ProvidesMarkdownRules;
use Hollyit\RichEditorPlus\Plugins\Markdown\MarkdownFormat;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownWriter;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
});

class MarkdownFormatTestCallout extends Plugin implements ProvidesMarkdownRules
{
    public function getId(): string
    {
        return 'test/callout';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make('test/callout');
    }

    public function getNodes(): array
    {
        return [NodeSpec::make('callout')->parseTags(['aside'])->renderTag('aside')];
    }

    public function getMarkdownNodeRules(): array
    {
        return ['callout' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write('> **Note:** '.$writer->textOf($node)))];
    }

    public function getMarkdownMarkRules(): array
    {
        return [];
    }
}

it('names every unsupported plugin with its reason', function (): void {
    MarkdownFormat::make()->assertSupports([...PluginRegistry::defaultPlugins(), TablePlugin::make()]);
})->throws(UnsupportedContentFormatException::class, "Markdown storage can't keep: UnderlinePlugin (no Markdown syntax for underline), TablePlugin (column widths: call ->resizable(false)).");

it('explains image and other plugin problems', function (Closure $makePlugin, string $reason): void {
    $plugin = $makePlugin();

    expect(MarkdownFormat::make()->unsupportedPlugins([$plugin]))->toBe([$plugin])
        ->and(fn () => MarkdownFormat::make()->assertSupports([$plugin]))->toThrow(UnsupportedContentFormatException::class, $reason);
})->with([
    'image uploads' => [fn () => ImagePlugin::make()->disk('public')->allowUrls(), 'ImagePlugin (uploads: call ->allowUploads(false))'],
    'text align' => [fn () => TextAlignPlugin::make(), 'TextAlignPlugin (no Markdown syntax for textAlign)'],
    'attachments' => [fn () => AttachmentPlugin::make()->disk('public'), 'AttachmentPlugin (no Markdown syntax for attachment)'],
    'mentions' => [fn () => MentionPlugin::make(), 'MentionPlugin (no Markdown syntax for mention)'],
]);

it('keeps compatible plugins', function (): void {
    $plugins = [
        TablePlugin::make()->resizable(false),
        ImagePlugin::make()->disk('public')->allowUrls()->allowUploads(false),
        new MarkdownFormatTestCallout,
    ];

    MarkdownFormat::make()->assertSupports($plugins);

    expect(MarkdownFormat::make()->unsupportedPlugins($plugins))->toBe([]);
});

it('uses rules from plugins', function (): void {
    $registry = PluginRegistry::make([new MarkdownFormatTestCallout]);
    $document = ['type' => 'doc', 'content' => [['type' => 'callout', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hi']]]]]]];

    expect(MarkdownFormat::make()->fromDocument($document, $registry))->toBe("> **Note:** Hi\n");
});

it('hides the tools Markdown cannot keep', function (): void {
    expect(MarkdownFormat::make()->getHiddenTools())->toBe(['mergeOrSplit', 'toggleHeaderRow', 'imageAlign', 'imageWidth'])
        ->and(MarkdownFormat::make()->getId())->toBe('markdown');
});

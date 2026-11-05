<?php

use Illuminate\Support\Facades\Storage;
use Webwizardsusa\RichEditorPlus\Plugins\Image\AttachmentPlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);
    config()->set('filesystems.disks.vault', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/vault'), 'visibility' => 'private']);
});

function attachmentPlugin(): AttachmentPlugin
{
    return AttachmentPlugin::make()->disk('media');
}

function renderAttachment(string $html, ?AttachmentPlugin $plugin = null): string
{
    return RichContentPlusRenderer::make($html)->plugins([$plugin ?? attachmentPlugin()])->toHtml();
}

class CompanyFilesPlugin extends AttachmentPlugin {}

const CARD = '<div class="rep-attachment" data-type="attachment" data-disk="media" data-path="editor-attachments/a.pdf" data-size="482133" data-mime="application/pdf"><a download="Q3 report.pdf">Q3 report.pdf</a><span class="rep-attachment-size">471 KB</span></div>';

it('has its id and stays out of the default plugins', function (): void {
    expect(attachmentPlugin()->getId())->toBe('webwizardsusa/attachment')
        ->and(array_map(fn ($plugin): string => $plugin->getId(), PluginRegistry::defaultPlugins()))->not->toContain('webwizardsusa/attachment');
});

it('has its defaults', function (): void {
    $plugin = AttachmentPlugin::make();

    expect($plugin->getDirectory())->toBe('editor-attachments')
        ->and($plugin->getMaxSize())->toBe(10240)
        ->and($plugin->getVisibility())->toBe('public')
        ->and($plugin->getAcceptedFileTypes())->toBe(AttachmentPlugin::DEFAULT_TYPES)
        ->and($plugin->getAcceptedFileTypes())->toContain('application/pdf', 'text/csv', 'application/zip');
});

it('renders the link for display and never stores it', function (): void {
    expect(RichContentPlusRenderer::make(CARD)->parseHtml()->plugins([attachmentPlugin()])->toStorableHtml())->toBe(CARD)
        ->and(renderAttachment(CARD))->toBe(str_replace('<a download=', '<a href="https://files.test/media/editor-attachments/a.pdf" download=', CARD));
});

it('ignores a stored href', function (): void {
    $stored = str_replace('<a download=', '<a href="https://evil.test/x" download=', CARD);

    expect(RichContentPlusRenderer::make($stored)->parseHtml()->plugins([attachmentPlugin()])->toStorableHtml())->toBe(CARD)
        ->and(renderAttachment($stored))->not->toContain('evil.test');
});

it('renders a temporary URL on a private disk, and urlUsing()', function (): void {
    Storage::fake('vault');
    $card = str_replace('data-disk="media"', 'data-disk="vault"', CARD);

    expect(renderAttachment($card, AttachmentPlugin::make()->disk('vault')->visibility('private')))->toContain('href="')
        ->and(renderAttachment(CARD, attachmentPlugin()->urlUsing(fn (string $disk, string $path): string => "https://cdn.test/{$disk}/{$path}")))
        ->toContain('href="https://cdn.test/media/editor-attachments/a.pdf"');
});

it('renders no link for a path the plugin would not serve', function (string $disk, string $path): void {
    $card = str_replace(['data-disk="media"', 'editor-attachments/a.pdf'], ["data-disk=\"{$disk}\"", $path], CARD);

    expect(renderAttachment($card))->not->toContain('href=');
})->with([
    'traversal' => ['media', 'editor-attachments/../../.env'],
    'outside the directory' => ['media', 'other/a.pdf'],
    'another disk' => ['vault', 'editor-attachments/a.pdf'],
    'leading slash' => ['media', '/editor-attachments/a.pdf'],
    'encoded traversal' => ['media', 'editor-attachments/%2e%2e/a.pdf'],
]);

it('drops an invalid size or type, and sanitises the name', function (): void {
    $html = '<div class="rep-attachment" data-type="attachment" data-disk="media" data-path="editor-attachments/a.pdf" data-size="12kb" data-mime="text/html; x"><a download="x">  a/b\\c.pdf </a></div>';

    expect(RichContentPlusRenderer::make($html)->plugins([attachmentPlugin()])->toArray()['content'][0]['attrs'])
        ->toBe(['disk' => 'media', 'path' => 'editor-attachments/a.pdf', 'name' => 'abc.pdf', 'size' => null, 'mime' => null]);
});

it('gives its name as plain text', function (): void {
    expect(RichContentPlusRenderer::make(CARD)->plugins([attachmentPlugin()])->toText())->toContain('Q3 report.pdf');
});

it('answers urls only for safe paths, at most 100', function (): void {
    $field = RichEditorPlus::make('body')->addPlugins([attachmentPlugin()]);
    $paths = [...array_map(fn (int $i): string => "editor-attachments/{$i}.pdf", range(1, 105)), '../x.pdf'];

    $urls = $field->answerPluginRequestForJs('webwizardsusa/attachment', 'urls', ['paths' => $paths])['urls'];

    expect($urls)->toHaveCount(100)
        ->and($urls['editor-attachments/1.pdf'])->toBe('https://files.test/media/editor-attachments/1.pdf')
        ->and($urls)->not->toHaveKey('../x.pdf');
});

it('refuses configuration it cannot serve safely', function (Closure $configure, string $message): void {
    expect(fn () => $configure(attachmentPlugin())->getNodes())->toThrow(InvalidArgumentException::class, $message);
})->with([
    'denied type' => [fn (AttachmentPlugin $plugin) => $plugin->acceptedFileTypes(['application/pdf', 'text/html']), 'AttachmentPlugin can never accept [text/html]'],
    'svg' => [fn (AttachmentPlugin $plugin) => $plugin->acceptedFileTypes(['image/svg+xml']), 'AttachmentPlugin can never accept [image/svg+xml]'],
    'shell script' => [fn (AttachmentPlugin $plugin) => $plugin->acceptedFileTypes(['text/x-shellscript']), 'AttachmentPlugin can never accept [text/x-shellscript]'],
    'executable' => [fn (AttachmentPlugin $plugin) => $plugin->acceptedFileTypes(['application/x-dosexec']), 'AttachmentPlugin can never accept [application/x-dosexec]'],
    'missing disk' => [fn (AttachmentPlugin $plugin) => $plugin->disk('nope'), 'AttachmentPlugin uses the disk [nope]'],
    'unsafe directory' => [fn (AttachmentPlugin $plugin) => $plugin->directory('../x'), 'AttachmentPlugin has the directory [../x]'],
    'no types' => [fn (AttachmentPlugin $plugin) => $plugin->acceptedFileTypes([]), 'AttachmentPlugin needs at least one accepted file type'],
]);

it('names its own class when it refuses a type', function (): void {
    expect(fn () => CompanyFilesPlugin::make()->disk('media')->acceptedFileTypes(['text/html'])->getNodes())
        ->toThrow(InvalidArgumentException::class, 'CompanyFilesPlugin can never accept [text/html]');
});

it('sends the editor its upload route and labels', function (): void {
    $options = attachmentPlugin()->maxSize(2048)->getJsExtension()->getOptions();

    expect($options['uploads'])->toBe(['accept' => AttachmentPlugin::DEFAULT_TYPES, 'maxSize' => 2048])
        ->and(array_keys($options['labels']))->toBe(['open', 'loading', 'missing'])
        ->and($options)->toHaveKey('uploadLabels');
});

it('styles the card the same in the editor and on the page', function (): void {
    $css = attachmentPlugin()->getStylesheet();

    expect($css)->toContain('.rep-attachment{')->toContain('[data-mime="application/pdf"]')
        ->and(attachmentPlugin()->getEditorStyles())->toBe($css);
});

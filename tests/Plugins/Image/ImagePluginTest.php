<?php

use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);
    config()->set('filesystems.disks.vault', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/vault'), 'visibility' => 'private']);
});

function imagePlugin(): ImagePlugin
{
    return ImagePlugin::make()->disk('media');
}

function renderImage(string $html, ?ImagePlugin $plugin = null): string
{
    return RichContentPlusRenderer::make($html)->plugins([$plugin ?? imagePlugin()])->toHtml();
}

const UPLOAD = '<figure class="rep-image" data-type="image" data-disk="media" data-path="editor-images/a.jpg" data-align="center" data-width="50"><img alt="A cat"><figcaption>Our cat</figcaption></figure>';

it('has its id and stays out of the default plugins', function (): void {
    expect(imagePlugin()->getId())->toBe('hollyit/image')
        ->and(array_map(fn ($plugin): string => $plugin->getId(), PluginRegistry::defaultPlugins()))->not->toContain('hollyit/image');
});

it('parses an uploaded image and renders its URL for display, never storing it', function (): void {
    $storable = RichContentPlusRenderer::make(UPLOAD)->parseHtml()->plugins([imagePlugin()])->toStorableHtml();

    expect(RichContentPlusRenderer::make(UPLOAD)->plugins([imagePlugin()])->toArray()['content'][0])->toBe([
        'type' => 'image',
        'attrs' => ['disk' => 'media', 'path' => 'editor-images/a.jpg', 'url' => null, 'alt' => 'A cat', 'caption' => 'Our cat', 'align' => 'center', 'width' => '50'],
    ])
        ->and($storable)->toBe(UPLOAD)
        ->and(renderImage(UPLOAD))->toBe('<figure class="rep-image" data-type="image" data-disk="media" data-path="editor-images/a.jpg" data-align="center" data-width="50"><img src="https://files.test/media/editor-images/a.jpg" alt="A cat"><figcaption>Our cat</figcaption></figure>');
});

it('renders an external image from its URL', function (): void {
    $html = '<figure class="rep-image" data-type="image" data-url="https://example.test/b.png" data-align="left" data-width="25"><img src="https://example.test/b.png" alt=""></figure>';

    expect(RichContentPlusRenderer::make($html)->parseHtml()->plugins([imagePlugin()])->toStorableHtml())->toBe($html)
        ->and(renderImage($html))->toBe($html);
});

it('keeps relative image URLs', function (string $url): void {
    $html = '<figure class="rep-image" data-type="image" data-url="'.$url.'" data-align="center" data-width="100"><img src="'.$url.'" alt=""></figure>';

    expect(RichContentPlusRenderer::make($html)->parseHtml()->plugins([imagePlugin()])->toStorableHtml())->toBe($html)
        ->and(renderImage($html))->toBe($html)
        ->and(RichContentPlusRenderer::make('<img src="'.$url.'" alt="">')->parseHtml()->plugins([imagePlugin()])->toStorableHtml())->toBe($html);
})->with(['/img/a.png', 'img/a.png', './a.png', '../a.png', '//cdn.example.test/a.png']);

it('refuses image URLs with other schemes, however they are disguised', function (string $url): void {
    expect(RichContentPlusRenderer::make('<p>x</p><img src="'.$url.'" alt="x">')->parseHtml()->plugins([imagePlugin()])->toStorableHtml())->toBe('<p>x</p>');
})->with(['JaVaScript:alert(1)', "java\tscript:alert(1)", ' javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///etc/passwd', '', '   ']);

it('turns a plain img into an external image, and refuses unsafe URLs', function (): void {
    $plain = RichContentPlusRenderer::make('<p>x</p><img src="https://example.test/c.gif" alt="C">')->parseHtml()->plugins([imagePlugin()]);

    expect($plain->toStorableHtml())->toBe('<p>x</p><figure class="rep-image" data-type="image" data-url="https://example.test/c.gif" data-align="center" data-width="100"><img src="https://example.test/c.gif" alt="C"></figure>')
        ->and(RichContentPlusRenderer::make('<img src="javascript:alert(1)" alt="x">')->parseHtml()->plugins([imagePlugin()])->toStorableHtml())->not->toContain('javascript')
        ->and(RichContentPlusRenderer::make('<figure class="rep-image" data-type="image" data-url="javascript:alert(1)" data-align="center" data-width="100"><img alt=""></figure>')->parseHtml()->plugins([imagePlugin()])->toHtml())->not->toContain('javascript');
});

it('falls back to the defaults for unknown alignment and width', function (): void {
    $html = str_replace(['data-align="center"', 'data-width="50"'], ['data-align="middle"', 'data-width="33"'], UPLOAD);

    expect(RichContentPlusRenderer::make($html)->parseHtml()->plugins([imagePlugin()])->toStorableHtml())
        ->toContain('data-align="center" data-width="100"');
});

it('signs a temporary URL on a private disk, and uses urlUsing when given', function (): void {
    Storage::fake('vault');
    $vault = ImagePlugin::make()->disk('vault')->visibility('private');
    $custom = imagePlugin()->urlUsing(fn (string $disk, string $path): string => "https://cdn.test/{$disk}/{$path}");

    expect($vault->resolveUrl('vault', 'editor-images/a.jpg'))->toContain('editor-images/a.jpg')->toContain('expiration')
        ->and($custom->resolveUrl('media', 'editor-images/a.jpg'))->toBe('https://cdn.test/media/editor-images/a.jpg');
});

it('never resolves an unsafe path', function (string $disk, string $path): void {
    expect(imagePlugin()->isSafePath($disk, $path))->toBeFalse()
        ->and(imagePlugin()->resolveUrl($disk, $path))->toBeNull()
        ->and(renderImage(str_replace(['data-disk="media"', 'data-path="editor-images/a.jpg"'], ['data-disk="'.$disk.'"', 'data-path="'.htmlspecialchars($path).'"'], UPLOAD)))->not->toContain('src=');
})->with([
    'parent' => ['media', 'editor-images/../.env'],
    'leading slash' => ['media', '/etc/passwd'],
    'backslash' => ['media', '\\editor-images\\a.jpg'],
    'outside the directory' => ['media', 'other/a.jpg'],
    'other disk' => ['vault', 'editor-images/a.jpg'],
    'dot segment' => ['media', 'editor-images/./a.jpg'],
    'empty' => ['media', ''],
    'control character' => ['media', "editor-images/a\n.jpg"],
    'percent-encoded parent' => ['media', 'editor-images/%2e%2e/%2e%2e/.env'],
]);

it('never falls back to an external URL for an upload', function (): void {
    $withUrl = fn (string $path): string => str_replace(['data-path="editor-images/a.jpg"'], ['data-path="'.$path.'" data-url="https://x.test/y.png"'], UPLOAD);

    expect(renderImage($withUrl('../x')))->not->toContain('src=')->not->toContain('x.test')
        ->and(renderImage($withUrl('editor-images/a.jpg')))->toContain('src="https://files.test/media/editor-images/a.jpg"')->not->toContain('x.test');
});

it('renders no src when resolving fails', function (): void {
    $failing = imagePlugin()->urlUsing(fn (): string => throw new RuntimeException('down'));

    expect(renderImage(UPLOAD, $failing))->not->toContain('src=')->toContain('alt="A cat"');
});

it('answers the urls request for the safe paths among the first 100 it is asked for', function (): void {
    $field = RichEditorPlus::make('body')->addPlugins([imagePlugin()]);
    $paths = ['editor-images/a.jpg', '../x', 'other/b.jpg', ...array_map(fn (int $i): string => "editor-images/{$i}.jpg", range(1, 200))];

    $answer = $field->answerPluginRequestForJs('hollyit/image', 'urls', ['paths' => $paths]);

    expect($answer['urls']['editor-images/a.jpg'])->toBe('https://files.test/media/editor-images/a.jpg')
        ->and($answer['urls'])->not->toHaveKey('../x')->not->toHaveKey('other/b.jpg')
        ->and(array_keys($answer['urls']))->toBe(['editor-images/a.jpg', ...array_map(fn (int $i): string => "editor-images/{$i}.jpg", range(1, 97))])
        ->and($field->answerPluginRequestForJs('hollyit/image', 'nonsense', []))->toBe([])
        ->and($field->answerPluginRequestForJs('hollyit/image', 'urls', ['paths' => 'x']))->toBe(['urls' => []]);
});

it('writes CSS for its widths and alignments', function (): void {
    $css = imagePlugin()->widths(['half' => '50%', 'small' => '12rem'])->defaultWidth('half')->getStylesheet();

    expect($css)->toContain('.rep-image[data-width="half"]{width:50%}')
        ->toContain('.rep-image[data-width="small"]{width:12rem}')
        ->toContain('.rep-image[data-align="center"]')
        ->toContain('.rep-image[data-align="wide"]')
        ->and(imagePlugin()->getEditorStyles())->toBe(imagePlugin()->getStylesheet());
});

it('refuses bad configuration', function (Closure $configure): void {
    expect(fn () => $configure(imagePlugin())->getStylesheet())->toThrow(InvalidArgumentException::class, 'ImagePlugin');
})->with([
    'unknown disk' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->disk('nope')],
    'unsafe directory' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->directory('../up')],
    'percent in directory' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->directory('editor%2fimages')],
    'bad width key' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->widths(['Half' => '50%'])->defaultWidth('Half')],
    'bad width value' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->widths(['half' => '50%;}body{x:y'])->defaultWidth('half')],
    'default width missing' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->defaultWidth('33')],
    'default alignment unknown' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->defaultAlignment('middle')],
    'non-image type' => [fn (ImagePlugin $plugin): ImagePlugin => $plugin->acceptedFileTypes(['application/pdf'])],
]);

it('gives its caption, or else its alt, as plain text', function (): void {
    expect(RichContentPlusRenderer::make(UPLOAD)->plugins([imagePlugin()])->toText())->toContain('Our cat')
        ->and(RichContentPlusRenderer::make(str_replace('<figcaption>Our cat</figcaption>', '', UPLOAD))->plugins([imagePlugin()])->toText())->toContain('A cat');
});

it('gives the alt, or nothing, as plain text when the caption or alt in a JSON document is not a string', function (): void {
    $text = fn (mixed $caption, mixed $alt): string => RichContentPlusRenderer::make(['type' => 'doc', 'content' => [
        ['type' => 'image', 'attrs' => ['disk' => 'media', 'path' => 'editor-images/a.jpg', 'caption' => $caption, 'alt' => $alt]],
    ]])->plugins([imagePlugin()])->toText();

    expect(trim($text(['x'], 'A cat')))->toBe('A cat')
        ->and(trim($text(['x'], ['y'])))->toBe('');
});

it('offers an image block type and block tools for images', function (): void {
    $plugin = imagePlugin();
    $blockType = $plugin->getBlockTypes()[0];
    $tools = collect($plugin->getTools())->keyBy(fn ($tool) => $tool->getName());

    expect($blockType->getName())->toBe('image')
        ->and($blockType->getAction())->toBe('image')
        ->and($blockType->getNodeName())->toBe('image')
        ->and($blockType->isSwitchable())->toBeFalse()
        ->and($tools->keys()->all())->toBe(['editImage', 'imageAlign', 'imageWidth'])
        ->and($tools['editImage']->toArray())->toMatchArray(['action' => 'image', 'scope' => 'block', 'nodes' => ['image']])
        ->and(array_map(fn ($item) => $item->getName(), $tools['imageAlign']->getMenu()))->toBe(['left', 'center', 'right', 'wide'])
        ->and(array_map(fn ($item) => $item->getName(), $tools['imageWidth']->getMenu()))->toBe(['25', '50', '75', '100'])
        ->and($plugin->getActions()[0]->getName())->toBe('image');
});

it('can turn uploads off', function (): void {
    $plugin = imagePlugin()->allowUrls()->allowUploads(false);
    $field = RichEditorPlus::make('content')->addPlugins([$plugin]);

    expect($plugin->allowsUploads())->toBeFalse()
        ->and($plugin->acceptsEditorUploads())->toBeFalse()
        ->and($plugin->getJsExtension()->getOptions()['uploads'])->toBeNull()
        ->and($field->hasFileAttachments())->toBeFalse()
        ->and($plugin->answerEditorRequest('store', ['key' => 'x'], $field))->toBe(['error' => __('rich-editor-plus::errors.image.uploads_disabled')]);
});

it('takes uploads by default', function (): void {
    expect(imagePlugin()->allowsUploads())->toBeTrue()
        ->and(imagePlugin()->acceptsEditorUploads())->toBeTrue()
        ->and(RichEditorPlus::make('content')->addPlugins([imagePlugin()])->hasFileAttachments())->toBeTrue();
});

it('needs uploads or URLs', function (): void {
    imagePlugin()->allowUrls(false)->allowUploads(false)->getNodes();
})->throws(InvalidArgumentException::class, 'ImagePlugin needs uploads or URLs: call ->allowUrls() when uploads are off.');

it('never lets a type/* wildcard match a type that can run script', function (): void {
    $wildcards = ImagePlugin::make()->disk('media')->acceptedFileTypes(['image/*', 'text/*']);

    expect($wildcards->acceptsFileType('image/png'))->toBeTrue()
        ->and($wildcards->acceptsFileType('image/webp'))->toBeTrue()
        ->and($wildcards->acceptsFileType('text/plain'))->toBeTrue()
        ->and($wildcards->acceptsFileType('image/svg+xml'))->toBeFalse()
        ->and($wildcards->acceptsFileType('IMAGE/SVG+XML'))->toBeFalse()
        ->and($wildcards->acceptsFileType('text/html'))->toBeFalse()
        ->and($wildcards->acceptsFileType('text/xml'))->toBeFalse()
        ->and($wildcards->acceptsFileType('text/javascript'))->toBeFalse()
        ->and(ImagePlugin::make()->disk('media')->acceptedFileTypes(['image/svg+xml'])->acceptsFileType('image/svg+xml'))->toBeTrue();
});

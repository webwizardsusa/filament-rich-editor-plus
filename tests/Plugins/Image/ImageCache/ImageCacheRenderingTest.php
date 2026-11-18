<?php

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Webwizardsusa\ImageCache\Enums\Visibility;
use Webwizardsusa\ImageCache\Models\Image;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Tests\Support\ImageCacheTestCase;

uses(ImageCacheTestCase::class);

function editorImage(Visibility $visibility = Visibility::Public, string $directory = 'editor-images'): Image
{
    return Image::store(UploadedFile::fake()->image('photo.jpg', 800, 600), $visibility, $directory);
}

function placement(Image $image, string $style = 'banner', string $alt = 'A cat', string $caption = ''): string
{
    $figcaption = $caption !== '' ? "<figcaption>{$caption}</figcaption>" : '';

    return "<figure class=\"rep-image\" data-type=\"image\" data-image=\"{$image->ulid}\" data-style=\"{$style}\" data-align=\"center\" data-width=\"100\"><img alt=\"{$alt}\">{$figcaption}</figure>";
}

function renderPlacement(string $html, ?ImagePlugin $plugin = null): string
{
    return RichContentPlusRenderer::make($html)->plugins([$plugin ?? ImagePlugin::make()->imageCache()])->toHtml();
}

it('stores a Placement by its Image and style, and renders the Variant\'s URL', function (): void {
    $image = editorImage();
    $html = placement($image, caption: 'Our cat');

    expect(RichContentPlusRenderer::make($html)->parseHtml()->plugins([ImagePlugin::make()->imageCache()])->toStorableHtml())->toBe($html)
        ->and(renderPlacement($html))->toBe(str_replace('<img alt', "<img src=\"http://localhost/image-cache/banner/{$image->ulid}\" alt", $html));
});

it('renders the disk URL once the Variant exists', function (): void {
    $image = editorImage();
    $this->get($image->url('thumb'));

    expect(renderPlacement(placement($image, 'thumb')))->toContain('src="'.Storage::disk('public')->url("image-cache/thumb/{$image->path}").'"');
});

it('shows a Placement in an unknown style in the default style', function (): void {
    $image = editorImage();
    $plugin = ImagePlugin::make()->imageCache(['thumb', 'banner'], 'thumb');

    expect(renderPlacement(placement($image, 'huge'), $plugin))
        ->toContain('data-style="thumb"')
        ->toContain("/image-cache/thumb/{$image->ulid}");
});

it('loads the Images of a whole batch in one query', function (): void {
    $images = [editorImage(), editorImage(), editorImage()];

    DB::enableQueryLog();

    $rendered = RichContentPlusRenderer::many(array_map(fn (Image $image): string => placement($image), $images))
        ->plugins([ImagePlugin::make()->imageCache()])
        ->toHtml();

    $imageQueries = array_filter(DB::getQueryLog(), fn (array $query): bool => str_contains($query['query'], 'from "images"'));

    expect($imageQueries)->toHaveCount(1)
        ->and(array_values($rendered))->each->toContain('src="http://localhost/image-cache/banner/');
});

it('never shows an Image outside the field\'s directory, of another Visibility, or refused by imageQueryUsing', function (Closure $makeImage, ?Closure $query): void {
    $image = $makeImage();
    $plugin = ImagePlugin::make()->imageCache()->imageQueryUsing($query);

    expect(renderPlacement(placement($image), $plugin))->not->toContain('src=');
})->with([
    'another directory' => [fn (): Image => editorImage(directory: 'avatars'), null],
    'a private Image on a public field' => [fn (): Image => editorImage(Visibility::Private), null],
    'refused by the query' => [fn (): Image => editorImage(), fn (Builder $query) => $query->whereRaw('0 = 1')],
]);

it('drops a src the stored document carried', function (): void {
    $image = editorImage(directory: 'avatars');
    $html = str_replace('<img alt', '<img src="https://evil.test/x.png" alt', placement($image));

    expect(renderPlacement($html))->not->toContain('evil.test');
});

it('shows private Images on a private field, through signed URLs', function (): void {
    $image = editorImage(Visibility::Private);

    expect(renderPlacement(placement($image), ImagePlugin::make()->imageCache()->privateImages()))
        ->toContain("/image-cache/banner/{$image->ulid}?expires=");
});

it('still renders images stored by disk and path, and external images', function (): void {
    Storage::disk('public')->put('editor-images/a.jpg', 'x');
    $upload = '<figure class="rep-image" data-type="image" data-disk="public" data-path="editor-images/a.jpg" data-align="center" data-width="100"><img alt="Old"></figure>';
    $external = '<figure class="rep-image" data-type="image" data-url="https://example.com/a.png" data-align="center" data-width="100"><img src="https://example.com/a.png" alt="Linked"></figure>';

    expect(renderPlacement($upload))->toContain('src="'.Storage::disk('public')->url('editor-images/a.jpg').'"')
        ->and(renderPlacement($external))->toContain('src="https://example.com/a.png"');
});

it('answers the urls request for Placements and for paths', function (): void {
    Storage::disk('public')->put('editor-images/a.jpg', 'x');
    $image = editorImage();
    $elsewhere = editorImage(directory: 'avatars');
    $field = RichEditorPlus::make('body')->addPlugins([ImagePlugin::make()->imageCache()]);

    $answer = $field->answerPluginRequestForJs('webwizardsusa/image', 'urls', ['paths' => [
        "{$image->ulid}:thumb",
        strtoupper($image->ulid).':nonsense',
        "{$elsewhere->ulid}:thumb",
        'editor-images/a.jpg',
        '../secret',
    ]]);

    expect($answer['urls'])->toBe([
        'editor-images/a.jpg' => Storage::disk('public')->url('editor-images/a.jpg'),
        "{$image->ulid}:thumb" => "http://localhost/image-cache/thumb/{$image->ulid}",
        strtoupper($image->ulid).':nonsense' => "http://localhost/image-cache/thumb/{$image->ulid}",
    ]);
});

it('offers every registered style by default, and refuses styles that are not registered', function (): void {
    expect(ImagePlugin::make()->imageCache()->imageCacheImages()->styles())->toBe(['thumb', 'banner'])
        ->and(ImagePlugin::make()->imageCache()->imageCacheImages()->defaultStyle())->toBe('thumb');

    ImagePlugin::make()->imageCache(['thumb', 'huge'])->getNodes();
})->throws(InvalidArgumentException::class, 'Image Style [huge], which is not registered');

it('refuses a default style that is not one of its styles', function (): void {
    ImagePlugin::make()->imageCache(['thumb'], 'banner')->getNodes();
})->throws(InvalidArgumentException::class, 'default Image Style [banner]');

it('sends its styles to the editor, and nothing without imageCache()', function (): void {
    expect(ImagePlugin::make()->imageCache(['banner', 'thumb'])->getJsExtension()->getOptions()['imageCache'])->toBe(['styles' => ['banner', 'thumb'], 'defaultStyle' => 'banner'])
        ->and(ImagePlugin::make()->getJsExtension()->getOptions()['imageCache'])->toBeNull();
});

it('leaves data-image alone without imageCache()', function (): void {
    $image = editorImage();

    expect(renderPlacement(placement($image), ImagePlugin::make()))->not->toContain('data-image')->not->toContain('src=');
});

it('gives Placements a lazy srcset of the field\'s styles, never wider than their own', function (): void {
    $image = editorImage();
    $plugin = ImagePlugin::make()->imageCache()->imageSrcset(['thumb', 'banner']);

    $banner = renderPlacement(placement($image, 'banner'), $plugin);
    $thumb = renderPlacement(placement($image, 'thumb'), $plugin);

    expect($banner)->toContain('srcset="'.e($image->url('thumb').' 100w, '.$image->url('banner').' 400w').'"')
        ->toContain('sizes="auto, 100vw"')
        ->toContain('loading="lazy"')
        ->toContain('decoding="async"')
        ->and($thumb)->not->toContain('srcset')->not->toContain('loading=');
});

it('takes a named srcset and the sizes given, and never stores the srcset', function (): void {
    config(['image-cache.srcsets.post' => ['thumb', 'banner']]);
    $image = editorImage();
    $plugin = ImagePlugin::make()->imageCache()->imageSrcset('post', sizes: '(min-width: 768px) 50vw, 100vw');

    expect(renderPlacement(placement($image), $plugin))->toContain('sizes="(min-width: 768px) 50vw, 100vw"')->toContain(' 400w')
        ->and(RichContentPlusRenderer::make(placement($image))->parseHtml()->plugins([$plugin])->toStorableHtml())->toBe(placement($image));
});

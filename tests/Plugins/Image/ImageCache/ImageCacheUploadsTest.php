<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Actions\Testing\TestAction;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Illuminate\Http\UploadedFile;
use Livewire\Component;
use Livewire\Features\SupportTesting\Testable;
use Livewire\Livewire;
use Webwizardsusa\ImageCache\Enums\Visibility;
use Webwizardsusa\ImageCache\Models\Image;
use Webwizardsusa\RichEditorPlus\Plugins\Image\ImagePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Tests\Support\ImageCacheTestCase;

uses(ImageCacheTestCase::class);

beforeEach(function (): void {
    ImageCacheUploadsTestForm::$plugin = fn (): ImagePlugin => ImagePlugin::make()->imageCache();
});

class ImageCacheUploadsTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public static ?Closure $plugin = null;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([RichEditorPlus::make('content')->addPlugins([(self::$plugin)()])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

/**
 * Uploads the file under the key, as the editor's `upload()` does, then sends the `store` request.
 *
 * @return array<string, mixed>
 */
function storeEditorUpload(UploadedFile $file, string $key = 'k-1'): array
{
    $component = Livewire::test(ImageCacheUploadsTestForm::class)->set("componentFileAttachments.data.content.{$key}", $file);
    $fieldKey = $component->instance()->form->getComponents()[0]->getKey();

    return $component->instance()->callSchemaComponentMethod($fieldKey, 'answerPluginRequestForJs', [
        'plugin' => 'webwizardsusa/image',
        'request' => 'store',
        'payload' => ['key' => $key],
    ]);
}

function imageCacheAction(): TestAction
{
    return TestAction::make('image')->schemaComponent('content');
}

/**
 * The attributes of the first editor command the modal sent.
 *
 * @return array<string, mixed>
 */
function sentImageAttrs(Testable $component): array
{
    $attrs = null;

    $component->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params) use (&$attrs): bool {
        $attrs = ['command' => $params['commands'][0]['name'], ...$params['commands'][0]['arguments'][0]];

        return true;
    });

    return $attrs;
}

const IMAGE_CACHE_SELECTION = ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]];

it('stores a pasted or dropped image as an Image, and answers with its Placement', function (): void {
    $answer = storeEditorUpload(UploadedFile::fake()->image('cat.png', 300, 200));
    $image = Image::query()->sole();

    expect($image->path)->toStartWith('editor-images/')
        ->and($image->visibility)->toBe(Visibility::Public)
        ->and($answer)->toMatchArray([
            'disk' => 'public',
            'path' => "{$image->ulid}:thumb",
            'name' => 'cat.png',
            'mime' => 'image/png',
            'url' => "http://localhost/image-cache/thumb/{$image->ulid}",
            'attrs' => ['image' => $image->ulid, 'style' => 'thumb', 'disk' => null, 'path' => null, 'url' => null],
        ]);
});

it('stores uploads as private Images on a private field', function (): void {
    ImageCacheUploadsTestForm::$plugin = fn (): ImagePlugin => ImagePlugin::make()->imageCache()->privateImages()->directory('scans');

    storeEditorUpload(UploadedFile::fake()->image('cat.png', 30, 20));

    expect(Image::query()->sole())->visibility->toBe(Visibility::Private)
        ->path->toStartWith('scans/');
});

it('refuses a file that is not an accepted image, and stores nothing', function (): void {
    expect(storeEditorUpload(UploadedFile::fake()->createWithContent('cat.png', 'not an image')))->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')])
        ->and(Image::query()->count())->toBe(0);
});

it('refuses uploads when they are turned off', function (): void {
    ImageCacheUploadsTestForm::$plugin = fn (): ImagePlugin => ImagePlugin::make()->imageCache()->allowUploads(false);

    expect(storeEditorUpload(UploadedFile::fake()->image('cat.png', 30, 20)))->toBe(['error' => __('rich-editor-plus::errors.image.uploads_disabled')]);
});

it('inserts an upload from the modal as a Placement in the chosen style', function (): void {
    $component = Livewire::test(ImageCacheUploadsTestForm::class)
        ->callAction(imageCacheAction(), data: ['source' => 'upload', 'upload' => UploadedFile::fake()->image('cat.jpg', 600, 400), 'alt' => 'A cat', 'caption' => 'Ours', 'style' => 'banner', 'align' => 'left', 'width' => '50'], arguments: IMAGE_CACHE_SELECTION)
        ->assertHasNoActionErrors();

    $image = Image::query()->sole();

    expect(sentImageAttrs($component))->toBe([
        'command' => 'insertImage',
        'disk' => null,
        'path' => null,
        'url' => null,
        'image' => $image->ulid,
        'style' => 'banner',
        'alt' => 'A cat',
        'caption' => 'Ours',
        'align' => 'left',
        'width' => '50',
    ])->and($image->path)->toStartWith('editor-images/');
});

it('keeps the Image when editing without a new upload, and changes its style', function (): void {
    $image = Image::store(UploadedFile::fake()->image('cat.jpg', 60, 40), directory: 'editor-images');

    $component = Livewire::test(ImageCacheUploadsTestForm::class)
        // Through arguments(): Filament's test helper reads an `image` key in callAction()'s arguments as the `image` action's.
        ->callAction(imageCacheAction()->arguments([...IMAGE_CACHE_SELECTION, 'editing' => true, 'image' => $image->ulid, 'style' => 'thumb', 'alt' => 'A cat', 'align' => 'center', 'width' => '100']), data: ['alt' => 'Still a cat', 'style' => 'banner'])
        ->assertHasNoActionErrors();

    expect(sentImageAttrs($component))->toMatchArray(['command' => 'updateImage', 'image' => $image->ulid, 'style' => 'banner', 'alt' => 'Still a cat'])
        ->and(Image::query()->count())->toBe(1);
});

it('does not keep an Image the field may not show when editing', function (): void {
    $image = Image::store(UploadedFile::fake()->image('cat.jpg', 60, 40), directory: 'avatars');

    Livewire::test(ImageCacheUploadsTestForm::class)
        ->callAction(imageCacheAction()->arguments([...IMAGE_CACHE_SELECTION, 'editing' => true, 'image' => $image->ulid, 'align' => 'center', 'width' => '100']), data: ['alt' => 'A cat'])
        ->assertHasActionErrors(['upload' => 'required']);
});

it('inserts an external image by URL without a style', function (): void {
    $component = Livewire::test(ImageCacheUploadsTestForm::class)
        ->callAction(imageCacheAction(), data: ['source' => 'url', 'url' => 'https://example.com/cat.png', 'alt' => 'A cat', 'align' => 'center', 'width' => '100'], arguments: IMAGE_CACHE_SELECTION)
        ->assertHasNoActionErrors();

    expect(sentImageAttrs($component))->toMatchArray(['image' => null, 'style' => null, 'url' => 'https://example.com/cat.png'])
        ->and(Image::query()->count())->toBe(0);
});

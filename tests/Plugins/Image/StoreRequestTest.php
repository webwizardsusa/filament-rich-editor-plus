<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Plugins\Image\AttachmentPlugin;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Component;
use Livewire\Features\SupportTesting\Testable;
use Livewire\Livewire;

uses(TestCase::class);

const SVG_WITH_SCRIPT = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);
    Storage::fake('media');

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../../../resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus-image', __DIR__.'/../../../resources/js/plugins/image/index.js'),
    ], 'hollyit/rich-editor-plus');

    StoreTestForm::$plugins = fn (): array => [ImagePlugin::make()->disk('media')];
    StoreTestForm::$disabled = false;
});

class StoreTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public static ?Closure $plugins = null;

    public static bool $disabled = false;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([RichEditorPlus::make('content')->addPlugins((self::$plugins)())->disabled(self::$disabled)])
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
function storeUpload(string $plugin, ?UploadedFile $file, string $key = 'k-1', ?Testable $component = null): array
{
    $component ??= Livewire::test(StoreTestForm::class);

    if ($file !== null) {
        $component->set("componentFileAttachments.data.content.{$key}", $file);
    }

    $fieldKey = $component->instance()->form->getComponents()[0]->getKey();

    return $component->instance()->callSchemaComponentMethod($fieldKey, 'answerPluginRequestForJs', [
        'plugin' => $plugin,
        'request' => 'store',
        'payload' => ['key' => $key],
    ]);
}

it('stores a pasted image on the plugin\'s disk and answers its file and URL', function (): void {
    $answer = storeUpload('hollyit/image', UploadedFile::fake()->image('cat.png', 20, 20));

    expect($answer)->toHaveKeys(['disk', 'path', 'name', 'size', 'mime', 'url'])
        ->and($answer['disk'])->toBe('media')
        ->and($answer['path'])->toMatch('#^editor-images/[A-Za-z0-9]{40}\.png$#')
        ->and($answer['name'])->toBe('cat.png')
        ->and($answer['mime'])->toBe('image/png')
        ->and($answer['size'])->toBeInt()->toBeGreaterThan(0)
        ->and($answer['url'])->toBe(Storage::disk('media')->url($answer['path']))
        ->and(Storage::disk('media')->exists($answer['path']))->toBeTrue();
});

it('refuses a file whose contents are not an accepted type, whatever its name says', function (): void {
    $answer = storeUpload('hollyit/image', UploadedFile::fake()->createWithContent('cat.png', 'just some text'));

    expect($answer)->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')])
        ->and(Storage::disk('media')->allFiles())->toBe([]);
});

it('refuses a file over the maximum size', function (): void {
    StoreTestForm::$plugins = fn (): array => [ImagePlugin::make()->disk('media')->maxSize(1)];
    $image = UploadedFile::fake()->image('big.png', 40, 40);
    $png = file_get_contents($image->getRealPath()).str_repeat("\0", 2048);
    $file = UploadedFile::fake()->createWithContent('big.png', $png);

    expect($file->getSize())->toBeGreaterThan(1024)
        ->and(storeUpload('hollyit/image', $file))->toBe(['error' => __('rich-editor-plus::errors.image.too_large', ['size' => '1 KB'])])
        ->and(Storage::disk('media')->allFiles())->toBe([]);
});

it('answers upload_missing for an unknown key, a malformed key and a disabled field', function (?string $key, bool $disabled): void {
    StoreTestForm::$disabled = $disabled;
    $component = Livewire::test(StoreTestForm::class)->set('componentFileAttachments.data.content.k-1', UploadedFile::fake()->image('cat.png'));

    expect(storeUpload('hollyit/image', null, $key, $component))->toBe(['error' => __('rich-editor-plus::errors.image.upload_missing')])
        ->and(Storage::disk('media')->allFiles())->toBe([]);
})->with([
    'unknown key' => ['nope', false],
    'malformed key' => ['../k-1', false],
    'disabled field' => ['k-1', true],
]);

it('takes an upload once: the same key again is missing', function (): void {
    $component = Livewire::test(StoreTestForm::class);

    expect(storeUpload('hollyit/image', UploadedFile::fake()->image('cat.png'), 'k-1', $component))->toHaveKey('path')
        ->and(storeUpload('hollyit/image', null, 'k-1', $component))->toBe(['error' => __('rich-editor-plus::errors.image.upload_missing')])
        ->and(Storage::disk('media')->allFiles())->toHaveCount(1);
});

it('removes the temporary entry whether storing succeeds or not', function (UploadedFile $file): void {
    $component = Livewire::test(StoreTestForm::class);
    storeUpload('hollyit/image', $file, 'k-1', $component);

    expect(data_get($component->instance()->componentFileAttachments, 'data.content.k-1'))->toBeNull();
})->with([
    'stored' => fn (): UploadedFile => UploadedFile::fake()->image('cat.png'),
    'refused' => fn (): UploadedFile => UploadedFile::fake()->createWithContent('cat.png', 'text'),
]);

it('answers store_failed when the disk refuses the write without throwing', function (): void {
    $filesystem = Mockery::mock(Filesystem::class);
    $filesystem->shouldReceive('put')->once()->andReturn(false);
    Storage::set('media', $filesystem);
    $component = Livewire::test(StoreTestForm::class);

    expect(storeUpload('hollyit/image', UploadedFile::fake()->image('cat.png'), 'k-1', $component))
        ->toBe(['error' => __('rich-editor-plus::errors.image.store_failed')])
        ->and(data_get($component->instance()->componentFileAttachments, 'data.content.k-1'))->toBeNull();
});

it('sends the editor its upload route, alt rule and labels', function (): void {
    $options = ImagePlugin::make()->disk('media')->maxSize(2048)->getJsExtension()->getOptions();

    expect($options['altRequired'])->toBeTrue()
        ->and($options['uploads'])->toBe(['accept' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 'maxSize' => 2048])
        ->and($options['labels']['needsAlt'])->toBe('Needs alt text')
        ->and(array_keys($options['uploadLabels']))->toBe(['uploading', 'upload_failed', 'too_many_files', 'not_accepted', 'too_large', 'place_lost']);
});

it('formats file sizes', function (int $bytes, string $text): void {
    expect(ImagePlugin::formatFileSize($bytes))->toBe($text);
})->with([
    [0, '0 B'], [1023, '1023 B'], [1024, '1 KB'], [1536, '1.5 KB'], [10137, '9.9 KB'], [10240, '10 KB'],
    [482133, '471 KB'], [1048576, '1 MB'], [12582912, '12 MB'], [1073741824, '1 GB'],
]);

it('sanitises file names', function (string $name, string $clean): void {
    expect(ImagePlugin::sanitizeFileName($name))->toBe($clean);
})->with([
    ['  Q3 report.pdf ', 'Q3 report.pdf'],
    ['../../etc/passwd', '....etcpasswd'],
    ["a\\b\x00c\x1f.txt", 'abc.txt'],
    [str_repeat('a', 300), str_repeat('a', 255)],
]);

it('stores an attachment and answers its file without a URL', function (): void {
    StoreTestForm::$plugins = fn (): array => [AttachmentPlugin::make()->disk('media')];

    $answer = storeUpload('hollyit/attachment', UploadedFile::fake()->createWithContent('Q3 report.pdf', "%PDF-1.4\n".str_repeat('x', 200)));

    expect($answer)->toHaveKeys(['disk', 'path', 'name', 'size', 'mime'])
        ->and($answer)->not->toHaveKey('url')
        ->and($answer['path'])->toMatch('#^editor-attachments/[A-Za-z0-9]{40}\.pdf$#')
        ->and($answer['name'])->toBe('Q3 report.pdf')
        ->and($answer['mime'])->toBe('application/pdf')
        ->and(Storage::disk('media')->exists($answer['path']))->toBeTrue();
});

it('refuses HTML disguised as an accepted file', function (): void {
    StoreTestForm::$plugins = fn (): array => [AttachmentPlugin::make()->disk('media')];

    expect(storeUpload('hollyit/attachment', UploadedFile::fake()->createWithContent('notes.pdf', '<!DOCTYPE html><html><body><script>alert(1)</script></body></html>')))
        ->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')])
        ->and(Storage::disk('media')->allFiles())->toBe([]);
});

it('refuses an attachment over the maximum size', function (): void {
    StoreTestForm::$plugins = fn (): array => [AttachmentPlugin::make()->disk('media')->maxSize(1)];

    expect(storeUpload('hollyit/attachment', UploadedFile::fake()->createWithContent('big.pdf', "%PDF-1.4\n".str_repeat('x', 3000))))
        ->toBe(['error' => __('rich-editor-plus::errors.image.too_large', ['size' => '1 KB'])]);
});

it('sends a file only to the plugin it names', function (): void {
    StoreTestForm::$plugins = fn (): array => [ImagePlugin::make()->disk('media'), AttachmentPlugin::make()->disk('media')];

    expect(storeUpload('hollyit/image', UploadedFile::fake()->createWithContent('a.pdf', "%PDF-1.4\n".str_repeat('x', 200))))
        ->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')]);
});

it('takes a type/* wildcard as accepting every type of that kind', function (): void {
    StoreTestForm::$plugins = fn (): array => [ImagePlugin::make()->disk('media')->acceptedFileTypes(['image/*'])];

    $answer = storeUpload('hollyit/image', UploadedFile::fake()->image('cat.png', 20, 20));

    expect($answer)->toHaveKey('path')
        ->and($answer['path'])->toEndWith('.png')
        ->and($answer['mime'])->toBe('image/png');
});

it('never lets a wildcard take an SVG image, even renamed', function (string $name): void {
    StoreTestForm::$plugins = fn (): array => [ImagePlugin::make()->disk('media')->acceptedFileTypes(['image/*'])];

    expect(storeUpload('hollyit/image', UploadedFile::fake()->createWithContent($name, SVG_WITH_SCRIPT)))
        ->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')])
        ->and(Storage::disk('media')->allFiles())->toBe([]);
})->with(['logo.svg', 'logo.png']);

it('takes an SVG image when image/svg+xml is accepted by name', function (): void {
    StoreTestForm::$plugins = fn (): array => [ImagePlugin::make()->disk('media')->acceptedFileTypes(['image/*', 'image/svg+xml'])];

    $answer = storeUpload('hollyit/image', UploadedFile::fake()->createWithContent('logo.svg', SVG_WITH_SCRIPT));

    expect($answer['mime'] ?? null)->toBe('image/svg+xml')
        ->and($answer['path'])->toEndWith('.svg');
});

it('refuses a denied type even when a wildcard matches it', function (): void {
    StoreTestForm::$plugins = fn (): array => [AttachmentPlugin::make()->disk('media')->acceptedFileTypes(['text/*'])];

    expect(storeUpload('hollyit/attachment', UploadedFile::fake()->createWithContent('page.txt', '<!DOCTYPE html><html><body><script>alert(1)</script></body></html>')))
        ->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')])
        ->and(storeUpload('hollyit/attachment', UploadedFile::fake()->createWithContent('notes.txt', "Just some notes.\n"))['mime'] ?? null)->toBe('text/plain');
});

it('refuses a shell script even when a wildcard would take it', function (): void {
    StoreTestForm::$plugins = fn (): array => [AttachmentPlugin::make()->disk('media')->acceptedFileTypes(['text/*'])];

    expect(storeUpload('hollyit/attachment', UploadedFile::fake()->createWithContent('notes.txt', "#!/bin/sh\nrm -rf /tmp/x\n")))
        ->toBe(['error' => __('rich-editor-plus::errors.image.type_not_accepted')])
        ->and(Storage::disk('media')->allFiles())->toBe([]);
});

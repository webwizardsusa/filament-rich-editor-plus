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
use Livewire\Livewire;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);
    config()->set('filesystems.disks.vault', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/vault'), 'visibility' => 'private']);
});

/**
 * @return array<string, ImagePlugin | AttachmentPlugin>
 */
function fieldPlugins(RichEditorPlus $field): array
{
    return $field->getPluginRegistry()->getPlugins();
}

it('defaults to Filament\'s disk, using public in place of local for public files', function (string $filamentDisk, string $visibility, string $disk): void {
    config()->set('filament.default_filesystem_disk', $filamentDisk);

    expect(ImagePlugin::make()->visibility($visibility)->getDisk())->toBe($disk)
        ->and(AttachmentPlugin::make()->visibility($visibility)->getDisk())->toBe($disk);
})->with([
    'local, public files' => ['local', 'public', 'public'],
    'local, private files' => ['local', 'private', 'local'],
    'another disk' => ['media', 'public', 'media'],
]);

it('keeps a disk given to the plugin', function (): void {
    config()->set('filament.default_filesystem_disk', 'local');

    expect(ImagePlugin::make()->disk('vault')->getDisk())->toBe('vault');
});

it('takes the field\'s attachment settings for what a plugin was not given', function (): void {
    $field = RichEditorPlus::make('content')
        ->fileAttachmentsDisk('vault')
        ->fileAttachmentsDirectory('uploads')
        ->fileAttachmentsVisibility('private')
        ->fileAttachmentsMaxSize(100)
        ->fileAttachmentsAcceptedFileTypes(['image/png'])
        ->addPlugins([ImagePlugin::make(), AttachmentPlugin::make()]);

    $image = fieldPlugins($field)[ImagePlugin::ID];
    $attachment = fieldPlugins($field)[AttachmentPlugin::ID];

    expect([$image->getDisk(), $image->getDirectory(), $image->getVisibility(), $image->getMaxSize(), $image->getAcceptedFileTypes()])
        ->toBe(['vault', 'uploads', 'private', 100, ['image/png']])
        ->and([$attachment->getDisk(), $attachment->getDirectory(), $attachment->getVisibility(), $attachment->getMaxSize()])
        ->toBe(['vault', 'uploads', 'private', 100])
        ->and($attachment->getAcceptedFileTypes())->toBe(AttachmentPlugin::DEFAULT_TYPES);
});

it('keeps what a plugin was given over the field\'s settings', function (): void {
    $field = RichEditorPlus::make('content')
        ->fileAttachmentsDisk('vault')
        ->fileAttachmentsMaxSize(100)
        ->addPlugins([ImagePlugin::make()->disk('media')->maxSize(200)]);

    $image = fieldPlugins($field)[ImagePlugin::ID];

    expect([$image->getDisk(), $image->getMaxSize()])->toBe(['media', 200]);
});

it('keeps each plugin\'s own defaults when the field has no attachment settings', function (): void {
    $image = fieldPlugins(RichEditorPlus::make('content')->addPlugins([ImagePlugin::make()->disk('media')]))[ImagePlugin::ID];

    expect([$image->getDirectory(), $image->getMaxSize(), $image->getAcceptedFileTypes()])
        ->toBe([ImagePlugin::make()->getDirectory(), ImagePlugin::make()->getMaxSize(), ImagePlugin::make()->getAcceptedFileTypes()]);
});

it('does not change the plugin instance it was given', function (): void {
    $plugin = ImagePlugin::make()->disk('media');
    $field = RichEditorPlus::make('content')->fileAttachmentsDirectory('uploads')->addPlugins([$plugin]);

    expect(fieldPlugins($field)[ImagePlugin::ID]->getDirectory())->toBe('uploads')
        ->and($plugin->getDirectory())->toBe('editor-images');
});

it('turns image uploads off with fileAttachments(false)', function (): void {
    $field = RichEditorPlus::make('content')->fileAttachments(false)->addPlugins([ImagePlugin::make()->disk('media')]);

    expect(fieldPlugins($field)[ImagePlugin::ID]->allowsUploads())->toBeFalse()
        ->and($field->hasFileAttachments())->toBeFalse();
});

class StorageDefaultsTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([RichEditorPlus::make('content')->addPlugins([ImagePlugin::make()->disk('media')])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

it('stores a public upload even when the disk refuses to change its visibility', function (): void {
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../../../resources/js/index.js'),
        AlpineComponent::make('rich-editor-plus-image', __DIR__.'/../../../resources/js/plugins/image/index.js'),
    ], 'hollyit/rich-editor-plus');

    $filesystem = Mockery::mock(Filesystem::class);
    $filesystem->shouldReceive('put')->once()->withArgs(fn (string $path, mixed $contents, mixed ...$options): bool => $options === [])->andReturn(true);
    $filesystem->shouldReceive('setVisibility')->once()->andThrow(new RuntimeException('AccessControlListNotSupported'));
    $filesystem->shouldReceive('url')->andReturnUsing(fn (string $path): string => "https://files.test/media/{$path}");
    Storage::set('media', $filesystem);

    $component = Livewire::test(StorageDefaultsTestForm::class)
        ->set('componentFileAttachments.data.content.k-1', UploadedFile::fake()->image('cat.png'));
    $fieldKey = $component->instance()->form->getComponents()[0]->getKey();

    $answer = $component->instance()->callSchemaComponentMethod($fieldKey, 'answerPluginRequestForJs', [
        'plugin' => ImagePlugin::ID,
        'request' => 'store',
        'payload' => ['key' => 'k-1'],
    ]);

    expect($answer)->toHaveKey('path')->not->toHaveKey('error');
});

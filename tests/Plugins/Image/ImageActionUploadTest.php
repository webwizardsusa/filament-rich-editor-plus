<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Actions\Testing\TestAction;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Component;
use Livewire\Features\SupportTesting\Testable;
use Livewire\Livewire;
use Tests\TestCase;

uses(TestCase::class);

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
});

class ImageUploadTestForm extends Component implements HasActions, HasSchemas
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

/**
 * Submits the image modal with an upload, as the browser does.
 */
function submitImageUpload(UploadedFile $upload): Testable
{
    return Livewire::test(ImageUploadTestForm::class)
        ->callAction(TestAction::make('image')->schemaComponent('content'), data: [
            'source' => 'upload',
            'upload' => $upload,
            'alt' => 'A cat',
            'align' => 'center',
            'width' => '100',
        ], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]]);
}

it('stores an uploaded image under the extension of its real type, never the one in its name', function (): void {
    $image = UploadedFile::fake()->image('cat.png', 10, 10);
    $png = file_get_contents($image->getRealPath());

    submitImageUpload(UploadedFile::fake()->createWithContent('x.html', $png)->mimeType('image/png'))
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => preg_match('#^editor-images/[A-Za-z0-9]{40}\.png$#', $params['commands'][0]['arguments'][0]['path']) === 1);

    expect(Storage::disk('media')->allFiles())->toHaveCount(1)
        ->and(Storage::disk('media')->allFiles()[0])->toEndWith('.png');
});

it('refuses an upload whose contents are not an image, whatever the browser reported', function (): void {
    submitImageUpload(UploadedFile::fake()->createWithContent('cat.png', '<html><body><script>alert(1)</script></body></html>')->mimeType('image/png'))
        ->assertHasActionErrors(['upload'])
        ->assertNotDispatched('run-rich-editor-plus-commands');

    expect(Storage::disk('media')->allFiles())->toBe([]);
});

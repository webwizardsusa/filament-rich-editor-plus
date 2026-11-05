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
use Livewire\Livewire;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../../../resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus-image', __DIR__.'/../../../resources/js/plugins/image/index.js'),
    ], 'hollyit/rich-editor-plus');
});

class ImageTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    protected function plugin(): ImagePlugin
    {
        return ImagePlugin::make()->disk('media');
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([RichEditorPlus::make('content')->addPlugins([$this->plugin()])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

class OptionalAltImageTestForm extends ImageTestForm
{
    protected function plugin(): ImagePlugin
    {
        return parent::plugin()->altRequired(false);
    }
}

function imageAction(): TestAction
{
    return TestAction::make('image')->schemaComponent('content');
}

function caretSelection(): array
{
    return ['type' => 'text', 'anchor' => 1, 'head' => 1];
}

it('inserts an uploaded image with its alt text, caption, alignment and width', function (): void {
    Storage::fake('media');
    $selection = ['type' => 'text', 'anchor' => 1, 'head' => 1];

    Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: [
            'source' => 'upload',
            'upload' => UploadedFile::fake()->image('cat.jpg'),
            'alt' => 'A cat',
            'caption' => 'Our cat',
            'align' => 'left',
            'width' => '50',
        ], arguments: ['editorSelection' => $selection])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params) use ($selection): bool {
            $command = $params['commands'][0];
            $attrs = $command['arguments'][0];

            return $params['editorSelection'] === $selection
                && $command['name'] === 'insertImage'
                && $attrs['disk'] === 'media'
                && str_starts_with($attrs['path'], 'editor-images/')
                && Storage::disk('media')->exists($attrs['path'])
                && $attrs['url'] === null
                && [$attrs['alt'], $attrs['caption'], $attrs['align'], $attrs['width']] === ['A cat', 'Our cat', 'left', '50'];
        });
});

it('refuses an upload that is not an accepted image type', function (): void {
    Storage::fake('media');

    Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: [
            'source' => 'upload',
            'upload' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
            'alt' => 'A',
        ], arguments: ['editorSelection' => caretSelection()])
        ->assertHasActionErrors(['upload'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
});

it('inserts an image by URL, and refuses other protocols', function (): void {
    Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'url', 'url' => 'https://example.test/a.png', 'alt' => 'A'], arguments: ['editorSelection' => caretSelection()])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0]['url'] === 'https://example.test/a.png'
            && $params['commands'][0]['arguments'][0]['disk'] === null);

    Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'url', 'url' => 'javascript:alert(1)', 'alt' => 'A'], arguments: ['editorSelection' => caretSelection()])
        ->assertHasActionErrors(['url'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
});

it('accepts a relative image URL and refuses other schemes', function (string $url, bool $isAccepted): void {
    $test = Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'url', 'url' => $url, 'alt' => 'A'], arguments: ['editorSelection' => caretSelection()]);

    if ($isAccepted) {
        $test->assertHasNoActionErrors()
            ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0]['url'] === $url);
    } else {
        $test->assertHasActionErrors(['url'])->assertNotDispatched('run-rich-editor-plus-commands');
    }
})->with([
    'root-relative' => ['/img/a.png', true],
    'path-relative' => ['img/a.png', true],
    'protocol-relative' => ['//cdn.example.test/a.png', true],
    'data' => ['data:image/png;base64,AAAA', false],
    'mixed-case javascript' => ['JaVaScript:alert(1)', false],
]);

it('requires alt text when the plugin does', function (): void {
    Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'url', 'url' => 'https://example.test/a.png', 'alt' => ''], arguments: ['editorSelection' => caretSelection()])
        ->assertHasActionErrors(['alt' => 'required']);
});

it('lets an image be decorative with empty alt text when alt is optional', function (): void {
    Livewire::test(OptionalAltImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'url', 'url' => 'https://example.test/a.png', 'decorative' => true, 'alt' => ''], arguments: ['editorSelection' => caretSelection()])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0]['alt'] === '');

    Livewire::test(OptionalAltImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'url', 'url' => 'https://example.test/a.png', 'decorative' => false, 'alt' => ''], arguments: ['editorSelection' => caretSelection()])
        ->assertHasActionErrors(['alt' => 'required']);
});

it('keeps the current file when editing without a new upload', function (): void {
    Livewire::test(ImageTestForm::class)
        ->mountAction(imageAction(), arguments: [
            'editorSelection' => ['type' => 'node', 'anchor' => 0],
            'editing' => true,
            'disk' => 'media', 'path' => 'editor-images/old.jpg', 'url' => null,
            'alt' => 'Old', 'caption' => '', 'align' => 'center', 'width' => '100',
        ])
        ->assertActionDataSet(['source' => 'upload', 'alt' => 'Old', 'align' => 'center', 'width' => '100'])
        ->setActionData(['alt' => 'New'])
        ->callMountedAction()
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['name'] === 'updateImage'
            && $params['commands'][0]['arguments'][0]['path'] === 'editor-images/old.jpg'
            && $params['commands'][0]['arguments'][0]['disk'] === 'media'
            && $params['commands'][0]['arguments'][0]['alt'] === 'New');
});

it('requires a file when inserting an upload', function (): void {
    Livewire::test(ImageTestForm::class)
        ->callAction(imageAction(), data: ['source' => 'upload', 'alt' => 'A'], arguments: ['editorSelection' => caretSelection()])
        ->assertHasActionErrors(['upload' => 'required'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
});

class NoUrlImageTestForm extends ImageTestForm
{
    protected function plugin(): ImagePlugin
    {
        return parent::plugin()->allowUrls(false);
    }
}

it('does not keep a file the plugin would not serve when editing', function (string $disk, string $path): void {
    Livewire::test(ImageTestForm::class)
        ->mountAction(imageAction(), arguments: [
            'editorSelection' => ['type' => 'node', 'anchor' => 0],
            'editing' => true,
            'disk' => $disk, 'path' => $path, 'url' => null,
            'alt' => 'Old', 'caption' => '', 'align' => 'center', 'width' => '100',
        ])
        ->callMountedAction()
        ->assertHasActionErrors(['upload' => 'required'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
})->with([
    'path traversal' => ['media', '../../.env'],
    'another disk' => ['other', 'editor-images/old.jpg'],
]);

it('keeps an external image URL when editing and URLs are not allowed', function (): void {
    Livewire::test(NoUrlImageTestForm::class)
        ->mountAction(imageAction(), arguments: [
            'editorSelection' => ['type' => 'node', 'anchor' => 0],
            'editing' => true,
            'disk' => null, 'path' => null, 'url' => 'https://example.test/a.png',
            'alt' => 'Old', 'caption' => '', 'align' => 'center', 'width' => '100',
        ])
        ->assertActionDataSet(['source' => 'upload'])
        ->setActionData(['alt' => 'New'])
        ->callMountedAction()
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['name'] === 'updateImage'
            && $params['commands'][0]['arguments'][0]['url'] === 'https://example.test/a.png'
            && $params['commands'][0]['arguments'][0]['path'] === null);
});

class UrlOnlyImageTestForm extends ImageTestForm
{
    protected function plugin(): ImagePlugin
    {
        return parent::plugin()->allowUrls()->allowUploads(false);
    }
}

it('inserts an image by URL alone when uploads are off', function (): void {
    Livewire::test(UrlOnlyImageTestForm::class)
        ->mountAction(imageAction(), arguments: ['editorSelection' => caretSelection()])
        ->assertFormFieldVisible('url')
        ->assertFormFieldHidden('source')
        ->assertFormFieldHidden('upload')
        ->setActionData(['url' => 'https://example.com/a.jpg', 'alt' => 'A'])
        ->callMountedAction()
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params): bool {
            $attrs = $params['commands'][0]['arguments'][0];

            return $params['commands'][0]['name'] === 'insertImage'
                && $attrs['url'] === 'https://example.com/a.jpg'
                && $attrs['disk'] === null
                && $attrs['path'] === null;
        });
});

it('keeps a stored image when only its alt text is edited and uploads are off', function (): void {
    Livewire::test(UrlOnlyImageTestForm::class)
        ->mountAction(imageAction(), arguments: [
            'editorSelection' => ['type' => 'node', 'anchor' => 0],
            'editing' => true,
            'disk' => 'media', 'path' => 'editor-images/old.jpg', 'url' => null,
            'alt' => 'Old', 'caption' => '', 'align' => 'center', 'width' => '100',
        ])
        ->setActionData(['alt' => 'New'])
        ->callMountedAction()
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params): bool {
            $attrs = $params['commands'][0]['arguments'][0];

            return $params['commands'][0]['name'] === 'updateImage'
                && $attrs['disk'] === 'media'
                && $attrs['path'] === 'editor-images/old.jpg'
                && $attrs['url'] === null
                && $attrs['alt'] === 'New';
        });
});

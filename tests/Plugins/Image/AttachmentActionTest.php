<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Actions\Testing\TestAction;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Component;
use Livewire\Livewire;
use Webwizardsusa\RichEditorPlus\Plugins\Image\AttachmentPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    config()->set('filesystems.disks.media', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/media'), 'url' => 'https://files.test/media', 'visibility' => 'public']);
    Storage::fake('media');

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../../../resources/js/index.js'),
    ], 'webwizardsusa/rich-editor-plus');
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus-image', __DIR__.'/../../../resources/js/plugins/image/index.js'),
    ], 'webwizardsusa/rich-editor-plus');
});

class AttachmentTestForm extends Component implements HasActions, HasSchemas
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
            ->components([RichEditorPlus::make('content')->addPlugins([AttachmentPlugin::make()->disk('media')])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function attachmentAction(): TestAction
{
    return TestAction::make('attachment')->schemaComponent('content');
}

function pdfUpload(string $name = 'Q3 report.pdf'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n".str_repeat('x', 200));
}

it('adds a File block and an edit tool', function (): void {
    $plugin = AttachmentPlugin::make()->disk('media');
    $block = $plugin->getBlockTypes()[0];
    $tool = $plugin->getTools()[0];

    expect($block->getName())->toBe('attachment')
        ->and([$block->getLabel(), $block->getIcon(), $block->getAction(), $block->getNodeName()])->toBe(['File', 'mdi-paperclip', 'attachment', 'attachment'])
        ->and($block->getKeywords())->toBe(['attachment', 'upload', 'document', 'pdf'])
        ->and([$tool->getName(), $tool->getAction(), $tool->getNodes()])->toBe(['editAttachment', 'attachment', ['attachment']]);
});

it('inserts an uploaded file with its name, size and type', function (): void {
    Livewire::test(AttachmentTestForm::class)
        ->callAction(attachmentAction(), data: ['upload' => pdfUpload(), 'name' => ''], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params): bool {
            $command = $params['commands'][0];
            $attrs = $command['arguments'][0];

            return $command['name'] === 'insertAttachment'
                && $attrs['disk'] === 'media'
                && str_starts_with($attrs['path'], 'editor-attachments/')
                && Storage::disk('media')->exists($attrs['path'])
                && $attrs['name'] === 'Q3 report.pdf'
                && $attrs['size'] === Storage::disk('media')->size($attrs['path'])
                && $attrs['mime'] === 'application/pdf';
        });
});

it('uses the name given in the modal', function (): void {
    Livewire::test(AttachmentTestForm::class)
        ->callAction(attachmentAction(), data: ['upload' => pdfUpload(), 'name' => ' Board pack / final.pdf '], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0]['name'] === 'Board pack  final.pdf');
});

it('refuses a file that is not an accepted type', function (): void {
    Livewire::test(AttachmentTestForm::class)
        ->callAction(attachmentAction(), data: ['upload' => UploadedFile::fake()->create('page.html', 1, 'text/html')], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertHasActionErrors(['upload'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
});

it('renames the current file when editing without a new upload', function (): void {
    Livewire::test(AttachmentTestForm::class)
        ->mountAction(attachmentAction(), arguments: [
            'editorSelection' => ['type' => 'node', 'anchor' => 0],
            'editing' => true,
            'disk' => 'media', 'path' => 'editor-attachments/old.pdf', 'name' => 'Old.pdf', 'size' => 2048, 'mime' => 'application/pdf',
        ])
        ->assertActionDataSet(['name' => 'Old.pdf'])
        ->setActionData(['name' => 'New.pdf'])
        ->callMountedAction()
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['name'] === 'updateAttachment'
            && $params['commands'][0]['arguments'][0] === ['disk' => 'media', 'path' => 'editor-attachments/old.pdf', 'name' => 'New.pdf', 'size' => 2048, 'mime' => 'application/pdf']);
});

it('does not keep a file the plugin would not serve when editing', function (string $disk, string $path): void {
    Livewire::test(AttachmentTestForm::class)
        ->mountAction(attachmentAction(), arguments: [
            'editorSelection' => ['type' => 'node', 'anchor' => 0],
            'editing' => true,
            'disk' => $disk, 'path' => $path, 'name' => 'Old.pdf', 'size' => 2048, 'mime' => 'application/pdf',
        ])
        ->callMountedAction()
        ->assertHasActionErrors(['upload' => 'required'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
})->with([
    'path traversal' => ['media', '../../.env'],
    'another disk' => ['other', 'editor-attachments/old.pdf'],
]);

it('requires a file when inserting', function (): void {
    Livewire::test(AttachmentTestForm::class)
        ->callAction(attachmentAction(), data: ['name' => 'x'], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertHasActionErrors(['upload' => 'required']);
});

it('stores an upload under the extension of its real type, never the one in its name', function (): void {
    $upload = UploadedFile::fake()->createWithContent('notes.html', "Some notes about the meeting.\n\n<img src=x onerror=alert(1)>\n")->mimeType('text/plain');

    Livewire::test(AttachmentTestForm::class)
        ->callAction(attachmentAction(), data: ['upload' => $upload, 'name' => ''], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params): bool {
            $attrs = $params['commands'][0]['arguments'][0];

            return preg_match('#^editor-attachments/[A-Za-z0-9]{40}\.txt$#', $attrs['path']) === 1
                && $attrs['name'] === 'notes.html'
                && Storage::disk('media')->exists($attrs['path']);
        });

    expect(collect(Storage::disk('media')->allFiles())->filter(fn (string $path): bool => str_ends_with($path, '.html')))->toBeEmpty();
});

it('refuses an upload whose contents are not an accepted type, whatever the browser reported', function (): void {
    $upload = UploadedFile::fake()->createWithContent('page.pdf', '<!DOCTYPE html><html><body><script>alert(1)</script></body></html>')->mimeType('application/pdf');

    Livewire::test(AttachmentTestForm::class)
        ->callAction(attachmentAction(), data: ['upload' => $upload, 'name' => ''], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertHasActionErrors(['upload'])
        ->assertNotDispatched('run-rich-editor-plus-commands');

    expect(Storage::disk('media')->allFiles())->toBe([]);
});

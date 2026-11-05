<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Components\Attributes\ExposedLivewireMethod;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Http\UploadedFile;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\Features\SupportTesting\Testable;
use Livewire\Livewire;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AcceptsEditorUploads;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'webwizardsusa/rich-editor-plus');

    UploadsTestForm::$disabled = false;
    UploadsTestForm::$withUploadPlugin = true;
});

class UploadingTestPlugin extends Plugin implements AcceptsEditorUploads
{
    public function acceptsEditorUploads(): bool
    {
        return true;
    }

    public function getId(): string
    {
        return 'test/uploading';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }
}

class UploadsTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public static bool $disabled = false;

    public static bool $withUploadPlugin = true;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            RichEditorPlus::make('content')
                ->addPlugins(self::$withUploadPlugin ? [UploadingTestPlugin::make()] : [])
                ->disabled(self::$disabled),
        ])->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function uploadsField(Testable $component): RichEditorPlus
{
    return $component->instance()->form->getComponents()[0];
}

function withTemporaryUpload(string $key = 'abc-123'): Testable
{
    return Livewire::test(UploadsTestForm::class)
        ->set("componentFileAttachments.data.content.{$key}", UploadedFile::fake()->createWithContent('notes.txt', 'hello'));
}

it('takes a temporary upload once and removes it', function (): void {
    $component = withTemporaryUpload();
    $field = uploadsField($component);

    expect($field->pullTemporaryUpload('abc-123'))->toBeInstanceOf(TemporaryUploadedFile::class)
        ->and(data_get($component->instance()->componentFileAttachments, 'data.content.abc-123'))->toBeNull()
        ->and($field->pullTemporaryUpload('abc-123'))->toBeNull();
});

it('takes nothing for a malformed key', function (string $key): void {
    expect(uploadsField(withTemporaryUpload())->pullTemporaryUpload($key))->toBeNull();
})->with(['empty' => [''], 'dots' => ['abc.123'], 'slash' => ['a/b'], 'too long' => [str_repeat('a', 65)]]);

it('takes nothing, and removes the entry, when it is not an upload', function (): void {
    $component = Livewire::test(UploadsTestForm::class);
    $component->instance()->componentFileAttachments = ['data' => ['content' => ['abc' => 'not a file']]];

    expect(uploadsField($component)->pullTemporaryUpload('abc'))->toBeNull()
        ->and(data_get($component->instance()->componentFileAttachments, 'data.content.abc'))->toBeNull();
});

it('takes nothing on a disabled field, and removes the entry', function (): void {
    UploadsTestForm::$disabled = true;
    $component = withTemporaryUpload();

    expect(uploadsField($component)->pullTemporaryUpload('abc-123'))->toBeNull()
        ->and(data_get($component->instance()->componentFileAttachments, 'data.content.abc-123'))->toBeNull();
});

it('passes Filament\'s upload gate only with a plugin that takes uploads', function (): void {
    expect(Livewire::test(UploadsTestForm::class)->instance()->isFileUploadForSchemaComponent('componentFileAttachments.data.content.abc'))->toBeTrue();

    UploadsTestForm::$withUploadPlugin = false;

    expect(Livewire::test(UploadsTestForm::class)->instance()->isFileUploadForSchemaComponent('componentFileAttachments.data.content.abc'))->toBeFalse();
});

it('does not expose Filament\'s own attachment storage', function (string $method): void {
    $exposed = (new ReflectionMethod(RichEditorPlus::class, $method))->getAttributes(ExposedLivewireMethod::class);

    expect($exposed)->toBe([])
        ->and(uploadsField(Livewire::test(UploadsTestForm::class))->{$method}())->toBeNull();
})->with(['getUploadedFileAttachmentTemporaryUrl', 'saveUploadedFileAttachmentAndGetUrl']);

it('gives the editor its state path and upload message', function (): void {
    $html = Livewire::test(UploadsTestForm::class)->html();

    expect($html)->toContain('statePath: ')->toContain('data.content')->toContain('uploadingMessage: ');
});

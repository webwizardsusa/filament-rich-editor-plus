<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\StateCasts\RichEditorPlusStateCast;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\StateFormat;
use Livewire\Component;
use Livewire\Livewire;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');
});

class StateCastTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    /**
     * @param  array<string, mixed> | string | null  $content
     */
    public function mount(array|string|null $content = null, string $format = 'json'): void
    {
        $this->format = $format;
        $this->form->fill(['content' => $content]);
    }

    public string $format = 'json';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([RichEditorPlus::make('content')->storeAs(StateFormat::from($this->format))])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function paragraphDocument(string $text = 'hi'): array
{
    return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]]]];
}

/**
 * A document nested far deeper than Livewire's default `max_nesting_depth` of 10 property path levels.
 *
 * @return array<string, mixed>
 */
function deeplyNestedDocument(int $levels = 12): array
{
    $node = ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'deep', 'marks' => [['type' => 'bold']]]]];

    for ($level = 0; $level < $levels; $level++) {
        $node = ['type' => 'blockquote', 'content' => [$node]];
    }

    return ['type' => 'doc', 'content' => [$node]];
}

function jsonCast(): RichEditorPlusStateCast
{
    return new RichEditorPlusStateCast(RichEditorPlus::make('content'));
}

function htmlCast(): RichEditorPlusStateCast
{
    return new RichEditorPlusStateCast(RichEditorPlus::make('content')->storeAs(StateFormat::Html));
}

it('turns a stored document into one JSON string for Livewire', function (): void {
    $state = jsonCast()->set(paragraphDocument('héllo/world'));

    expect($state)->toBeString()
        ->and(json_decode($state, true))->toBe(paragraphDocument('héllo/world'))
        ->and($state)->toContain('héllo/world');
});

it('turns the Livewire string back into the document', function (): void {
    expect(jsonCast()->get(json_encode(paragraphDocument())))->toBe(paragraphDocument());
});

it('accepts an array, JSON or HTML as the stored value', function (): void {
    $cast = jsonCast();

    expect(json_decode($cast->set(paragraphDocument()), true))->toBe(paragraphDocument())
        ->and(json_decode($cast->set(json_encode(paragraphDocument())), true))->toBe(paragraphDocument())
        ->and(json_decode($cast->set('<p>hi</p>'), true))->toBe(paragraphDocument());
});

it('treats blank values as no state', function (): void {
    expect(jsonCast()->set(null))->toBeNull()
        ->and(jsonCast()->set(''))->toBeNull()
        ->and(jsonCast()->get(null))->toBeNull()
        ->and(jsonCast()->get(''))->toBeNull()
        ->and(htmlCast()->set(null))->toBeNull();
});

it('is safe to apply more than once', function (): void {
    $cast = jsonCast();
    $once = $cast->set(paragraphDocument());

    expect($cast->set($once))->toBe($once);
});

it('keeps HTML as HTML when the field stores HTML', function (): void {
    $cast = htmlCast();

    expect($cast->set(paragraphDocument()))->toBe('<p>hi</p>')
        ->and($cast->set(json_encode(paragraphDocument())))->toBe('<p>hi</p>')
        ->and($cast->set('<p>hi</p>'))->toBe('<p>hi</p>')
        ->and($cast->get('<p>hi</p>'))->toBe('<p>hi</p>');
});

it('holds the document in Livewire as a single string', function (): void {
    $component = Livewire::test(StateCastTestForm::class, ['content' => paragraphDocument()]);

    expect($component->get('data.content'))->toBeString()
        ->and(json_decode($component->get('data.content'), true))->toBe(paragraphDocument());
});

it('gives the form the document as an array', function (): void {
    $state = Livewire::test(StateCastTestForm::class, ['content' => paragraphDocument()])
        ->instance()->form->getState();

    expect($state['content'])->toBe(paragraphDocument());
});

it('handles documents nested deeper than Livewire allows array paths to be', function (): void {
    $document = deeplyNestedDocument();
    $component = Livewire::test(StateCastTestForm::class, ['content' => $document]);

    // The whole document is one property, so there is no deep path for Livewire to reject.
    $component->set('data.content', json_encode(deeplyNestedDocument(14)))->assertHasNoErrors();

    expect($component->get('data.content'))->toBeString()
        ->and($component->instance()->form->getState()['content'])->toBe(deeplyNestedDocument(14));
});

it('stores HTML in Livewire and gives the form HTML when the field stores HTML', function (): void {
    $component = Livewire::test(StateCastTestForm::class, ['content' => paragraphDocument(), 'format' => 'html']);

    expect($component->get('data.content'))->toBe('<p>hi</p>')
        ->and($component->instance()->form->getState()['content'])->toBe('<p>hi</p>');
});

it('sends the editor the format it should produce', function (): void {
    Livewire::test(StateCastTestForm::class, ['format' => 'json'])->assertSeeHtml("format: 'json'");
    Livewire::test(StateCastTestForm::class, ['format' => 'html'])->assertSeeHtml("format: 'html'");
});

it('makes HTML safe when the field stores HTML', function (): void {
    $cast = htmlCast();

    expect($cast->get('<p onclick="x">a</p><script>evil()</script>'))->toBe('<p>a</p>')
        ->and($cast->set('<p onclick="x">a</p><script>evil()</script>'))->toBe('<p>a</p>');
});

it('keeps stored HTML stable across saves', function (): void {
    $cast = htmlCast();

    $once = $cast->get('<p>a <strong>b</strong></p>');

    expect($cast->get($cast->set($once)))->toBe($once);
});

it('does not throw on JSON that is not a document', function (string $state): void {
    expect(jsonCast()->get($state))->toBeArray()
        ->and(htmlCast()->get($state))->toBeString();
})->with(['123', '{}', '"x"']);

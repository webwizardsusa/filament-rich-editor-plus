<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Actions\Testing\TestAction;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Livewire\Component;
use Livewire\Livewire;

uses(TestCase::class);

beforeEach(function (): void {
    // Rendering the field needs its Alpine component asset, which only exists once the package has been built.
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');
});

class LinkActionTestForm extends Component implements HasActions, HasSchemas
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
            ->components([RichEditorPlus::make('content')])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function linkAction(): TestAction
{
    return TestAction::make('link')->schemaComponent('content');
}

it('sets a link on the selection the modal was opened for', function (): void {
    $selection = ['type' => 'text', 'anchor' => 1, 'head' => 6];

    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => 'https://example.com', 'shouldOpenInNewTab' => true], arguments: ['editorSelection' => $selection])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params) use ($selection): bool {
            return $params['key'] === 'form.content'
                && $params['editorSelection'] === $selection
                && $params['commands'] === [
                    ['name' => 'setLink', 'arguments' => [['href' => 'https://example.com', 'target' => '_blank']]],
                ];
        });
});

it('leaves the target off unless the link opens in a new tab', function (): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => 'https://example.com', 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 6]])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0]['target'] === null);
});

it('removes the link when the URL is cleared', function (): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => '', 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 6]])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'] === [['name' => 'unsetLink', 'arguments' => []]]);
});

it('extends the link over its whole range when only the cursor is inside it', function (): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => 'https://example.com', 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 3, 'head' => 3]])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0] === ['name' => 'extendMarkRange', 'arguments' => ['link']]
            && $params['commands'][1]['name'] === 'setLink');
});

it('does not treat a select-all as a cursor', function (): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => 'https://example.com', 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'all']])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => count($params['commands']) === 1 && $params['commands'][0]['name'] === 'setLink');
});

it('refuses a URL with a scheme the link plugin does not keep', function (string $url): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => $url, 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 6]])
        ->assertHasActionErrors(['url'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
})->with(['javascript' => 'javascript:alert(1)', 'data' => 'data:text/html,x', 'disguised' => " java\tscript:alert(1)"]);

it('accepts relative URLs and the configured schemes', function (string $url): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => $url, 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 6]])
        ->assertHasNoActionErrors();
})->with(['https' => 'https://example.com', 'mailto' => 'mailto:a@example.com', 'relative' => '/about', 'no scheme' => 'example.com']);

it('treats a selection without positions as a range, not a cursor', function (): void {
    Livewire::test(LinkActionTestForm::class)
        ->callAction(linkAction(), data: ['url' => 'https://example.com', 'shouldOpenInNewTab' => false], arguments: ['editorSelection' => ['type' => 'text']])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => count($params['commands']) === 1);
});

it('prefills the modal from the existing link', function (): void {
    Livewire::test(LinkActionTestForm::class)
        ->mountAction(linkAction(), arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 6], 'url' => 'https://old.test', 'shouldOpenInNewTab' => true])
        ->assertActionDataSet(['url' => 'https://old.test', 'shouldOpenInNewTab' => true]);
});

it('defaults the checkbox from the link plugin for a new link', function (): void {
    expect(LinkPlugin::make()->openInNewTab(false)->getActions()[0])->not->toBeNull();

    Livewire::test(LinkActionTestForm::class)
        ->mountAction(linkAction(), arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 6]])
        ->assertActionDataSet(['url' => null, 'shouldOpenInNewTab' => true]);
});

it('only registers actions for the plugins in use', function (): void {
    $withLink = RichEditorPlus::make('content')->plugins([LinkPlugin::make()])->getDefaultActions();
    $withoutLink = RichEditorPlus::make('content')->plugins([BoldPlugin::make()])->getDefaultActions();

    expect(collect($withLink)->map->getName()->all())->toBe(['link'])
        ->and($withoutLink)->toBe([]);
});

<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Actions\Testing\TestAction;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Plugins\Table\TablePlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Livewire\Component;
use Livewire\Livewire;

uses(TestCase::class);

beforeEach(function (): void {
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../../rich-editor-plus/resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus-table', __DIR__.'/../../../resources/js/plugins/table/index.js'),
    ], 'hollyit/rich-editor-plus');
});

class InsertTableTestForm extends Component implements HasActions, HasSchemas
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
            ->components([RichEditorPlus::make('content')->addPlugins([TablePlugin::make()->defaultSize(4, 5, false)])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function insertTableAction(): TestAction
{
    return TestAction::make('insertTable')->schemaComponent('content');
}

it('starts with the size configured on the plugin', function (): void {
    Livewire::test(InsertTableTestForm::class)
        ->mountAction(insertTableAction(), arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertActionDataSet(['rows' => 4, 'columns' => 5, 'withHeaderRow' => false]);
});

it('sends an insertTable command for the chosen size', function (): void {
    $selection = ['type' => 'text', 'anchor' => 1, 'head' => 1];

    Livewire::test(InsertTableTestForm::class)
        ->callAction(insertTableAction(), data: ['rows' => 2, 'columns' => 6, 'withHeaderRow' => true], arguments: ['editorSelection' => $selection])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['key'] === 'form.content'
            && $params['editorSelection'] === $selection
            && $params['commands'] === [
                ['name' => 'insertTable', 'arguments' => [['rows' => 2, 'cols' => 6, 'withHeaderRow' => true]]],
            ]);
});

it('requires a sensible size', function (): void {
    Livewire::test(InsertTableTestForm::class)
        ->callAction(insertTableAction(), data: ['rows' => 0, 'columns' => 99, 'withHeaderRow' => true], arguments: ['editorSelection' => ['type' => 'text', 'anchor' => 1, 'head' => 1]])
        ->assertHasActionErrors(['rows' => 'min', 'columns' => 'max'])
        ->assertNotDispatched('run-rich-editor-plus-commands');
});

<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Livewire\Component;
use Livewire\Livewire;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');
});

class LiveSyncTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public string $mode = 'none';

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function mount(string $mode = 'none'): void
    {
        $this->mode = $mode;
    }

    public function form(Schema $schema): Schema
    {
        $field = RichEditorPlus::make('content');

        match ($this->mode) {
            'live' => $field->live(),
            'debounce' => $field->live(debounce: 500),
            'blur' => $field->live(onBlur: true),
            default => null,
        };

        return $schema->components([$field])->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

it('leaves the state deferred when the field is not live', function (): void {
    Livewire::test(LiveSyncTestForm::class)
        ->assertSeeHtml("\$entangle('data.content', false)")
        ->assertSeeHtml('isLiveDebounced: false')
        ->assertSeeHtml('isLiveOnBlur: false');
});

it('makes the binding live when the field is simply live', function (): void {
    Livewire::test(LiveSyncTestForm::class, ['mode' => 'live'])
        ->assertSeeHtml("\$entangle('data.content', true)");
});

it('commits from the browser after the debounce when the field is debounced', function (): void {
    Livewire::test(LiveSyncTestForm::class, ['mode' => 'debounce'])
        ->assertSeeHtml("\$entangle('data.content', false)")
        ->assertSeeHtml('isLiveDebounced: true')
        ->assertSeeHtml('liveDebounce: 500')
        ->assertSeeHtml('isLiveOnBlur: false');
});

it('commits from the browser on blur when the field is live on blur', function (): void {
    Livewire::test(LiveSyncTestForm::class, ['mode' => 'blur'])
        ->assertSeeHtml("\$entangle('data.content', false)")
        ->assertSeeHtml('isLiveOnBlur: true')
        ->assertSeeHtml('isLiveDebounced: false');
});

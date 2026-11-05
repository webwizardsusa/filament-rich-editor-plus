<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Livewire\Component;
use Livewire\Livewire;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ChecksFieldPlugins;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();
    RegistryBuildCountingPlugin::$builds = 0;

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'webwizardsusa/rich-editor-plus');
});

/**
 * Counts registry builds: the field asks it to check the plugin list every time it builds one.
 */
class RegistryBuildCountingPlugin extends Plugin implements ChecksFieldPlugins
{
    public static int $builds = 0;

    public function checkFieldPlugins(array $plugins): void
    {
        self::$builds++;
    }

    public function getId(): string
    {
        return 'test/counting';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }
}

class RegistryRenderCacheTestForm extends Component implements HasActions, HasSchemas
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
            ->components([RichEditorPlus::make('content')->fixedToolbar()->addPlugins([RegistryBuildCountingPlugin::make()])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

it('builds the plugin registry once per render, and keeps none after it', function (): void {
    $field = Livewire::test(RegistryRenderCacheTestForm::class)->instance()->form->getComponents()[0];
    RegistryBuildCountingPlugin::$builds = 0;

    $field->toEmbeddedHtml();
    $afterRender = RegistryBuildCountingPlugin::$builds;
    $field->getPluginRegistry();

    expect($afterRender)->toBe(1)
        ->and(RegistryBuildCountingPlugin::$builds)->toBe(2);
});

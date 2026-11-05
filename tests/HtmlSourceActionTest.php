<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Actions\Testing\TestAction;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Livewire\Component;
use Livewire\Livewire;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\HtmlSourcePlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\StateFormat;
use Webwizardsusa\RichEditorPlus\Support\ToolScope;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    // Rendering the field needs its Alpine component asset, which only exists once the package has been built.
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'webwizardsusa/rich-editor-plus');
});

class HtmlSourceActionTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public string $content = '';

    public string $format = 'html';

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function mount(string $content = '', string $format = 'html'): void
    {
        $this->format = $format;
        $this->form->fill(['content' => $content]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                RichEditorPlus::make('content')
                    ->storeAs(StateFormat::from($this->format))
                    ->addPlugins([HtmlSourcePlugin::make()]),
            ])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function htmlSourceAction(): TestAction
{
    return TestAction::make('htmlSource')->schemaComponent('content');
}

it('fills the modal with the field content as formatted HTML', function (string $format): void {
    Livewire::test(HtmlSourceActionTestForm::class, [
        'content' => '<h2>Title</h2><p>Hello <strong>world</strong></p><ul><li><p>One</p></li></ul>',
        'format' => $format,
    ])
        ->mountAction(htmlSourceAction())
        ->assertActionDataSet([
            'source' => "<h2>Title</h2>\n<p>Hello <strong>world</strong></p>\n<ul>\n  <li>\n    <p>One</p>\n  </li>\n</ul>",
        ]);
})->with(['html' => 'html', 'json' => 'json']);

it('fills the modal with nothing for an empty field', function (): void {
    Livewire::test(HtmlSourceActionTestForm::class)
        ->mountAction(htmlSourceAction())
        ->assertActionDataSet(['source' => '']);
});

it('replaces the editor content with the edited HTML', function (): void {
    Livewire::test(HtmlSourceActionTestForm::class, ['content' => '<p>Old</p>'])
        ->callAction(htmlSourceAction(), data: ['source' => '<p>New <strong>text</strong></p>'])
        ->assertHasNoActionErrors()
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params): bool {
            return $params['key'] === 'form.content'
                && $params['commands'] === [[
                    'name' => 'setContent',
                    'arguments' => [[
                        'type' => 'doc',
                        'content' => [[
                            'type' => 'paragraph',
                            'content' => [
                                ['type' => 'text', 'text' => 'New '],
                                ['type' => 'text', 'text' => 'text', 'marks' => [['type' => 'bold']]],
                            ],
                        ]],
                    ]],
                ]];
        });
});

it('drops markup the field plugins do not support', function (): void {
    Livewire::test(HtmlSourceActionTestForm::class)
        ->callAction(htmlSourceAction(), data: ['source' => '<p onclick="steal()">Safe</p><script>alert(1)</script><marquee>Gone</marquee>'])
        ->assertDispatched('run-rich-editor-plus-commands', function (string $event, array $params): bool {
            $json = json_encode($params['commands']);

            return $params['commands'][0]['arguments'][0]['content'][0] === ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Safe']]]
                && ! str_contains($json, 'alert')
                && ! str_contains($json, 'steal');
        });
});

it('empties the editor when nothing is left of the source', function (string $source): void {
    Livewire::test(HtmlSourceActionTestForm::class, ['content' => '<p>Old</p>'])
        ->callAction(htmlSourceAction(), data: ['source' => $source])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'] === [
            ['name' => 'clearContent', 'arguments' => []],
        ]);
})->with(['cleared' => '', 'only unsupported markup' => '<script>alert(1)</script>']);

it('reads a document typed into the source as text, not as a document', function (): void {
    $json = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"evil"}]}]}]}';

    Livewire::test(HtmlSourceActionTestForm::class)
        ->callAction(htmlSourceAction(), data: ['source' => $json])
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0]['content'] === [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $json]]],
        ]);
});

it('adds an HTML source tool to the more menu that opens the action', function (): void {
    $tool = HtmlSourcePlugin::make()->getTools()[0];

    expect($tool->getName())->toBe('htmlSource')
        ->and($tool->getAction())->toBe('htmlSource')
        ->and($tool->getScope())->toBe(ToolScope::Overflow);
});

it('only registers the action when the plugin is added', function (): void {
    $with = RichEditorPlus::make('content')->plugins([BoldPlugin::make(), HtmlSourcePlugin::make()])->getDefaultActions();
    $without = RichEditorPlus::make('content')->plugins([BoldPlugin::make()])->getDefaultActions();

    expect(collect($with)->map->getName()->all())->toBe(['htmlSource'])
        ->and($without)->toBe([]);
});

it('gives back the same document when the formatted source is applied unchanged', function (): void {
    $html = '<h2>Title</h2><blockquote><p>Quote</p></blockquote><ul><li><p>One <em>two</em></p></li></ul><pre><code>a  b</code></pre>';
    $component = Livewire::test(HtmlSourceActionTestForm::class, ['content' => $html, 'format' => 'json']);
    $original = json_decode($component->get('data.content'), true);

    $component->mountAction(htmlSourceAction());
    $source = $component->instance()->mountedActions[0]['data']['source'];

    $component->callMountedAction()
        ->assertDispatched('run-rich-editor-plus-commands', fn (string $event, array $params): bool => $params['commands'][0]['arguments'][0] === $original);
    expect($source)->toContain("\n  <li>");
});

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
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'webwizardsusa/rich-editor-plus');

    MentionFieldTestForm::$disabled = false;
    MentionFieldTestForm::$providers = fn (): array => [
        MentionProvider::make('@')->items(['1' => 'Ada', '2' => 'Grace']),
        MentionProvider::make('#')->items(['9' => 'Bug']),
    ];
});

class MentionFieldTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public static bool $disabled = false;

    public static ?Closure $providers = null;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            RichEditorPlus::make('content')
                ->addPlugins([MentionPlugin::make()->providers((self::$providers)())])
                ->disabled(self::$disabled),
        ])->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function callMentionMethod(string $method, array $arguments): mixed
{
    $component = Livewire::test(MentionFieldTestForm::class);
    $key = $component->instance()->form->getComponents()[0]->getKey();

    return $component->instance()->callSchemaComponentMethod($key, $method, $arguments);
}

it('searches the provider for that trigger', function (): void {
    expect(callMentionMethod('getMentionResultsForJs', ['query' => 'ad', 'trigger' => '@']))->toBe([
        ['id' => '1', 'label' => 'Ada', 'description' => null, 'avatar' => null],
    ]);
});

it('returns nothing for an unknown trigger, rather than falling back to another provider', function (): void {
    expect(callMentionMethod('getMentionResultsForJs', ['query' => 'a', 'trigger' => '!']))->toBe([]);
});

it('does not search on a disabled field', function (): void {
    MentionFieldTestForm::$disabled = true;

    expect(callMentionMethod('getMentionResultsForJs', ['query' => 'a', 'trigger' => '@']))->toBe([]);
});

it('still looks up labels on a disabled field', function (): void {
    MentionFieldTestForm::$disabled = true;

    expect(callMentionMethod('getMentionLabelsForJs', ['idsByTrigger' => ['@' => ['1']]]))->toBe(['@' => ['1' => 'Ada']]);
});

it('looks up labels per trigger, ignoring unknown triggers and ids', function (): void {
    expect(callMentionMethod('getMentionLabelsForJs', ['idsByTrigger' => ['@' => ['1', '99'], '#' => ['9'], '!' => ['1']]]))
        ->toBe(['@' => ['1' => 'Ada'], '#' => ['9' => 'Bug']]);
});

it('ignores malformed ids from a crafted request instead of throwing', function (mixed $ids, array $expected): void {
    expect(callMentionMethod('getMentionLabelsForJs', ['idsByTrigger' => ['@' => $ids]]))->toBe($expected);
})->with([
    'a string' => ['1', []],
    'null' => [null, []],
    'nested arrays' => [[['1'], '2'], ['@' => ['2' => 'Grace']]],
]);

it('caps a label lookup at 100 ids', function (): void {
    $received = [];

    MentionFieldTestForm::$providers = function () use (&$received): array {
        return [
            MentionProvider::make('@')->getLabelsUsing(function (array $ids) use (&$received): array {
                $received = $ids;

                return [];
            }),
        ];
    };

    callMentionMethod('getMentionLabelsForJs', ['idsByTrigger' => ['@' => array_map('strval', range(1, 150))]]);

    expect($received)->toHaveCount(100);
});

it('reports a provider that throws and returns nothing, so typing is never interrupted', function (): void {
    MentionFieldTestForm::$providers = fn (): array => [
        MentionProvider::make('@')
            ->getSearchResultsUsing(fn (): array => throw new RuntimeException('down'))
            ->getLabelsUsing(fn (): array => throw new RuntimeException('down')),
    ];

    expect(callMentionMethod('getMentionResultsForJs', ['query' => 'a', 'trigger' => '@']))->toBe([])
        ->and(callMentionMethod('getMentionLabelsForJs', ['idsByTrigger' => ['@' => ['1']]]))->toBe(['@' => []]);
});

it('gives providers the field', function (): void {
    $component = Livewire::test(MentionFieldTestForm::class);
    $richEditor = $component->instance()->form->getComponents()[0];

    expect($richEditor->getMentionProviders()['@']->getField())->toBe($richEditor);
});

it('renders the mention menu only when there are providers', function (): void {
    expect(RichEditorPlus::make('content')->getToolbarsHtml())->not->toContain('data-rep-mention-menu')
        ->and(RichEditorPlus::make('content')->addPlugins([MentionPlugin::make()->providers([MentionProvider::make('@')])])->getToolbarsHtml())
        ->toContain('data-rep-mention-menu')
        ->toContain('role="listbox"');
});

it('has no mention menu on a disabled field', function (): void {
    MentionFieldTestForm::$disabled = true;

    Livewire::test(MentionFieldTestForm::class)->assertDontSeeHtml('data-rep-mention-menu');
});

it('exposes only the two mention methods to the browser', function (): void {
    $component = Livewire::test(MentionFieldTestForm::class);
    $key = $component->instance()->form->getComponents()[0]->getKey();

    expect($component->instance()->callSchemaComponentMethod($key, 'getMentionProviders', []))->toBeNull();
});

it('renders no find panel on a disabled field', function (): void {
    MentionFieldTestForm::$disabled = true;

    expect(Livewire::test(MentionFieldTestForm::class)->html())->not->toContain('data-rep-find');
});

it('renders the find panel on an enabled field', function (): void {
    MentionFieldTestForm::$disabled = false;

    expect(Livewire::test(MentionFieldTestForm::class)->html())->toContain('data-rep-find');
});

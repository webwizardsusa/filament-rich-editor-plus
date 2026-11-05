<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Plugins\Core\BackgroundColorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\TextColorPlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Livewire\Component;
use Livewire\Livewire;

uses(TestCase::class);

beforeEach(function (): void {
    // Package tests must not depend on plugins the host app registers globally.
    PluginRegistry::flush();

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../resources/js/index.js'),
    ], 'hollyit/rich-editor-plus');
});

class ToolbarModesTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    public string $mode = 'floating';

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function mount(string $mode = 'floating'): void
    {
        $this->mode = $mode;
    }

    public function form(Schema $schema): Schema
    {
        $field = RichEditorPlus::make('content');

        match ($this->mode) {
            'fixed' => $field->fixedToolbar()->floatingToolbar(false),
            'both' => $field->fixedToolbar(),
            'none' => $field->floatingToolbar(false),
            'disabled' => $field->fixedToolbar()->disabled(),
            'static' => $field->fixedToolbar()->stickyFixedToolbar(false),
            'other' => $field->fixedToolbar()->stickyFixedToolbar(false)->toolbarTools(['italic']),
            'split' => $field->fixedToolbar()->toolbarTools(['bold'])->fixedToolbarTools([['blockSwitcher'], ['italic']]),
            'bubble' => $field->toolbarTools([['bold', 'italic', 'link']], onlyListed: true),
            'bubble-fixed' => $field->toolbarTools([['bold', 'italic', 'link']], onlyListed: true)->fixedToolbar(),
            'bubble-default-fixed' => $field->toolbarTools([['bold', 'italic', 'link']], onlyListed: true)->fixedToolbar()->fixedToolbarTools(inherit: false),
            'bubble-unflagged' => $field->toolbarTools([['bold', 'italic', 'link']]),
            'empty-floating' => $field->toolbarTools([], onlyListed: true),
            'colours' => $field->addPlugins([TextColorPlugin::make(), BackgroundColorPlugin::make()]),
            'colours-disabled' => $field->addPlugins([TextColorPlugin::make(), BackgroundColorPlugin::make()])->disabled(),
            default => null,
        };

        return $schema->components([$field])->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function toolbarModesHtml(string $mode): string
{
    return Livewire::test(ToolbarModesTestForm::class, ['mode' => $mode])->html();
}

it('has a floating toolbar and no fixed toolbar by default', function (): void {
    $field = RichEditorPlus::make('content');

    expect($field->hasFloatingToolbar())->toBeTrue()
        ->and($field->hasFixedToolbar())->toBeFalse()
        ->and($field->isFixedToolbarSticky())->toBeTrue();

    expect(toolbarModesHtml('floating'))
        ->toContain('data-rep-block-toolbar="*"')
        ->not->toContain('data-rep-fixed-toolbar');
});

it('renders the fixed toolbar above the editor when floating is off', function (): void {
    $html = toolbarModesHtml('fixed');

    expect($html)
        ->toContain('data-rep-fixed-toolbar')
        ->not->toContain('data-rep-block-toolbar')
        ->toContain('data-rep-slash-menu')
        ->and(strpos($html, 'data-rep-fixed-toolbar'))->toBeLessThan(strpos($html, 'x-ref="editor"'));
});

it('renders both toolbars', function (): void {
    expect(toolbarModesHtml('both'))
        ->toContain('data-rep-fixed-toolbar')
        ->toContain('data-rep-block-toolbar="*"');
});

it('renders no toolbar but keeps the menus when both are off', function (): void {
    expect(toolbarModesHtml('none'))
        ->not->toContain('data-rep-fixed-toolbar')
        ->not->toContain('data-rep-block-toolbar')
        ->toContain('data-rep-slash-menu')
        ->toContain('data-rep-more-menu')
        ->toContain('data-rep-live');
});

it('renders a disabled fixed toolbar on a disabled field, with no floating toolbars or menus', function (): void {
    $html = toolbarModesHtml('disabled');
    $toolbar = str($html)->betweenFirst('data-rep-fixed-toolbar', '</div>');

    expect($toolbar->substrCount('<button '))->toBeGreaterThan(0)
        ->and($toolbar->substrCount('<button disabled '))->toBe($toolbar->substrCount('<button '))
        ->and($html)->not->toContain('data-rep-block-toolbar')
        ->not->toContain('data-rep-slash-menu');
});

it('hides the fixed toolbar when the editor cannot load', function (): void {
    expect(toolbarModesHtml('fixed'))->toMatch('/<div[^>]*data-rep-fixed-toolbar x-show="! error"/');
});

it('can turn off the sticky fixed toolbar', function (): void {
    expect(toolbarModesHtml('fixed'))->toContain('rep-fixed-toolbar-sticky')
        ->and(toolbarModesHtml('static'))->not->toContain('rep-fixed-toolbar-sticky');
});

it('arranges each toolbar on its own', function (): void {
    $html = toolbarModesHtml('split');

    $fixed = str($html)->betweenFirst('data-rep-fixed-toolbar', '</div>');
    $floating = str($html)->betweenFirst('data-rep-block-toolbar="*"', '</div>');

    expect($fixed->matchAll('/data-rep-tool="([^"]+)"/')->all())->toBe(['italic'])
        ->and($fixed->contains('data-rep-control="switcher"'))->toBeTrue()
        ->and($fixed->test('/data-rep-control="more"(?![^>]*data-rep-overflow-only)/'))->toBeFalse()
        ->and($floating->matchAll('/data-rep-tool="([^"]+)"/')->all())->toBe(['bold']);
});

it('uses the floating arrangement for the fixed toolbar unless it has its own', function (): void {
    expect(RichEditorPlus::make('body')->toolbarTools(['bold'])->getFixedToolbarTools())->toBe([['bold']])
        ->and(RichEditorPlus::make('body')->toolbarTools(['bold'])->fixedToolbarTools(['italic', 'more'])->getFixedToolbarTools())->toBe([['italic', 'more']])
        ->and(RichEditorPlus::make('body')->getFixedToolbarTools())->toBeNull();
});

it('gives the fixed toolbar its own default layout when told not to inherit', function (): void {
    $field = RichEditorPlus::make('body')->toolbarTools([['bold', 'link']], onlyListed: true)->fixedToolbarTools(inherit: false);

    expect($field->inheritsToolbarTools())->toBeFalse()
        ->and($field->getFixedToolbarTools())->toBeNull()
        ->and($field->isFixedToolbarOnlyListed())->toBeFalse()
        ->and(RichEditorPlus::make('body')->inheritsToolbarTools())->toBeTrue();
});

it('uses the fixed toolbar own tools whether or not it inherits', function (): void {
    $field = RichEditorPlus::make('body')->toolbarTools(['bold'], onlyListed: true)->fixedToolbarTools(['italic'], inherit: false);

    expect($field->getFixedToolbarTools())->toBe([['italic']]);
});

it('keys the editor on its toolbar modes so a changed toolbar refreshes', function (): void {
    $key = fn (string $mode): string => preg_match('/wire:key="[^"]*\.([0-9a-f]{32})"/', toolbarModesHtml($mode), $matches) === 1 ? $matches[1] : '';

    expect($key('floating'))->not->toBe('')
        ->and($key('floating'))->not->toBe($key('fixed'))
        ->and($key('static'))->not->toBe($key('fixed'))
        ->and($key('split'))->not->toBe($key('both'))
        ->and($key('other'))->not->toBe($key('static'))
        ->and($key('bubble'))->not->toBe($key('bubble-unflagged'))
        ->and($key('bubble-fixed'))->not->toBe($key('bubble-default-fixed'));
});

it('can make a formatting-only list the whole floating toolbar', function (): void {
    $floating = str(toolbarModesHtml('bubble'))->betweenFirst('data-rep-block-toolbar="*"', '</div>');

    expect($floating->matchAll('/data-rep-tool="([^"]+)"/')->all())->toBe(['bold', 'italic', 'link'])
        ->and($floating->contains('data-rep-drag-handle'))->toBeFalse()
        ->and($floating->contains('data-rep-control="switcher"'))->toBeFalse()
        ->and($floating->test('/data-rep-control="more"(?![^>]*data-rep-overflow-only)/'))->toBeFalse();
});

it('renders no toolbar for a flagged list that shows nothing, but keeps the slash menu', function (): void {
    expect(toolbarModesHtml('empty-floating'))
        ->not->toContain('data-rep-block-toolbar')
        ->toContain('data-rep-slash-menu');
});

it('lets the fixed toolbar inherit the floating flag only when it has no list of its own', function (): void {
    expect(RichEditorPlus::make('body')->toolbarTools(['bold'], onlyListed: true)->isFixedToolbarOnlyListed())->toBeTrue()
        ->and(RichEditorPlus::make('body')->toolbarTools(['bold'], onlyListed: true)->fixedToolbarTools(['italic'])->isFixedToolbarOnlyListed())->toBeFalse()
        ->and(RichEditorPlus::make('body')->toolbarTools(['bold'])->isToolbarOnlyListed())->toBeFalse();
});

it('renders a full fixed toolbar next to a formatting bubble when the fixed toolbar does not inherit', function (): void {
    $html = toolbarModesHtml('bubble-default-fixed');
    $fixed = str($html)->betweenFirst('data-rep-fixed-toolbar', '</div>');
    $floating = str($html)->betweenFirst('data-rep-block-toolbar="*"', '</div>');

    expect($fixed->contains('data-rep-control="switcher"'))->toBeTrue()
        ->and($fixed->contains('data-rep-control="more"'))->toBeTrue()
        ->and($fixed->matchAll('/data-rep-tool="([^"]+)"/')->all())->toContain('bold', 'italic', 'underline', 'strikethrough', 'link')
        ->and($floating->matchAll('/data-rep-tool="([^"]+)"/')->all())->toBe(['bold', 'italic', 'link'])
        ->and($floating->test('/data-rep-control="(?!more"[^>]*data-rep-overflow-only)/'))->toBeFalse();
});

it('copies the formatting bubble into the fixed toolbar when it inherits', function (): void {
    $fixed = str(toolbarModesHtml('bubble-fixed'))->betweenFirst('data-rep-fixed-toolbar', '</div>');

    expect($fixed->matchAll('/data-rep-tool="([^"]+)"/')->all())->toBe(['bold', 'italic', 'link'])
        ->and($fixed->test('/data-rep-control="(?!more"[^>]*data-rep-overflow-only)/'))->toBeFalse();
});

it('prints the colour styles once, also when disabled, and not without the colour plugins', function (): void {
    $tag = '<style data-rep-editor-styles>';

    expect(substr_count(toolbarModesHtml('colours'), $tag))->toBe(1)
        ->and(substr_count(toolbarModesHtml('colours-disabled'), $tag))->toBe(1)
        ->and(toolbarModesHtml('colours'))->toContain('.has-red-color{color:#dc2626}')
        ->and(toolbarModesHtml('floating'))->not->toContain('data-rep-editor-styles');
});

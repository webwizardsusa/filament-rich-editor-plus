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
use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;
use Webwizardsusa\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\MarkdownFormat;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\MarkdownPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Table\TablePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    PluginRegistry::flush();

    FilamentAsset::register([
        AlpineComponent::make('rich-editor-plus', __DIR__.'/../../../resources/js/index.js'),
    ], 'webwizardsusa/rich-editor-plus');
});

class MarkdownFieldTestForm extends Component implements HasActions, HasSchemas
{
    use InteractsWithActions;
    use InteractsWithSchemas;

    /**
     * @var array<string, mixed> | null
     */
    public ?array $data = [];

    public function mount(?string $content = null): void
    {
        $this->form->fill(['content' => $content]);
    }

    public function save(): void
    {
        $this->form->getState();
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([RichEditorPlus::make('content')->addPlugins([MarkdownPlugin::make()->store()])])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

it('works with the default plugins', function (): void {
    $field = RichEditorPlus::make('content')->storeAs(MarkdownFormat::make());
    $tools = array_keys($field->getPluginRegistry()->getToolsConfig());

    expect($tools)->not->toContain('underline')
        ->and($tools)->toContain('bold');
});

it('throws for unsupported plugins added on purpose', function (): void {
    RichEditorPlus::make('content')->storeAs(MarkdownFormat::make())->addPlugins([UnderlinePlugin::make(), TablePlugin::make()])->getPluginRegistry();
})->throws(UnsupportedContentFormatException::class, "Markdown storage can't keep: UnderlinePlugin (no Markdown syntax for underline), TablePlugin (column widths: call ->resizable(false)).");

it('hides table tools Markdown cannot keep', function (): void {
    $tools = array_keys(
        RichEditorPlus::make('content')->storeAs(MarkdownFormat::make())->addPlugins([TablePlugin::make()->resizable(false)])->getPluginRegistry()->getToolsConfig(),
    );

    expect($tools)->toContain('addRowAfter')
        ->and($tools)->not->toContain('mergeOrSplit', 'toggleHeaderRow');
});

it('stores Markdown through a Livewire form', function (): void {
    $component = Livewire::test(MarkdownFieldTestForm::class, ['content' => "# Title\n\nHello **world**\n"]);

    expect($component->get('data.content'))->toBeString()->toContain('"heading"')
        ->and($component->instance()->form->getState()['content'])->toBe("## Title\n\nHello **world**\n");
});

it('loads and saves raw HTML blocks', function (string $markdown, string $saved): void {
    $component = Livewire::test(MarkdownFieldTestForm::class, ['content' => $markdown]);

    expect($component->instance()->form->getState()['content'])->toBe($saved);
})->with([
    'div' => ["<div>hi</div>\n", "hi\n"],
    'details' => ["<details><summary>More</summary>\n\nbody\n\n</details>\n", "More\n\nbody\n"],
    'centered heading' => ["<div align=\"center\">\n\n# Title\n\n</div>\n", "## Title\n"],
    'badge on a field without images' => ["[![badge](https://e.com/b.svg)](https://ci.com) passing\n", "passing\n"],
]);

it('reports content Markdown cannot write as a validation error instead of failing', function (): void {
    $underlined = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"u","marks":[{"type":"underline"}]}]}]}';

    Livewire::test(MarkdownFieldTestForm::class, ['content' => "x\n"])
        ->set('data.content', $underlined)
        ->call('save')
        ->assertHasErrors(['data.content']);
});

it('renders stored Markdown', function (): void {
    expect(RichContentPlusRenderer::make("Hello **world**\n")->format(MarkdownFormat::make())->toHtml())
        ->toBe('<p>Hello <strong>world</strong></p>');
});

it('exports any content to Markdown, dropping what it cannot write', function (): void {
    expect(RichContentPlusRenderer::make('<p><u>under</u> and <strong>bold</strong></p>')->toMarkdown())
        ->toBe("under and **bold**\n");
});

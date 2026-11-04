<?php

use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Hollyit\RichEditorPlus\Content\Contracts\ContentFormat;
use Hollyit\RichEditorPlus\Content\UnsupportedContentFormatException;
use Hollyit\RichEditorPlus\Plugins\Contracts\ChecksFieldPlugins;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Plugins\Contracts\ProvidesContentFormat;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\StateCasts\RichEditorPlusStateCast;
use Hollyit\RichEditorPlus\Support\JsExtension;
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

/**
 * One paragraph per line. Can't keep underline; hides the italic tool.
 */
class ContentFormatTestLines implements ContentFormat
{
    public function __construct(protected string $id = 'lines') {}

    public function getId(): string
    {
        return $this->id;
    }

    public function toDocument(string $content, PluginRegistry $registry): array
    {
        $lines = array_values(array_filter(explode("\n", $content), static fn (string $line): bool => $line !== ''));

        return ['type' => 'doc', 'content' => array_map(
            static fn (string $line): array => ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $line]]],
            $lines,
        )];
    }

    public function fromDocument(array $document, PluginRegistry $registry): string
    {
        foreach ($document['content'] ?? [] as $block) {
            if (($block['type'] ?? null) !== 'paragraph') {
                throw new UnsupportedContentFormatException("Lines can't write [{$block['type']}] nodes.");
            }
        }

        return implode("\n", array_map(
            static fn (array $block): string => implode('', array_column($block['content'] ?? [], 'text')),
            $document['content'] ?? [],
        ));
    }

    public function assertSupports(array $plugins): void
    {
        $reasons = [];

        foreach ($this->unsupportedPlugins($plugins) as $plugin) {
            $reasons[class_basename($plugin)] = 'no underline';
        }

        if ($reasons !== []) {
            throw UnsupportedContentFormatException::forPlugins('Lines', $reasons);
        }
    }

    public function unsupportedPlugins(array $plugins): array
    {
        return array_values(array_filter($plugins, static fn (EditorPlugin $plugin): bool => $plugin instanceof UnderlinePlugin));
    }

    public function getHiddenTools(): array
    {
        return ['italic'];
    }
}

class ContentFormatTestPlugin extends Plugin implements ChecksFieldPlugins, ProvidesContentFormat
{
    public static int $checks = 0;

    public ?ContentFormat $format = null;

    public function getId(): string
    {
        return 'test/format';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make('test/format');
    }

    public function getContentFormat(): ?ContentFormat
    {
        return $this->format;
    }

    public function checkFieldPlugins(array $plugins): void
    {
        static::$checks++;
    }
}

class ContentFormatTestForm extends Component implements HasActions, HasSchemas
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
            ->components([RichEditorPlus::make('content')->storeAs(new ContentFormatTestLines)])
            ->statePath('data');
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}

function formatField(): RichEditorPlus
{
    return RichEditorPlus::make('content')->storeAs(new ContentFormatTestLines);
}

it('stores JSON in the browser when a content format is set', function (): void {
    $field = formatField();

    expect($field->getContentFormat())->toBeInstanceOf(ContentFormatTestLines::class)
        ->and($field->getStateFormat())->toBe(StateFormat::Json)
        ->and(RichEditorPlus::make('content')->getContentFormat())->toBeNull()
        ->and(RichEditorPlus::make('content')->storeAs(StateFormat::Html)->getStateFormat())->toBe(StateFormat::Html);
});

it('drops default plugins the format cannot keep, quietly', function (): void {
    $ids = array_map(static fn (EditorPlugin $plugin): string => $plugin->getId(), formatField()->getPlugins());

    expect($ids)->not->toContain(UnderlinePlugin::make()->getId())
        ->and($ids)->toContain(ItalicPlugin::make()->getId())
        ->and(formatField()->getPluginRegistry())->toBeInstanceOf(PluginRegistry::class);
});

it('keeps default plugins on fields without a format', function (): void {
    $ids = array_map(static fn (EditorPlugin $plugin): string => $plugin->getId(), RichEditorPlus::make('content')->getPlugins());

    expect($ids)->toContain(UnderlinePlugin::make()->getId());
});

it('throws at boot for unsupported plugins added explicitly', function (): void {
    formatField()->plugins([UnderlinePlugin::make()])->getPluginRegistry();
})->throws(UnsupportedContentFormatException::class, "Lines storage can't keep: UnderlinePlugin (no underline).");

it('hides the tools the format names', function (): void {
    $field = formatField();
    $tools = array_keys($field->getPluginRegistry()->getToolsConfig());

    expect($tools)->not->toContain('italic')
        ->and($tools)->toContain('bold')
        ->and($field->getToolbarsHtml())->not->toContain('data-rep-tool="italic"');
});

it('takes the format from an explicitly added plugin', function (): void {
    $plugin = ContentFormatTestPlugin::make();
    $plugin->format = new ContentFormatTestLines;

    $field = RichEditorPlus::make('content')->addPlugins([$plugin]);

    expect($field->getContentFormat())->toBe($plugin->format)
        ->and($field->getStateFormat())->toBe(StateFormat::Json);
});

it('refuses two different formats', function (): void {
    $plugin = ContentFormatTestPlugin::make();
    $plugin->format = new ContentFormatTestLines('other');

    formatField()->addPlugins([$plugin])->getContentFormat();
})->throws(InvalidArgumentException::class);

it('lets plugins check the final plugin set', function (): void {
    ContentFormatTestPlugin::$checks = 0;

    RichEditorPlus::make('content')->addPlugins([ContentFormatTestPlugin::make()])->getPluginRegistry();

    expect(ContentFormatTestPlugin::$checks)->toBe(1);
});

it('casts between the stored format and the JSON state', function (): void {
    $cast = new RichEditorPlusStateCast(formatField());
    $state = $cast->set("one\ntwo");

    expect(json_decode($state, true)['content'])->toHaveCount(2)
        ->and($cast->get($state))->toBe("one\ntwo")
        ->and($cast->get(null))->toBeNull()
        ->and($cast->set(''))->toBeNull()
        ->and($cast->set(['type' => 'doc', 'content' => []]))->toBe('{"type":"doc","content":[]}');
});

it('round-trips through a Livewire form', function (): void {
    $component = Livewire::test(ContentFormatTestForm::class, ['content' => "a\nb"]);

    expect($component->get('data.content'))->toBeString()->toContain('"paragraph"')
        ->and($component->instance()->form->getState()['content'])->toBe("a\nb");
});

it('refuses to save content the format cannot write as a validation error', function (): void {
    Livewire::test(ContentFormatTestForm::class, ['content' => 'a'])
        ->set('data.content', '{"type":"doc","content":[{"type":"heading","content":[{"type":"text","text":"h"}]}]}')
        ->call('save')
        ->assertHasErrors(['data.content'])
        ->assertSee(__('rich-editor-plus::errors.content_unsupported'), escape: true);
});

it('throws instead of loading an empty field when the document cannot be encoded', function (): void {
    $document = ['type' => 'paragraph'];

    for ($level = 0; $level < 300; $level++) {
        $document = ['type' => 'blockquote', 'content' => [$document]];
    }

    (new RichEditorPlusStateCast(formatField()))->set(['type' => 'doc', 'content' => [$document]]);
})->throws(UnexpectedValueException::class, "The content of the field [content] can't be loaded into the editor: Maximum stack depth exceeded.");

it('reads strings with a format when rendering', function (): void {
    expect(RichContentPlusRenderer::make("one\ntwo")->format(new ContentFormatTestLines)->toHtml())->toBe('<p>one</p><p>two</p>')
        ->and(RichContentPlusRenderer::make("one\ntwo")->format(new ContentFormatTestLines)->toArray()['content'])->toHaveCount(2);
});

it('renders many strings with a format', function (): void {
    expect(RichContentPlusRenderer::many(['a', "b\nc"])->format(new ContentFormatTestLines)->toHtml())
        ->toBe(['<p>a</p>', '<p>b</p><p>c</p>']);
});

it('writes any content in a format', function (): void {
    expect(RichContentPlusRenderer::make('<p>one</p><p>two</p>')->toFormat(new ContentFormatTestLines))->toBe("one\ntwo");
});

it('takes macros', function (): void {
    RichContentPlusRenderer::macro('shout', function (): string {
        /** @var RichContentPlusRenderer $this */
        return strtoupper($this->toText());
    });

    expect(RichContentPlusRenderer::make('<p>hi</p>')->shout())->toBe('HI');

    RichContentPlusRenderer::flushMacros();
});

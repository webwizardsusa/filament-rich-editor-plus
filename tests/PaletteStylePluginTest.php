<?php

use Webwizardsusa\RichEditorPlus\Plugins\Core\PaletteStylePlugin;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Support\ToolMenuItem;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

class PaletteStyleTestPlugin extends PaletteStylePlugin
{
    public function getId(): string
    {
        return 'test/spacing';
    }

    public function spacings(array $spacings): static
    {
        return $this->setPalette($spacings);
    }

    protected function attributeName(): string
    {
        return 'letterSpacing';
    }

    protected function commandName(): string
    {
        return 'LetterSpacing';
    }

    protected function toolName(): string
    {
        return 'letterSpacing';
    }

    protected function toolLabelKey(): string
    {
        return 'font_size';
    }

    protected function toolIcon(): string
    {
        return 'mdi-format-letter-spacing';
    }

    protected function toolOrder(): int
    {
        return 99;
    }

    protected function toolGroup(): string
    {
        return 'type';
    }

    protected function cssProperty(): string
    {
        return 'letter-spacing';
    }

    protected function valueKey(): string
    {
        return 'spacing';
    }

    protected function swatchText(): ?string
    {
        return null;
    }

    protected function defaultClass(string $name): string
    {
        return "has-{$name}-letter-spacing";
    }

    protected function defaultPalette(): array
    {
        return ['wide' => '0.1em'];
    }

    protected function paletteLabelPrefix(): string
    {
        return 'sizes';
    }

    protected function assertValue(string $plugin, string $name, string $value): void
    {
        if (! str_ends_with($value, 'em')) {
            throw new InvalidArgumentException("{$plugin} wants em for [{$name}].");
        }
    }
}

it('builds a palette plugin from its hooks', function (): void {
    $plugin = PaletteStyleTestPlugin::make()->spacings(['wide' => ['label' => 'Wide', 'spacing' => '0.1em']]);
    $items = array_map(fn (ToolMenuItem $item): array => $item->toArray(), $plugin->getTools()[0]->getMenu());

    expect($plugin->getJsExtension()->toArray())->toBe(['id' => 'test/spacing', 'options' => ['values' => ['wide']]])
        ->and($plugin->getStylesheet())->toBe('.has-wide-letter-spacing{letter-spacing:0.1em}')
        ->and($plugin->getTools()[0]->toArray())->toMatchArray(['name' => 'letterSpacing', 'scope' => 'inline', 'group' => 'type', 'order' => 99])
        ->and(array_column($items, 'name'))->toBe(['default', 'wide'])
        ->and($items[0])->toMatchArray(['label' => 'Default', 'command' => 'unsetLetterSpacing', 'fallback' => true, 'swatch' => null])
        ->and($items[1])->toMatchArray(['label' => 'Wide', 'command' => 'setLetterSpacing', 'arguments' => ['wide'], 'swatch' => null]);
});

it('runs the shared and the plugin its own value checks', function (string $value, string $message): void {
    expect(fn () => PaletteStyleTestPlugin::make()->spacings(['wide' => ['label' => 'Wide', 'spacing' => $value]])->getStylesheet())
        ->toThrow(InvalidArgumentException::class, $message);
})->with([
    'semicolon' => ['0.1em;', 'PaletteStyleTestPlugin'],
    'comment' => ['0.1em /*', 'PaletteStyleTestPlugin'],
    'own rule' => ['2px', 'wants em'],
]);

it('lets quotes through the shared checks for plugins that allow them', function (): void {
    expect(PaletteStyleTestPlugin::make()->spacings(['wide' => ['label' => 'Wide', 'spacing' => '"x" 1em']])->getStylesheet())
        ->toBe('.has-wide-letter-spacing{letter-spacing:"x" 1em}');
});

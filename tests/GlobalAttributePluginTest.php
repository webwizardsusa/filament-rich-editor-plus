<?php

use Webwizardsusa\RichEditorPlus\Content\GlobalAttribute;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

class GlobalAttributeTestPlugin extends Plugin implements ProvidesGlobalAttributes
{
    /**
     * @var array<GlobalAttribute>
     */
    public array $attributes = [];

    public function getId(): string
    {
        return 'test/global-attributes';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getGlobalAttributes(): array
    {
        return $this->attributes;
    }
}

/**
 * @param  array<GlobalAttribute>  $attributes
 */
function globalAttributePlugin(array $attributes): GlobalAttributeTestPlugin
{
    $plugin = GlobalAttributeTestPlugin::make();
    $plugin->attributes = $attributes;

    return $plugin;
}

function alignment(): GlobalAttribute
{
    return GlobalAttribute::style('textAlign', 'text-align')->types(['paragraph', 'heading', 'missing'])->values(['left', 'center', 'right']);
}

it('parses and renders the attributes a plugin provides', function (): void {
    $renderer = fn (mixed $content) => RichContentPlusRenderer::make($content)->parseHtml()->plugins([globalAttributePlugin([alignment()])]);

    expect($renderer('<p style="text-align: center">a</p>')->toArray()['content'][0])
        ->toBe(['type' => 'paragraph', 'attrs' => ['textAlign' => 'center'], 'content' => [['type' => 'text', 'text' => 'a']]])
        ->and($renderer('<p style="text-align: center">a</p><p style="text-align: bogus">b</p>')->toHtml())->toBe('<p style="text-align: center">a</p><p>b</p>');
});

it('takes attributes added to an existing plugin', function (): void {
    PluginRegistry::extendPlugin('core/heading', fn (PluginExtension $extension): PluginExtension => $extension->addGlobalAttributes([
        GlobalAttribute::html('anchor', 'id')->types(['heading'])->pattern('[a-z]+'),
    ]));

    expect(RichContentPlusRenderer::make('<h2 id="intro">Intro</h2><h2 id="Not valid">x</h2>')->parseHtml()->plugins([HeadingPlugin::make()])->toHtml())
        ->toBe('<h2 id="intro">Intro</h2><h2>x</h2>');
});

it('sends each plugin its attributes to the browser straight after the plugin', function (): void {
    $registry = PluginRegistry::make([BoldPlugin::make(), globalAttributePlugin([alignment()]), ItalicPlugin::make()]);
    $descriptors = $registry->getJsExtensions();
    $ids = array_column($descriptors, 'id');
    $index = array_search('core/global-attributes', $ids, true);

    expect($ids[$index - 1])->toBe('test/global-attributes')
        ->and($descriptors[$index]['options'])->toBe([
            'name' => 'globalAttributes:test/global-attributes',
            'attributes' => [[
                'name' => 'textAlign',
                'kind' => 'style',
                'key' => 'text-align',
                'types' => ['paragraph'],
                'values' => ['left', 'center', 'right'],
                'pattern' => null,
                'keepOnSplit' => true,
                'classes' => null,
            ]],
        ]);
});

it('sends attributes added to an existing plugin after that plugin', function (): void {
    PluginRegistry::extendPlugin('core/heading', fn (PluginExtension $extension): PluginExtension => $extension->addGlobalAttributes([
        GlobalAttribute::html('anchor', 'id')->types('nodes')->pattern('[a-z]+'),
    ]));

    $descriptors = PluginRegistry::make([HeadingPlugin::make()])->getJsExtensions();
    $ids = array_column($descriptors, 'id');
    $index = array_search('core/global-attributes', $ids, true);

    expect($ids[$index - 1])->toBe('core/heading')
        ->and($descriptors[$index]['options']['name'])->toBe('globalAttributes:core/heading')
        ->and($descriptors[$index]['options']['attributes'][0]['types'])->toContain('heading', 'paragraph')
        ->and($descriptors[$index]['options']['attributes'][0]['types'])->not->toContain('doc', 'text');
});

it('generates no JS for attributes a TipTap extension provides, but still renders them', function (): void {
    $plugin = globalAttributePlugin([alignment()->providedByJsExtension()]);

    expect(array_column(PluginRegistry::make([$plugin])->getJsExtensions(), 'id'))->not->toContain('core/global-attributes')
        ->and(RichContentPlusRenderer::make('<p style="text-align: right">a</p><p style="text-align: bogus">b</p>')->parseHtml()->plugins([$plugin])->toHtml())
        ->toBe('<p style="text-align: right">a</p><p>b</p>');
});

it('generates no JS when no plugin declares global attributes', function (): void {
    expect(array_column(PluginRegistry::make([BoldPlugin::make(), globalAttributePlugin([])])->getJsExtensions(), 'id'))
        ->not->toContain('core/global-attributes');
});

it('collects global attributes in plugin order', function (): void {
    $registry = PluginRegistry::make([globalAttributePlugin([alignment()])]);

    expect(array_map(fn (GlobalAttribute $attribute): string => $attribute->getName(), $registry->getGlobalAttributes()))->toBe(['textAlign']);
});

it('rejects an invalid declaration', function (): void {
    $plugin = globalAttributePlugin([GlobalAttribute::style('textAlign', 'text-align')->types(['paragraph'])]);

    expect(fn () => RichContentPlusRenderer::make('<p>a</p>')->plugins([$plugin])->toHtml())->toThrow(InvalidArgumentException::class)
        ->and(fn () => PluginRegistry::make([$plugin])->getJsExtensions())->toThrow(InvalidArgumentException::class);
});

it('rejects a global attribute that collides with an attribute a node already has', function (): void {
    $plugin = globalAttributePlugin([GlobalAttribute::html('level', 'data-level')->types(['heading'])->pattern('[0-9]')]);

    expect(fn () => PluginRegistry::make([HeadingPlugin::make(), $plugin])->getJsExtensions())->toThrow(InvalidArgumentException::class, 'level')
        ->and(fn () => RichContentPlusRenderer::make('<h2>a</h2>')->plugins([HeadingPlugin::make(), $plugin])->toHtml())->toThrow(InvalidArgumentException::class, 'level');
});

it('rejects two global attributes with the same name on one type', function (): void {
    $plugin = globalAttributePlugin([alignment(), alignment()]);

    expect(fn () => PluginRegistry::make([$plugin])->getJsExtensions())->toThrow(InvalidArgumentException::class)
        ->and(fn () => RichContentPlusRenderer::make('<p>a</p>')->plugins([$plugin])->toHtml())->toThrow(InvalidArgumentException::class);
});

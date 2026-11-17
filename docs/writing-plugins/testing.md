---
title: Testing plugins
weight: 130
description: Test a plugin's schema, settings, JS options, editor requests and uploads with Pest and Orchestra Testbench.
---

Most of a plugin can be tested on the server, without a browser: what it parses and renders, what it sends to the
editor, and how it answers requests. The package's own tests and the
[example plugin](docs:rich-editor-plus-example/introduction)'s use Pest with Orchestra Testbench.

## The test case

Boot Filament, Livewire, the editor and your package:

```php
namespace Acme\Callout\Tests;

use BladeUI\Heroicons\BladeHeroiconsServiceProvider;
use BladeUI\Icons\BladeIconsServiceProvider;
use Filament\Actions\ActionsServiceProvider;
use Filament\FilamentServiceProvider;
use Filament\Forms\FormsServiceProvider;
use Filament\Infolists\InfolistsServiceProvider;
use Filament\Notifications\NotificationsServiceProvider;
use Filament\Schemas\SchemasServiceProvider;
use Filament\Support\SupportServiceProvider;
use Filament\Tables\TablesServiceProvider;
use Filament\Widgets\WidgetsServiceProvider;
use Livewire\LivewireServiceProvider;
use Orchestra\Testbench\TestCase as BaseTestCase;
use Postare\BladeMdi\BladeMdiServiceProvider;
use Webwizardsusa\RichEditorPlus\RichEditorPlusServiceProvider;
use Acme\Callout\CalloutServiceProvider;

abstract class TestCase extends BaseTestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            BladeIconsServiceProvider::class,
            BladeHeroiconsServiceProvider::class,
            BladeMdiServiceProvider::class,
            LivewireServiceProvider::class,
            SupportServiceProvider::class,
            ActionsServiceProvider::class,
            FormsServiceProvider::class,
            InfolistsServiceProvider::class,
            NotificationsServiceProvider::class,
            SchemasServiceProvider::class,
            TablesServiceProvider::class,
            WidgetsServiceProvider::class,
            FilamentServiceProvider::class,
            RichEditorPlusServiceProvider::class,
            CalloutServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
    }
}
```

Build your `dist/` before running the tests, or `moduleUrl()` throws because the assets are missing.

Default plugins, `extendPlugin()` callbacks and `configureUsing()` callbacks are static, so they leak between tests.
Reset them in tests that register any:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

beforeEach(function (): void {
    PluginRegistry::flush();         // registerDefaultPlugins() and extendPlugin()
    Plugin::flushConfigurations();   // configureUsing()
});
```

## Schema round trips

Render HTML through your plugin with `parseHtml()`, so it is parsed with your rules rather than printed as stored. HTML
your plugin writes should come back unchanged:

```php
use Acme\Callout\Plugins\CalloutPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

function renderCallout(string|array $content): string
{
    return RichContentPlusRenderer::make($content)
        ->plugins([CalloutPlugin::make(), BlockquotePlugin::make()])
        ->parseHtml()
        ->toHtml();
}

it('keeps a callout and the blocks inside it', function (): void {
    $html = '<div data-variant="warning" class="callout callout-warning" data-type="callout"><p>Mind the gap</p></div>';

    expect(renderCallout($html))->toBe($html);
});

it('does not treat other divs as callouts', function (): void {
    expect(renderCallout('<div class="callout">Plain</div>'))->toBe('Plain');
});
```

Also render **documents**, as a crafted JSON document would arrive, to prove the render side validates too:

```php
it('keeps a variant from the browser out of the class name', function (): void {
    $document = ['type' => 'doc', 'content' => [
        ['type' => 'callout', 'attrs' => ['variant' => 'x" onclick="evil()'], 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Note']]],
        ]],
    ]];

    expect(renderCallout($document))
        ->toBe('<div data-variant="info" class="callout callout-info" data-type="callout"><p>Note</p></div>');
});
```

## What the editor gets

The editor is configured from your plugin's `JsExtension`, tools and block types. Assert them directly:

```php
it('passes its settings to the editor', function (): void {
    $plugin = KeyboardPlugin::make()->shortcut('Mod-Alt-k');

    expect($plugin->getJsExtension()->toArray())->toBe([
        'id' => 'acme/keyboard',
        'options' => ['shortcut' => 'Mod-Alt-k'],
        'modules' => [KeyboardServiceProvider::moduleUrl()],
    ])
        ->and($plugin->getTools()[0]->getShortcut())->toBe('Mod-Alt-k');
});
```

Build a registry to check how your plugin fits with others, including the checks the field makes:

```php
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

it('needs the table plugin', function (): void {
    PluginRegistry::make([CaptionPlugin::make()]);
})->throws(LogicException::class, 'requires [webwizardsusa/table]');

it('offers one block type per variant', function (): void {
    $config = PluginRegistry::make([CalloutPlugin::make()])->getBlockTypesConfig();

    expect(array_keys($config))->toContain('callout-info', 'callout-warning');
});
```

## Editor requests

`answerPluginRequestForJs()` is the method the editor calls. Calling it on a field tests the whole server path,
including the field's plugin lookup:

```php
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

it('answers a urls request', function (): void {
    $field = RichEditorPlus::make('body')->addPlugins([FilesPlugin::make()]);

    expect($field->answerPluginRequestForJs('acme/files', 'urls', ['paths' => ['a.png']]))
        ->toHaveKey('urls');
});
```

For uploads, mount a small Livewire component with a form holding the field, set a fake file under the field's
`componentFileAttachments` path, and send the key to your plugin:

```php
use Illuminate\Http\UploadedFile;
use Livewire\Livewire;

it('refuses a file that is not audio, whatever its name says', function (): void {
    $component = Livewire::test(UploadsTestForm::class) // a component whose form() has RichEditorPlus::make('content')
        ->set('componentFileAttachments.data.content.abc-123', UploadedFile::fake()->createWithContent('song.mp3', 'hello'));

    $field = $component->instance()->form->getComponents()[0];

    expect($field->answerPluginRequestForJs('acme/audio', 'store', ['key' => 'abc-123']))->toHaveKey('error')
        ->and($field->pullTemporaryUpload('abc-123'))->toBeNull(); // taken once, then gone
});
```

## The JavaScript

The browser half is ordinary TipTap code. Test its commands and HTML with [Vitest](https://vitest.dev) and a TipTap
`Editor` built from your extension, as the package's own `tests/js` suite does in its repository.

<?php

use Filament\Support\Components\Attributes\ExposedLivewireMethod;
use Hollyit\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Illuminate\Support\Facades\Exceptions;
use Livewire\Attributes\Renderless;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

class EchoRequestPlugin extends Plugin implements AnswersEditorRequests
{
    public function getId(): string
    {
        return 'test/echo';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
    {
        if ($request === 'explode') {
            throw new RuntimeException('boom');
        }

        return ['request' => $request, 'payload' => $payload, 'field' => $field->getName()];
    }
}

class SilentPlugin extends Plugin
{
    public function getId(): string
    {
        return 'test/silent';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }
}

it('passes a request to the plugin that answers it', function (): void {
    $field = RichEditorPlus::make('body')->addPlugins([EchoRequestPlugin::make()]);

    expect($field->answerPluginRequestForJs('test/echo', 'ping', ['a' => 1]))
        ->toBe(['request' => 'ping', 'payload' => ['a' => 1], 'field' => 'body']);
});

it('answers nothing for unknown plugins, plugins without the contract, and failures', function (string $plugin, string $request): void {
    $field = RichEditorPlus::make('body')->addPlugins([EchoRequestPlugin::make(), SilentPlugin::make()]);

    expect($field->answerPluginRequestForJs($plugin, $request))->toBe([]);
})->with([
    'unknown' => ['test/nope', 'ping'],
    'no contract' => ['test/silent', 'ping'],
    'exception' => ['test/echo', 'explode'],
]);

it('reports a plugin that throws', function (): void {
    Exceptions::fake();

    RichEditorPlus::make('body')->addPlugins([EchoRequestPlugin::make()])->answerPluginRequestForJs('test/echo', 'explode');

    Exceptions::assertReported(fn (RuntimeException $exception): bool => $exception->getMessage() === 'boom');
});

it('exposes the plugin request method to the editor without re-rendering the component', function (): void {
    $attributes = array_map(
        static fn (ReflectionAttribute $attribute): string => $attribute->getName(),
        (new ReflectionMethod(RichEditorPlus::class, 'answerPluginRequestForJs'))->getAttributes(),
    );

    expect($attributes)->toContain(ExposedLivewireMethod::class)->toContain(Renderless::class);
});

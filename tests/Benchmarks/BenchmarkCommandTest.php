<?php

use Hollyit\RichEditorPlus\Benchmarks\BenchmarkSchema;
use Hollyit\RichEditorPlus\Benchmarks\Runner\BenchmarkRun;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\StrategyFactory;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Illuminate\Support\Facades\File;

uses(TestCase::class);

/**
 * @return array<string, mixed>
 */
function tinyRun(array $options = []): array
{
    return [
        '--allow-sqlite' => true,
        '--setup' => true,
        '--documents' => 4,
        '--mentionables' => 5,
        '--iterations' => 2,
        '--warmup' => 0,
        '--store' => 'array',
        '--fixture' => ['small'],
        ...$options,
    ];
}

it('runs every strategy and scenario, and writes JSON results', function (): void {
    $path = storage_path('framework/testing/benchmark.json');
    File::delete($path);

    $this->artisan('rich-editor-plus:benchmark', tinyRun(['--json' => $path]))
        ->expectsOutputToContain('index:cold')
        ->expectsOutputToContain('storable-html:patch')
        ->assertSuccessful();

    $json = json_decode(File::get($path), true);

    expect($json['results'])->toHaveCount(count(StrategyFactory::NAMES) * count(BenchmarkRun::SCENARIOS))
        ->and($json['environment'])->toHaveKeys(['php', 'opcache', 'database', 'cache_store', 'git'])
        ->and($json['options']['documents'])->toEqual(4);

    File::delete($path);
});

it('still checks parity against json when json is not among the strategies, and shows no ratio', function (): void {
    $this->artisan('rich-editor-plus:benchmark', tinyRun(['--strategy' => ['rendered-html']]))
        ->expectsOutputToContain('rendered-html')
        ->doesntExpectOutputToContain('| json ')
        ->assertSuccessful();
});

it('refuses to run on SQLite without --allow-sqlite', function (): void {
    $this->artisan('rich-editor-plus:benchmark', ['--setup' => true])
        ->expectsOutputToContain('--allow-sqlite')
        ->assertFailed();
});

it('refuses to run without the bench tables unless --setup is passed', function (): void {
    $this->artisan('rich-editor-plus:benchmark', ['--allow-sqlite' => true])
        ->expectsOutputToContain('--setup')
        ->assertFailed();
});

it('refuses to run in production', function (): void {
    $this->app['env'] = 'production';

    $this->artisan('rich-editor-plus:benchmark', tinyRun())->assertFailed();

    expect(BenchmarkSchema::exists())->toBeFalse();
});

it('rejects unknown strategies, fixtures, inner strategies and cache stores', function (array $options, string $message): void {
    $this->artisan('rich-editor-plus:benchmark', tinyRun($options))
        ->expectsOutputToContain($message)
        ->assertFailed();
})->with([
    'strategy' => [['--strategy' => ['nope']], 'Unknown strategy [nope]'],
    'fixture' => [['--fixture' => ['huge']], 'Unknown fixture [huge]'],
    'inner' => [['--cached-inner' => 'rendered-html'], 'The cached strategy can only wrap'],
    'store' => [['--store' => 'not-a-store'], 'Cache store [not-a-store] is not defined'],
]);

it('drops the tables with --teardown', function (): void {
    BenchmarkSchema::create();

    $this->artisan('rich-editor-plus:benchmark', ['--teardown' => true])->assertSuccessful();

    expect(BenchmarkSchema::exists())->toBeFalse();
});

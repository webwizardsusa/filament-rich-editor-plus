<?php

use Illuminate\Support\Facades\Schema;
use Webwizardsusa\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Webwizardsusa\RichEditorPlus\Benchmarks\BenchmarkSchema;
use Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures\BenchmarkMentionProvider;
use Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures\MentionableSeeder;
use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

it('creates and drops the bench tables', function (): void {
    BenchmarkSchema::create();

    expect(BenchmarkSchema::exists())->toBeTrue();

    foreach (BenchmarkSchema::TABLES as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }

    BenchmarkSchema::drop();

    expect(BenchmarkSchema::exists())->toBeFalse();
});

it('seeds the same mentionables for the same seed, starting with names that need escaping', function (): void {
    BenchmarkSchema::create();
    $first = MentionableSeeder::seed(10, 1);

    BenchmarkSchema::truncate();
    $second = MentionableSeeder::seed(10, 1);

    expect($first)->toBe($second)
        ->toHaveCount(10)
        ->and(array_slice($first, 0, 3))->toBe(["Seán O'Brien", 'Zoë & Co', '<b>Bold</b> Bob']);
});

it('looks up labels and urls from the bench table', function (): void {
    BenchmarkSchema::create();
    $names = MentionableSeeder::seed(3, 1);
    $ids = array_map('strval', array_keys($names));

    $provider = BenchmarkMentionProvider::make();

    expect($provider->getTrigger())->toBe('@')
        ->and($provider->getLabels([...$ids, '999']))->toBe(array_combine($ids, array_values($names)))
        ->and($provider->getUrls([$ids[0] => 'x']))->toBe([$ids[0] => "/bench/mentionables/{$ids[0]}"]);
});

it('gives a stable render version that changes with the plugin set', function (): void {
    $plugins = BenchmarkPlugins::make();

    expect(BenchmarkPlugins::version($plugins))->toBe(BenchmarkPlugins::version(BenchmarkPlugins::make()))
        ->not->toBe(BenchmarkPlugins::version([BoldPlugin::make()]));
});

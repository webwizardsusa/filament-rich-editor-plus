<?php

use Hollyit\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Hollyit\RichEditorPlus\Benchmarks\BenchmarkSchema;
use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Hollyit\RichEditorPlus\Benchmarks\Fixtures\DocumentFactory;
use Hollyit\RichEditorPlus\Benchmarks\Fixtures\MentionableSeeder;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\StrategyFactory;
use Hollyit\RichEditorPlus\Tests\TestCase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(TestCase::class);

beforeEach(function (): void {
    BenchmarkSchema::create();

    $this->mentionables = MentionableSeeder::seed(10, 1);
    $this->fixtures = new DocumentFactory(1, $this->mentionables);
    $this->store = new DocumentStore(BenchmarkPlugins::make());
    $this->strategies = new StrategyFactory($this->store, Cache::store('array'));

    $documents = [];

    foreach (DocumentFactory::SHAPES as $shape) {
        for ($index = 0; $index < 3; $index++) {
            $documents[] = $this->fixtures->make($shape);
        }
    }

    $this->ids = $this->store->seed($documents);
});

it('renders the same HTML as json', function (string $name): void {
    $strategy = $this->strategies->make($name);
    $json = $this->strategies->make('json');

    expect($strategy->renderMany($this->ids))->toBe($json->renderMany($this->ids));

    foreach ($this->ids as $id) {
        expect($strategy->renderOne($id))->toBe($json->renderOne($id));
    }
})->with(StrategyFactory::NAMES);

it('renders the same HTML as json after saving', function (string $name): void {
    $strategy = $this->strategies->make($name);
    $strategy->renderOne($this->ids[0]);

    $id = $strategy->save($this->fixtures->make('mention-heavy'), $this->ids[0]);
    $new = $strategy->save($this->fixtures->make('small'));

    expect($id)->toBe($this->ids[0])
        ->and($strategy->renderOne($id))->toBe($this->strategies->make('json')->renderOne($id))
        ->and($strategy->renderOne($new))->toBe($this->strategies->make('json')->renderOne($new));
})->with(StrategyFactory::NAMES);

it('reports the bytes it stores per document', function (string $name): void {
    expect($this->strategies->make($name)->bytesPerDocument())->toBeGreaterThan(0.0);
})->with(StrategyFactory::NAMES);

it('keeps the mention map in sync with saves', function (): void {
    $strategy = $this->strategies->make('json');
    $document = $this->fixtures->make('mention-heavy');

    $id = $strategy->save($document, $this->ids[0]);

    expect(DB::table('bench_document_mentions')->where('document_id', $id)->pluck('mentionable_id')->sort()->values()->all())
        ->toBe(collect(DocumentStore::mentionIds($document))->sort()->values()->all());
});

it('rejects an unknown strategy', function (): void {
    $this->strategies->make('nope');
})->throws(InvalidArgumentException::class, 'Unknown strategy [nope].');

it('stays in sync with json after a mentioned entity is renamed', function (string $name): void {
    $strategy = $this->strategies->make($name);
    $strategy->renderMany($this->ids);

    $mentionableId = (string) DB::table('bench_document_mentions')->value('mentionable_id');
    DB::table('bench_mentionables')->where('id', $mentionableId)->update(['name' => 'Renamed Person']);
    $strategy->mentionableChanged($mentionableId);

    $expected = $this->strategies->make('json')->renderMany($this->ids);

    expect(implode('', $expected))->toContain('Renamed Person')
        ->and($strategy->renderMany($this->ids))->toBe($expected)
        ->and($strategy->renderOne($this->store->documentsMentioning($mentionableId)[0]))
        ->toBe($expected[$this->store->documentsMentioning($mentionableId)[0]]);
})->with(StrategyFactory::NAMES);

it('falls back to the stored label like json after a mentioned entity is deleted', function (string $name): void {
    $strategy = $this->strategies->make($name);
    $strategy->renderMany($this->ids);

    $mentionableId = (string) DB::table('bench_document_mentions')->value('mentionable_id');
    DB::table('bench_mentionables')->where('id', $mentionableId)->delete();
    $strategy->mentionableChanged($mentionableId);

    expect($strategy->renderMany($this->ids))->toBe($this->strategies->make('json')->renderMany($this->ids));
})->with(StrategyFactory::NAMES);

it('never serves cached HTML from before a save, even within the same second', function (string $inner): void {
    $strategy = (new StrategyFactory($this->store, Cache::store('array'), $inner))->make('cached');

    $before = $strategy->renderOne($this->ids[0]);
    $strategy->save($this->fixtures->make('small'), $this->ids[0]);
    $after = $strategy->renderOne($this->ids[0]);

    expect($after)->not->toBe($before)
        ->and($after)->toBe($this->strategies->make('json')->renderOne($this->ids[0]));
})->with(StrategyFactory::CACHED_INNER);

it('serves warm renders from the cache', function (): void {
    $strategy = $this->strategies->make('cached');
    $strategy->renderMany($this->ids);

    DB::enableQueryLog();
    $strategy->renderMany($this->ids);

    $selects = collect(DB::getQueryLog())->pluck('query')->filter(fn (string $query): bool => str_contains($query, 'bench_mentionables'));

    expect($selects)->toBeEmpty();
});

it('rejects an inner strategy that cached cannot wrap', function (): void {
    (new StrategyFactory($this->store, Cache::store('array'), 'rendered-html'))->make('cached');
})->throws(InvalidArgumentException::class, 'The cached strategy can only wrap [json, storable-html:patch].');

it('counts every column a strategy stores in its bytes per document', function (string $name, array $columns): void {
    $expected = array_sum(array_map(fn (string $column): float => $this->store->averageLength($column), $columns));

    expect($this->strategies->make($name)->bytesPerDocument())->toEqualWithDelta($expected, 0.001);
})->with([
    'json' => ['json', ['body']],
    'storable-html:reparse' => ['storable-html:reparse', ['body', 'storable_html']],
    'storable-html:patch' => ['storable-html:patch', ['body', 'storable_html']],
    'rendered-html' => ['rendered-html', ['body', 'rendered_html']],
]);

it('counts the wrapped strategy plus the cached HTML for cached', function (): void {
    $cached = $this->strategies->make('cached');

    expect($cached->bytesPerDocument())->toBeGreaterThan($this->store->averageLength('body') + 1);
});

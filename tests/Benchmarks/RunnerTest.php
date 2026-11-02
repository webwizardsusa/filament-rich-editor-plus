<?php

use Hollyit\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Hollyit\RichEditorPlus\Benchmarks\BenchmarkSchema;
use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Hollyit\RichEditorPlus\Benchmarks\Fixtures\MentionableSeeder;
use Hollyit\RichEditorPlus\Benchmarks\Runner\BenchmarkRun;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ParityChecker;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ParityException;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ScenarioRunner;
use Hollyit\RichEditorPlus\Benchmarks\Runner\Stats;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\ContentStrategy;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\StrategyFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class);

it('takes nearest-rank percentiles', function (): void {
    $samples = [5.0, 1.0, 4.0, 2.0, 3.0, 6.0, 7.0, 8.0, 9.0, 10.0];

    expect(Stats::percentile($samples, 50))->toBe(5.0)
        ->and(Stats::percentile($samples, 95))->toBe(10.0)
        ->and(Stats::percentile([], 50))->toBe(0.0);
});

it('runs warmup and measured iterations, counting queries per iteration', function (): void {
    $prepared = 0;
    $ran = 0;

    $result = (new ScenarioRunner(iterations: 4, warmup: 2))->measure(
        function () use (&$ran): void {
            $ran++;
            DB::select('select 1');
            DB::select('select 2');
        },
        function () use (&$prepared): void {
            $prepared++;
            DB::select('select 3');
        },
    );

    expect($ran)->toBe(6)
        ->and($prepared)->toBe(6)
        ->and($result['queries'])->toBe(2.0)
        ->and($result['p50'])->toBeGreaterThan(0.0)
        ->and($result['peak_mb'])->toBeGreaterThan(0.0);
});

it('names the strategy and document when a strategy renders different HTML', function (): void {
    BenchmarkSchema::create();
    $store = new DocumentStore(BenchmarkPlugins::make());
    $ids = $store->seed([['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hello']]]]]]);
    $factory = new StrategyFactory($store);

    $broken = new class implements ContentStrategy
    {
        public function name(): string
        {
            return 'broken';
        }

        public function save(array $document, ?int $id = null): int
        {
            return 0;
        }

        public function renderOne(int $id): string
        {
            return '<p>Goodbye</p>';
        }

        public function renderMany(array $ids): array
        {
            return array_fill_keys($ids, '<p>Goodbye</p>');
        }

        public function mentionableChanged(string $id): void {}

        public function bytesPerDocument(): float
        {
            return 0.0;
        }
    };

    expect(fn () => (new ParityChecker)->check($factory->make('json'), ['broken' => $broken], $ids, '1'))
        ->toThrow(ParityException::class, "Strategy [broken] rendered document [{$ids[0]}] differently");
});

it('passes parity and produces a result for every strategy and scenario', function (): void {
    BenchmarkSchema::create();
    $store = new DocumentStore(BenchmarkPlugins::make());
    $cache = Cache::store('array');

    $run = new BenchmarkRun(
        new StrategyFactory($store, $cache),
        $store,
        new ScenarioRunner(iterations: 2, warmup: 1),
        new ParityChecker,
        $cache,
        documents: 6,
        mentionables: 5,
        seed: 1,
    );

    $results = $run->runFixture('small', StrategyFactory::NAMES);

    expect($results)->toHaveCount(count(StrategyFactory::NAMES) * count(BenchmarkRun::SCENARIOS))
        ->and(collect($results)->pluck('scenario')->unique()->values()->all())->toBe(BenchmarkRun::SCENARIOS)
        ->and(collect($results)->every(fn ($result): bool => $result->fixture === 'small' && $result->bytesPerDocument > 0))->toBeTrue();
});

it('checks documents that mention the renamed entity even when the sample has none', function (): void {
    BenchmarkSchema::create();
    $mentionables = MentionableSeeder::seed(2, 1);
    $renameId = (string) array_key_last($mentionables);
    $store = new DocumentStore(BenchmarkPlugins::make());
    [$plain, $mentioning] = $store->seed([
        ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hello']]]]],
        ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
            ['type' => 'mention', 'attrs' => ['id' => $renameId, 'label' => $mentionables[(int) $renameId], 'char' => '@']],
        ]]]],
    ]);
    $factory = new StrategyFactory($store);
    $json = $factory->make('json');

    $stale = new class($json) implements ContentStrategy
    {
        /**
         * @var array<int, string>
         */
        protected array $memo = [];

        public function __construct(protected ContentStrategy $inner) {}

        public function name(): string
        {
            return 'stale';
        }

        public function save(array $document, ?int $id = null): int
        {
            return $this->inner->save($document, $id);
        }

        public function renderOne(int $id): string
        {
            return $this->renderMany([$id])[$id];
        }

        public function renderMany(array $ids): array
        {
            $html = [];

            foreach ($ids as $id) {
                $html[$id] = $this->memo[$id] ??= $this->inner->renderOne($id);
            }

            return $html;
        }

        public function mentionableChanged(string $id): void {}

        public function bytesPerDocument(): float
        {
            return 0.0;
        }
    };

    expect(fn () => (new ParityChecker)->check($json, ['stale' => $stale], [$plain], $renameId))
        ->toThrow(ParityException::class, "Strategy [stale] rendered document [{$mentioning}]");
});

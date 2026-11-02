<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Runner;

use Hollyit\RichEditorPlus\Benchmarks\BenchmarkSchema;
use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Hollyit\RichEditorPlus\Benchmarks\Fixtures\DocumentFactory;
use Hollyit\RichEditorPlus\Benchmarks\Fixtures\MentionableSeeder;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\ContentStrategy;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\StrategyFactory;
use Illuminate\Cache\Repository;
use Illuminate\Support\Facades\DB;
use Random\Engine\Mt19937;
use Random\Randomizer;

/**
 * Runs one fixture: seeds it, checks parity, then times every scenario for every strategy. Each strategy gets freshly
 * seeded rows, so one strategy's saves and renames never affect the next.
 */
class BenchmarkRun
{
    /**
     * @var array<int, string>
     */
    public const array SCENARIOS = ['index:cold', 'index:warm', 'show:cold', 'show:warm', 'save', 'rename'];

    protected const int INDEX_SIZE = 20;

    public function __construct(
        protected StrategyFactory $strategies,
        protected DocumentStore $store,
        protected ScenarioRunner $runner,
        protected ParityChecker $parity,
        protected Repository $cache,
        protected int $documents,
        protected int $mentionables,
        protected int $seed,
    ) {}

    /**
     * @param  array<int, string>  $strategyNames
     * @return array<int, ScenarioResult>
     *
     * @throws ParityException
     */
    public function runFixture(string $fixture, array $strategyNames): array
    {
        $mentionables = $this->seedFixture($fixture);
        $ids = $this->store->ids();
        $sample = $this->sample($ids);
        $renameId = $this->renameTarget();

        $strategies = [];

        foreach ($strategyNames as $name) {
            $strategies[$name] = $this->strategies->make($name);
        }

        $this->parity->check($this->strategies->make('json'), $strategies, $sample, $renameId);

        $replacementFactory = new DocumentFactory($this->seed + 1, $mentionables);
        $replacements = array_map(static fn (): array => $replacementFactory->make($fixture), range(1, 10));

        $results = [];

        foreach ($strategies as $name => $strategy) {
            $this->seedFixture($fixture);

            $bytes = $strategy->bytesPerDocument();

            foreach ($this->scenarios($strategy, $ids, $sample, $replacements, $renameId) as $scenario => [$subject, $prepare]) {
                $measured = $this->runner->measure($subject, $prepare);

                $results[] = new ScenarioResult(
                    $fixture,
                    $name,
                    $scenario,
                    $measured['p50'],
                    $measured['p95'],
                    $measured['queries'],
                    $measured['peak_mb'],
                    $bytes,
                );
            }
        }

        return $results;
    }

    /**
     * @param  array<int, int>  $ids
     * @param  array<int, int>  $sample
     * @param  array<int, array<string, mixed>>  $replacements
     * @return array<string, array{0: \Closure(): mixed, 1: (\Closure(): mixed) | null}>
     */
    protected function scenarios(ContentStrategy $strategy, array $ids, array $sample, array $replacements, string $renameId): array
    {
        $flush = fn (): bool => $this->cache->clear();
        $saves = 0;
        $renames = 0;

        return [
            'index:cold' => [fn (): array => $strategy->renderMany($sample), $flush],
            'index:warm' => [fn (): array => $strategy->renderMany($sample), null],
            'show:cold' => [fn (): string => $strategy->renderOne($sample[0]), $flush],
            'show:warm' => [fn (): string => $strategy->renderOne($sample[0]), null],
            'save' => [function () use ($strategy, $ids, $replacements, &$saves): int {
                $saves++;

                return $strategy->save($replacements[$saves % count($replacements)], $ids[($saves * 7) % count($ids)]);
            }, null],
            'rename' => [function () use ($strategy, $renameId, &$renames): void {
                $renames++;
                DB::table('bench_mentionables')->where('id', $renameId)->update(['name' => "Renamed {$renames}"]);
                $strategy->mentionableChanged($renameId);
            }, null],
        ];
    }

    /**
     * @return array<int, string> `id => name` of the seeded mentionables.
     */
    protected function seedFixture(string $fixture): array
    {
        BenchmarkSchema::truncate();

        $mentionables = MentionableSeeder::seed($this->mentionables, $this->seed);
        $factory = new DocumentFactory($this->seed, $mentionables);

        $this->store->seed(array_map(static fn (): array => $factory->make($fixture), range(1, $this->documents)));
        $this->cache->clear();

        return $mentionables;
    }

    /**
     * The same random documents for every strategy, as many as an index page shows.
     *
     * @param  array<int, int>  $ids
     * @return array<int, int>
     */
    protected function sample(array $ids): array
    {
        $random = new Randomizer(new Mt19937($this->seed));
        $keys = $random->pickArrayKeys($ids, min(self::INDEX_SIZE, count($ids)));

        return array_values(array_map(static fn (int $key): int => $ids[$key], $keys));
    }

    /**
     * The mentionable whose document count is closest to 5% of the documents.
     */
    protected function renameTarget(): string
    {
        $target = max(1, (int) round($this->documents * 0.05));

        $counts = DB::table('bench_document_mentions')
            ->select('mentionable_id', DB::raw('count(*) as total'))
            ->groupBy('mentionable_id')
            ->get();

        $best = $counts->sortBy(static fn (object $row): int => abs((int) $row->total - $target))->first();

        return (string) ($best?->mentionable_id ?? DB::table('bench_mentionables')->min('id'));
    }
}

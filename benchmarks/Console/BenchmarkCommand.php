<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Console;

use Hollyit\RichEditorPlus\Benchmarks\BenchmarkPlugins;
use Hollyit\RichEditorPlus\Benchmarks\BenchmarkSchema;
use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Hollyit\RichEditorPlus\Benchmarks\Fixtures\DocumentFactory;
use Hollyit\RichEditorPlus\Benchmarks\Runner\BenchmarkRun;
use Hollyit\RichEditorPlus\Benchmarks\Runner\Environment;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ParityChecker;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ParityException;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ScenarioResult;
use Hollyit\RichEditorPlus\Benchmarks\Runner\ScenarioRunner;
use Hollyit\RichEditorPlus\Benchmarks\Strategies\StrategyFactory;
use Illuminate\Cache\Repository;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;

class BenchmarkCommand extends Command
{
    protected $signature = 'rich-editor-plus:benchmark
        {--strategy=* : Strategies to run (default: all)}
        {--fixture=* : Fixture shapes to run (default: all)}
        {--documents=500 : Documents seeded per fixture}
        {--mentionables=200 : Entities seeded in bench_mentionables}
        {--iterations=50 : Measured iterations per scenario}
        {--warmup=5 : Discarded iterations per scenario}
        {--store=database : Cache store for the cached strategy}
        {--cached-inner=json : Strategy wrapped by the cached strategy}
        {--seed=1 : Fixture seed}
        {--json= : Also write the results to this path}
        {--setup : Create the bench_* tables, dropping old ones first}
        {--teardown : Drop the bench_* tables and exit}
        {--allow-sqlite : Allow running on SQLite}';

    protected $description = 'Benchmark Rich Editor Plus content storage, rendering and caching strategies';

    public function handle(): int
    {
        if ($this->laravel->isProduction()) {
            $this->components->error('Benchmarks never run in production.');

            return self::FAILURE;
        }

        if ($this->option('teardown')) {
            BenchmarkSchema::drop();
            $this->components->info('Dropped the bench_* tables.');

            return self::SUCCESS;
        }

        if (DB::connection()->getDriverName() === 'sqlite' && ! $this->option('allow-sqlite')) {
            $this->components->error('SQLite timings are not representative. Pass --allow-sqlite to run anyway.');

            return self::FAILURE;
        }

        if (! $this->option('setup') && ! BenchmarkSchema::exists()) {
            $this->components->error('The bench_* tables are missing. Run with --setup to create them.');

            return self::FAILURE;
        }

        try {
            $strategyNames = $this->listOption('strategy', StrategyFactory::NAMES, 'strategy');
            $fixtures = $this->listOption('fixture', DocumentFactory::SHAPES, 'fixture');
            $cache = Cache::store((string) $this->option('store'));
            $plugins = BenchmarkPlugins::make();
            $store = new DocumentStore($plugins);
            $strategies = new StrategyFactory($store, $cache, (string) $this->option('cached-inner'));

            if (in_array('cached', $strategyNames, true)) {
                $strategies->make('cached');
            }
        } catch (InvalidArgumentException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($this->option('setup')) {
            BenchmarkSchema::create();
        }

        foreach (Environment::warnings() as $warning) {
            $this->components->warn($warning);
        }

        if ($this->laravel->bound('debugbar')) {
            $this->laravel->make('debugbar')->disable();
        }

        $run = $this->makeRun($strategies, $store, $cache);
        $results = [];

        foreach ($fixtures as $fixture) {
            $this->components->info("Fixture: {$fixture}");

            try {
                $fixtureResults = $run->runFixture($fixture, $strategyNames);
            } catch (ParityException $exception) {
                $this->components->error($exception->getMessage());

                return self::FAILURE;
            }

            $this->renderTable($fixtureResults);
            $results = [...$results, ...$fixtureResults];
        }

        if (filled($this->option('json'))) {
            $this->writeJson((string) $this->option('json'), $results);
        }

        return self::SUCCESS;
    }

    protected function makeRun(StrategyFactory $strategies, DocumentStore $store, Repository $cache): BenchmarkRun
    {
        return new BenchmarkRun(
            $strategies,
            $store,
            new ScenarioRunner((int) $this->option('iterations'), (int) $this->option('warmup')),
            new ParityChecker,
            $cache,
            (int) $this->option('documents'),
            (int) $this->option('mentionables'),
            (int) $this->option('seed'),
        );
    }

    /**
     * @param  array<int, string>  $allowed
     * @return array<int, string>
     */
    protected function listOption(string $option, array $allowed, string $label): array
    {
        $values = array_values(array_filter((array) $this->option($option)));

        if ($values === []) {
            return $allowed;
        }

        foreach ($values as $value) {
            if (! in_array($value, $allowed, true)) {
                throw new InvalidArgumentException("Unknown {$label} [{$value}]. Choose from: ".implode(', ', $allowed).'.');
            }
        }

        return $values;
    }

    /**
     * @param  array<int, ScenarioResult>  $results
     */
    protected function renderTable(array $results): void
    {
        $baseline = [];

        foreach ($results as $result) {
            if ($result->strategy === 'json') {
                $baseline[$result->scenario] = $result->p50;
            }
        }

        $this->table(
            ['strategy', 'scenario', 'p50 ms', 'p95 ms', '×json (lower is faster)', 'queries', 'peak MB', 'bytes/doc'],
            array_map(static fn (ScenarioResult $result): array => [
                $result->strategy,
                $result->scenario,
                number_format($result->p50, 3),
                number_format($result->p95, 3),
                isset($baseline[$result->scenario]) && $baseline[$result->scenario] > 0
                    ? number_format($result->p50 / $baseline[$result->scenario], 2).'×'
                    : '-',
                number_format($result->queries, 1),
                number_format($result->peakMb, 1),
                number_format($result->bytesPerDocument),
            ], $results),
        );
    }

    /**
     * @param  array<int, ScenarioResult>  $results
     */
    protected function writeJson(string $path, array $results): void
    {
        $path = str_starts_with($path, DIRECTORY_SEPARATOR) ? $path : base_path($path);

        File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode([
            'environment' => Environment::describe((string) $this->option('store')),
            'options' => $this->options(),
            'results' => array_map(static fn (ScenarioResult $result): array => $result->toArray(), $results),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->components->info("Results written to {$path}.");
    }
}

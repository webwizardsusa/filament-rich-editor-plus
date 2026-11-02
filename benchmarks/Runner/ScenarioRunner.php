<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Runner;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Times a scenario: discarded warmup iterations, then measured ones. `$prepare` runs before every iteration and is
 * never timed or counted.
 */
class ScenarioRunner
{
    protected int $queries = 0;

    public function __construct(protected int $iterations, protected int $warmup)
    {
        DB::listen(function (): void {
            $this->queries++;
        });
    }

    /**
     * @return array{p50: float, p95: float, queries: float, peak_mb: float}
     */
    public function measure(Closure $subject, ?Closure $prepare = null): array
    {
        for ($iteration = 0; $iteration < $this->warmup; $iteration++) {
            if ($prepare !== null) {
                $prepare();
            }

            $subject();
        }

        $samples = [];
        $queries = 0;

        memory_reset_peak_usage();

        for ($iteration = 0; $iteration < $this->iterations; $iteration++) {
            if ($prepare !== null) {
                $prepare();
            }

            $queriesBefore = $this->queries;
            $start = hrtime(true);

            $subject();

            $samples[] = (hrtime(true) - $start) / 1_000_000;
            $queries += $this->queries - $queriesBefore;
        }

        return [
            'p50' => Stats::percentile($samples, 50),
            'p95' => Stats::percentile($samples, 95),
            'queries' => $this->iterations > 0 ? (float) ($queries / $this->iterations) : 0.0,
            'peak_mb' => memory_get_peak_usage() / 1_048_576,
        ];
    }
}

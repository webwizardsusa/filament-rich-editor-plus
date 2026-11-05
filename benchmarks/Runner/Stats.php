<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Runner;

class Stats
{
    /**
     * The nearest-rank percentile of the samples, or 0 when there are none.
     *
     * @param  array<int, float>  $samples
     */
    public static function percentile(array $samples, float $percentile): float
    {
        if ($samples === []) {
            return 0.0;
        }

        sort($samples);

        $index = max(0, (int) ceil(($percentile / 100) * count($samples)) - 1);

        return $samples[$index];
    }
}

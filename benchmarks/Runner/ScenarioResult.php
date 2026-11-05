<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Runner;

final readonly class ScenarioResult
{
    public function __construct(
        public string $fixture,
        public string $strategy,
        public string $scenario,
        public float $p50,
        public float $p95,
        public float $queries,
        public float $peakMb,
        public float $bytesPerDocument,
    ) {}

    /**
     * @return array{fixture: string, strategy: string, scenario: string, p50_ms: float, p95_ms: float, queries: float, peak_mb: float, bytes_per_document: float}
     */
    public function toArray(): array
    {
        return [
            'fixture' => $this->fixture,
            'strategy' => $this->strategy,
            'scenario' => $this->scenario,
            'p50_ms' => $this->p50,
            'p95_ms' => $this->p95,
            'queries' => $this->queries,
            'peak_mb' => $this->peakMb,
            'bytes_per_document' => $this->bytesPerDocument,
        ];
    }
}

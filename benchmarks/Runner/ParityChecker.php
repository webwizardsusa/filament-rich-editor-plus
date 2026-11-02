<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Runner;

use Hollyit\RichEditorPlus\Benchmarks\Strategies\ContentStrategy;
use Illuminate\Support\Facades\DB;

/**
 * Makes sure every strategy renders exactly what the baseline renders, before and after a mentioned entity is renamed,
 * so a fast strategy can never be a broken one. Documents that mention the renamed entity are always checked, first, so
 * the single-render check covers one of them whatever the sample.
 */
class ParityChecker
{
    /**
     * How many documents that mention the renamed entity are always checked, whatever the sample.
     */
    protected const int AFFECTED_DOCUMENTS = 5;

    /**
     * @param  array<string, ContentStrategy>  $strategies
     * @param  array<int, int>  $ids
     *
     * @throws ParityException
     */
    public function check(ContentStrategy $baseline, array $strategies, array $ids, string $renameId): void
    {
        $ids = array_values(array_unique([...$this->documentsMentioning($renameId), ...$ids]));

        $this->compare($baseline, $strategies, $ids, 'after seeding');

        DB::table('bench_mentionables')->where('id', $renameId)->update(['name' => 'Parity Check Rename']);

        $baseline->mentionableChanged($renameId);

        foreach ($strategies as $strategy) {
            $strategy->mentionableChanged($renameId);
        }

        $this->compare($baseline, $strategies, $ids, 'after a rename');
    }

    /**
     * The first documents that mention the entity, so they are rendered (and cached) before the rename and checked
     * after it.
     *
     * @return array<int, int>
     */
    protected function documentsMentioning(string $mentionableId): array
    {
        return DB::table('bench_document_mentions')
            ->where('mentionable_id', $mentionableId)
            ->orderBy('document_id')
            ->limit(self::AFFECTED_DOCUMENTS)
            ->pluck('document_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
    }

    /**
     * @param  array<string, ContentStrategy>  $strategies
     * @param  array<int, int>  $ids
     */
    protected function compare(ContentStrategy $baseline, array $strategies, array $ids, string $when): void
    {
        if ($ids === []) {
            return;
        }

        $expected = $baseline->renderMany($ids);

        foreach ($strategies as $name => $strategy) {
            $actual = $strategy->renderMany($ids);

            foreach ($expected as $id => $html) {
                $this->assertSame($name, $id, $html, $actual[$id] ?? '', "{$when}, in a batch");
            }

            $this->assertSame($name, $ids[0], $expected[$ids[0]], $strategy->renderOne($ids[0]), "{$when}, on its own");
        }
    }

    protected function assertSame(string $strategy, int $id, string $expected, string $actual, string $when): void
    {
        if ($expected === $actual) {
            return;
        }

        throw new ParityException(
            "Strategy [{$strategy}] rendered document [{$id}] differently from json {$when}.\n".$this->difference($expected, $actual),
        );
    }

    protected function difference(string $expected, string $actual): string
    {
        $offset = strspn($expected ^ $actual, "\0");
        $start = max(0, $offset - 60);

        return sprintf(
            "  json:     …%s…\n  strategy: …%s…",
            substr($expected, $start, 120),
            substr($actual, $start, 120),
        );
    }
}

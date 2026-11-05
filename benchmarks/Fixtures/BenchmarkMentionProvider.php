<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures;

use Illuminate\Support\Facades\DB;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;

/**
 * Mentions of rows in `bench_mentionables`, so every render pays for a real label lookup on the configured database.
 */
class BenchmarkMentionProvider extends MentionProvider
{
    protected string $trigger = '@';

    public function labels(array $ids): array
    {
        return DB::table('bench_mentionables')->whereIn('id', $ids)->pluck('name', 'id')->all();
    }

    public function urls(array $labels): array
    {
        $urls = [];

        foreach (array_keys($labels) as $id) {
            $urls[(string) $id] = "/bench/mentionables/{$id}";
        }

        return $urls;
    }
}

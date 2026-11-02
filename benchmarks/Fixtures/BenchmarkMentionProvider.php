<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Fixtures;

use Hollyit\RichEditorPlus\Support\MentionProvider;
use Illuminate\Support\Facades\DB;

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

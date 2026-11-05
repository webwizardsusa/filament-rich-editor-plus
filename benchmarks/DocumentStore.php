<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks;

use Illuminate\Support\Facades\DB;
use RuntimeException;
use stdClass;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;

/**
 * Reads and writes `bench_documents` and keeps `bench_document_mentions` in sync, for every strategy.
 */
class DocumentStore
{
    public const string TABLE = 'bench_documents';

    public const string MENTIONS_TABLE = 'bench_document_mentions';

    /**
     * @param  array<EditorPlugin>  $plugins
     */
    public function __construct(protected array $plugins) {}

    /**
     * @return array<EditorPlugin>
     */
    public function plugins(): array
    {
        return $this->plugins;
    }

    public function version(): string
    {
        return BenchmarkPlugins::version($this->plugins);
    }

    /**
     * Writes the body plus any extra columns, creating the row when `$id` is null. `updated_at` has microseconds, so
     * two saves in the same second still change it.
     *
     * @param  array<string, mixed>  $document
     * @param  array<string, mixed>  $columns
     */
    public function write(?int $id, array $document, array $columns = []): int
    {
        $now = now()->format('Y-m-d H:i:s.u');

        $row = [
            'body' => json_encode($document, JSON_THROW_ON_ERROR),
            'render_version' => $this->version(),
            'updated_at' => $now,
            ...$columns,
        ];

        if ($id === null) {
            $id = (int) DB::table(self::TABLE)->insertGetId([...$row, 'created_at' => $now]);
        } else {
            DB::table(self::TABLE)->where('id', $id)->update($row);
        }

        $this->syncMentions($id, $document);

        return $id;
    }

    /**
     * Inserts documents with every column filled, so any strategy can read them.
     *
     * @param  array<int, array<string, mixed>>  $documents
     * @return array<int, int> The new ids, in order.
     */
    public function seed(array $documents): array
    {
        $documents = array_values($documents);
        $rendered = RichContentPlusRenderer::many($documents)->plugins($this->plugins)->toHtml();
        $ids = [];

        foreach ($documents as $index => $document) {
            $ids[] = $this->write(null, $document, [
                'storable_html' => RichContentPlusRenderer::make($document)->plugins($this->plugins)->toStorableHtml(),
                'rendered_html' => $rendered[$index],
            ]);
        }

        return $ids;
    }

    /**
     * @param  array<int, string>  $columns
     */
    public function row(int $id, array $columns): stdClass
    {
        return DB::table(self::TABLE)->where('id', $id)->first(['id', ...$columns])
            ?? throw new RuntimeException("Benchmark document [{$id}] does not exist.");
    }

    /**
     * @param  array<int, int>  $ids
     * @param  array<int, string>  $columns
     * @return array<int, stdClass> Keyed by id, in the order given. Missing ids are left out.
     */
    public function rows(array $ids, array $columns): array
    {
        $rows = DB::table(self::TABLE)->whereIn('id', $ids)->get(['id', ...$columns])->keyBy('id');
        $ordered = [];

        foreach ($ids as $id) {
            if (isset($rows[$id])) {
                $ordered[$id] = $rows[$id];
            }
        }

        return $ordered;
    }

    /**
     * Changes columns without touching `updated_at`, for derived data such as re-rendered HTML.
     *
     * @param  array<string, mixed>  $columns
     */
    public function update(int $id, array $columns): void
    {
        DB::table(self::TABLE)->where('id', $id)->update($columns);
    }

    /**
     * @return array<int, int>
     */
    public function documentsMentioning(string $mentionableId): array
    {
        return DB::table(self::MENTIONS_TABLE)
            ->where('mentionable_id', $mentionableId)
            ->orderBy('document_id')
            ->pluck('document_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
    }

    /**
     * @return array<int, int>
     */
    public function ids(?int $limit = null): array
    {
        return DB::table(self::TABLE)
            ->orderBy('id')
            ->when($limit !== null, static fn ($query) => $query->limit($limit))
            ->pluck('id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
    }

    public function averageLength(string $column): float
    {
        return (float) DB::table(self::TABLE)->selectRaw("AVG(LENGTH({$column})) as average")->value('average');
    }

    /**
     * The ids of every mention in a document, however deeply nested, without duplicates.
     *
     * @param  array<string, mixed>  $node
     * @return array<int, string>
     */
    public static function mentionIds(array $node): array
    {
        $ids = [];

        if (($node['type'] ?? null) === 'mention' && isset($node['attrs']['id'])) {
            $ids[] = (string) $node['attrs']['id'];
        }

        foreach (is_array($node['content'] ?? null) ? $node['content'] : [] as $child) {
            if (is_array($child)) {
                $ids = [...$ids, ...static::mentionIds($child)];
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param  array<string, mixed>  $document
     */
    protected function syncMentions(int $id, array $document): void
    {
        DB::table(self::MENTIONS_TABLE)->where('document_id', $id)->delete();

        $rows = array_map(
            static fn (string $mentionableId): array => ['document_id' => $id, 'mentionable_id' => $mentionableId],
            static::mentionIds($document),
        );

        if ($rows !== []) {
            DB::table(self::MENTIONS_TABLE)->insert($rows);
        }
    }
}

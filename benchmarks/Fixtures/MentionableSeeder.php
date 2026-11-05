<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures;

use Illuminate\Support\Facades\DB;
use Random\Engine\Mt19937;
use Random\Randomizer;

/**
 * Seeds `bench_mentionables`. The first names always need escaping, so every run checks that strategies escape labels
 * exactly as the renderer does.
 */
class MentionableSeeder
{
    /**
     * @var array<int, string>
     */
    protected const array SPECIAL_NAMES = ["Seán O'Brien", 'Zoë & Co', '<b>Bold</b> Bob'];

    /**
     * @var array<int, string>
     */
    protected const array FIRST_NAMES = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Barbara', 'Ken', 'Radia', 'Edsger', 'Frances', 'Donald', 'Hedy'];

    /**
     * @var array<int, string>
     */
    protected const array LAST_NAMES = ['Lovelace', 'Hopper', 'Torvalds', 'Hamilton', 'Turing', 'Liskov', 'Thompson', 'Perlman', 'Dijkstra', 'Allen', 'Knuth', 'Lamarr'];

    /**
     * @return array<int, string> `id => name`, in id order.
     */
    public static function seed(int $count, int $seed): array
    {
        $random = new Randomizer(new Mt19937($seed));
        $rows = [];

        for ($index = 0; $index < $count; $index++) {
            $rows[] = ['name' => self::SPECIAL_NAMES[$index] ?? sprintf(
                '%s %s %d',
                self::FIRST_NAMES[$random->getInt(0, count(self::FIRST_NAMES) - 1)],
                self::LAST_NAMES[$random->getInt(0, count(self::LAST_NAMES) - 1)],
                $index + 1,
            )];
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('bench_mentionables')->insert($chunk);
        }

        return DB::table('bench_mentionables')->orderBy('id')->pluck('name', 'id')->all();
    }
}

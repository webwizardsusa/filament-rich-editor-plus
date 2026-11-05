<?php

namespace Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\Rules;

use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownWriter;
use Hollyit\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;

/**
 * GFM tables. The first row is the header; column alignment comes from its cells; merged cells are unmerged (the
 * content stays in the first cell); each cell is one line, with paragraphs joined by `<br>` and other blocks reduced to their
 * text.
 */
class TableRules
{
    /**
     * @return array<string, NodeRule>
     */
    public static function nodes(): array
    {
        $cell = NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write(static::cellText($node, $writer)));

        return [
            'table' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write(static::renderTable($node, $writer))),
            'tableRow' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write(
                '| '.implode(' | ', array_map(static fn (array $child): string => static::cellText($child, $writer), $node['content'] ?? [])).' |',
            )),
            'tableHeader' => $cell,
            'tableCell' => $cell,
        ];
    }

    /**
     * @param  array<string, mixed>  $table
     */
    protected static function renderTable(array $table, MarkdownWriter $writer): string
    {
        $grid = [];
        $aligns = [];
        $pending = [];

        foreach ($table['content'] ?? [] as $rowIndex => $row) {
            $cells = [];
            $column = 0;

            foreach ($row['content'] ?? [] as $cell) {
                while (($pending[$column] ?? 0) > 0) {
                    $cells[$column] = '';
                    $pending[$column]--;
                    $column++;
                }

                $colspan = max(1, (int) ($cell['attrs']['colspan'] ?? 1));
                $rowspan = max(1, (int) ($cell['attrs']['rowspan'] ?? 1));

                for ($offset = 0; $offset < $colspan; $offset++) {
                    $cells[$column + $offset] = $offset === 0 ? static::cellText($cell, $writer) : '';

                    if ($rowIndex === 0) {
                        $aligns[$column + $offset] = $cell['attrs']['align'] ?? null;
                    }

                    if ($rowspan > 1) {
                        $pending[$column + $offset] = $rowspan - 1;
                    }
                }

                $column += $colspan;
            }

            foreach ($pending as $covered => $rows) {
                if ($covered >= $column && $rows > 0) {
                    $cells[$covered] = '';
                    $pending[$covered]--;
                }
            }

            ksort($cells);
            $grid[] = $cells;
        }

        if ($grid === []) {
            return '';
        }

        $width = max(array_map(static fn (array $cells): int => $cells === [] ? 0 : max(array_keys($cells)) + 1, $grid));
        $line = static function (array $cells) use ($width): string {
            $values = [];

            for ($column = 0; $column < $width; $column++) {
                $values[] = $cells[$column] ?? '';
            }

            return '| '.implode(' | ', $values).' |';
        };

        $delimiters = [];

        for ($column = 0; $column < $width; $column++) {
            $delimiters[] = match ($aligns[$column] ?? null) {
                'left' => ':--',
                'center' => ':-:',
                'right' => '--:',
                default => '---',
            };
        }

        return implode("\n", [$line($grid[0]), '| '.implode(' | ', $delimiters).' |', ...array_map($line, array_slice($grid, 1))]);
    }

    /**
     * @param  array<string, mixed>  $cell
     */
    protected static function cellText(array $cell, MarkdownWriter $writer): string
    {
        $parts = [];
        $wasEscapingPipes = $writer->recall('escapePipes');
        $writer->remember('escapePipes', false);

        foreach ($cell['content'] ?? [] as $block) {
            $parts[] = ($block['type'] ?? null) === 'paragraph'
                ? preg_replace('/\s*\n\s*/', ' ', str_replace("\\\n", '<br>', $writer->renderInline($block['content'] ?? [])))
                : $writer->escape(trim(preg_replace('/\s+/', ' ', $writer->textOf($block))));
        }

        $writer->remember('escapePipes', $wasEscapingPipes);

        return str_replace('|', '\|', implode('<br>', array_filter($parts, static fn (string $part): bool => $part !== '')));
    }
}

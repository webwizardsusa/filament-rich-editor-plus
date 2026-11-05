<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\Rules;

use Closure;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkdownWriter;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkRule;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;

/**
 * Markdown for the core plugins' nodes and marks.
 */
class CoreRules
{
    /**
     * @return array<string, NodeRule>
     */
    public static function nodes(): array
    {
        $children = static fn (array $node, MarkdownWriter $writer): string => $writer->renderBlocks($node['content'] ?? []);

        return [
            'paragraph' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $hasBreaks = in_array('hardBreak', array_column($node['content'] ?? [], 'type'), true);
                $wasEscapingPipes = $writer->recall('escapePipes');
                $writer->remember('escapePipes', $hasBreaks);
                $markdown = preg_replace('/(?:\\\\\n)+$/', '', $writer->renderInline($node['content'] ?? []));
                $writer->remember('escapePipes', $wasEscapingPipes);
                $writer->write($writer->escapeLineStarts($markdown));
            }),
            'hardBreak' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write("\\\n")),
            'heading' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $level = max(1, min(6, (int) ($node['attrs']['level'] ?? 1)));
                $text = trim(str_replace("\\\n", ' ', $writer->renderInline($node['content'] ?? [])));
                $text = preg_replace_callback(
                    '/(^|\s)(#+)$/',
                    static fn (array $match): string => $match[1].str_repeat('\\#', strlen($match[2])),
                    $text,
                );
                $writer->write(rtrim(str_repeat('#', $level).' '.$text));
            }),
            'blockquote' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write(
                $writer->indent($children($node, $writer), '> ', '> '),
            )),
            'horizontalRule' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write('---')),
            'codeBlock' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $code = implode('', array_map(static fn (array $text): string => (string) ($text['text'] ?? ''), $node['content'] ?? []));
                $fence = str_repeat('`', max(3, static::longestBacktickRun($code) + 1));
                $language = (string) preg_replace('/[\s`]+/u', '', (string) ($node['attrs']['language'] ?? ''));
                $writer->write($fence.$language."\n".($code === '' ? '' : $code."\n").$fence);
            }),
            'bulletList' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $bullet = static::bulletFor($writer);
                $writer->write(static::renderList($node, $writer, static fn (): string => $bullet.' '));
            }),
            'taskList' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $bullet = static::bulletFor($writer);
                $writer->write(static::renderList(
                    $node,
                    $writer,
                    static fn (array $item): string => $bullet.(($item['attrs']['checked'] ?? false) ? ' [x] ' : ' [ ] '),
                    continuation: 2,
                ));
            }),
            'orderedList' => NodeRule::using(static function (array $node, MarkdownWriter $writer): void {
                $start = (int) ($node['attrs']['start'] ?? 1);
                $key = 'ordered:'.$writer->depth();
                $delimiter = ($writer->previousSibling()['type'] ?? null) === 'orderedList' && $writer->recall($key) === '.' ? ')' : '.';
                $writer->remember($key, $delimiter);
                $writer->write(static::renderList($node, $writer, static fn (array $item, int $index): string => ($start + $index).$delimiter.' '));
            }),
            'listItem' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write($children($node, $writer))),
            'taskItem' => NodeRule::using(static fn (array $node, MarkdownWriter $writer) => $writer->write($children($node, $writer))),
        ];
    }

    /**
     * @return array<string, MarkRule>
     */
    public static function marks(): array
    {
        return [
            'bold' => MarkRule::using('**', '**')->withHtmlFallback('<strong>', '</strong>'),
            'italic' => MarkRule::using('*', '*')->withHtmlFallback('<em>', '</em>'),
            'strike' => MarkRule::using('~~', '~~')->withHtmlFallback('<del>', '</del>'),
            'code' => MarkRule::wrapping(static function (string $text): string {
                $fence = str_repeat('`', static::longestBacktickRun($text) + 1);
                $isPadded = str_starts_with($text, ' ') && str_ends_with($text, ' ') && trim($text, ' ') !== '';
                $pad = str_starts_with($text, '`') || str_ends_with($text, '`') || $isPadded ? ' ' : '';

                return $fence.$pad.$text.$pad.$fence;
            }),
            'link' => MarkRule::using('[', static fn (array $mark, MarkdownWriter $writer): string => ']('
                .$writer->linkDestination((string) ($mark['attrs']['href'] ?? ''))
                .$writer->linkTitle((string) ($mark['attrs']['title'] ?? ''))
                .')')
                ->when(static fn (array $mark, MarkdownWriter $writer): bool => $writer->isAllowedUrl(
                    (string) ($mark['attrs']['href'] ?? ''),
                    'link',
                    'href',
                    ['http', 'https', 'mailto', 'tel'],
                )),
        ];
    }

    /**
     * A list's items, each prefixed with its marker and the rest of its lines indented to line up with the content.
     * A list is loose (blank lines between items and between an item's blocks) when any item has two paragraphs. An
     * item that doesn't start with text (another block, or the empty paragraph the editor needs before one) starts on
     * the line after its marker, so `- ---` can't read as a rule.
     *
     * @param  array<string, mixed>  $node
     * @param  Closure(array<string, mixed>, int): string  $marker
     */
    protected static function renderList(array $node, MarkdownWriter $writer, Closure $marker, ?int $continuation = null): string
    {
        $items = $node['content'] ?? [];
        $isLoose = false;

        foreach ($items as $item) {
            if (! static::isTightItem($item)) {
                $isLoose = true;

                break;
            }
        }

        $rendered = [];

        foreach ($items as $index => $item) {
            $prefix = $marker($item, $index);
            $rest = str_repeat(' ', $continuation ?? mb_strlen($prefix));
            $body = $writer->renderBlocks($item['content'] ?? [], $isLoose ? "\n\n" : "\n");

            $first = $item['content'][0] ?? [];
            $startsWithText = ($first['type'] ?? null) === 'paragraph' && ($first['content'] ?? []) !== [];

            $rendered[] = $startsWithText || $body === ''
                ? $writer->indent($body, $prefix, $rest)
                : rtrim($prefix)."\n".$writer->indent($body, $rest, $rest);
        }

        return implode($isLoose ? "\n\n" : "\n", $rendered);
    }

    /**
     * An item can be written without blank lines when it is one paragraph followed by nested lists. A nested ordered
     * list that doesn't start at 1 can't interrupt a paragraph, so it needs the blank line.
     *
     * @param  array<string, mixed>  $item
     */
    protected static function isTightItem(array $item): bool
    {
        $children = $item['content'] ?? [];

        if (($children[0]['type'] ?? null) !== 'paragraph') {
            return $children === [];
        }

        foreach (array_slice($children, 1) as $child) {
            $type = $child['type'] ?? null;

            if (! in_array($type, ['bulletList', 'orderedList', 'taskList'], true)) {
                return false;
            }

            if ($type === 'orderedList' && (int) ($child['attrs']['start'] ?? 1) !== 1) {
                return false;
            }
        }

        return true;
    }

    /**
     * `-`, or `*` when the list directly follows a bullet or task list written with `-`, so the two don't merge.
     */
    protected static function bulletFor(MarkdownWriter $writer): string
    {
        $key = 'bullet:'.$writer->depth();
        $follows = in_array($writer->previousSibling()['type'] ?? null, ['bulletList', 'taskList'], true);
        $bullet = $follows && $writer->recall($key) === '-' ? '*' : '-';
        $writer->remember($key, $bullet);

        return $bullet;
    }

    protected static function longestBacktickRun(string $text): int
    {
        $longest = 0;

        foreach (preg_split('/[^`]+/', $text, flags: PREG_SPLIT_NO_EMPTY) ?: [] as $run) {
            $longest = max($longest, strlen($run));
        }

        return $longest;
    }
}

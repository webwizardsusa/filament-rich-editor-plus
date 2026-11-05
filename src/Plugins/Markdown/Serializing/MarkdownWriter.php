<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing;

use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Content\ContentSpec;
use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;

/**
 * Renders nodes with the rules. Each rule writes into a buffer of its own, so a rule can render its children, get
 * their Markdown back as a string, and indent or join it.
 */
class MarkdownWriter
{
    /**
     * @var array<int, string>
     */
    protected array $buffers = [];

    /**
     * @var array<int, ?array<string, mixed>>
     */
    protected array $previousSiblings = [];

    /**
     * @var array<string, mixed>
     */
    protected array $memory = [];

    /**
     * @param  array<string, NodeRule>  $nodeRules
     * @param  array<string, MarkRule>  $markRules
     */
    public function __construct(
        protected array $nodeRules,
        protected array $markRules,
        protected ContentSchema $schema,
        protected bool $strict,
    ) {}

    public function isStrict(): bool
    {
        return $this->strict;
    }

    public function write(string $markdown): void
    {
        $this->buffers[array_key_last($this->buffers)] .= $markdown;
    }

    /**
     * Block nodes, each rendered by its rule, joined by `$separator`. Blocks that write nothing (empty paragraphs) are
     * left out.
     *
     * @param  array<array<string, mixed>>  $nodes
     */
    public function renderBlocks(array $nodes, string $separator = "\n\n"): string
    {
        $blocks = [];
        $this->previousSiblings[] = null;

        foreach ($nodes as $node) {
            $markdown = $this->renderNode($node, isBlock: true);

            if ($markdown !== '') {
                $blocks[] = $markdown;
            }

            $this->previousSiblings[array_key_last($this->previousSiblings)] = $node;
        }

        array_pop($this->previousSiblings);

        return implode($separator, $blocks);
    }

    /**
     * The block written just before the one being rendered, at the same level.
     *
     * @return ?array<string, mixed>
     */
    public function previousSibling(): ?array
    {
        return $this->previousSiblings === [] ? null : $this->previousSiblings[array_key_last($this->previousSiblings)];
    }

    /**
     * Inline nodes with their marks. Spaces at the edge of marked text are moved outside the delimiters, because
     * `**bold **` is not bold in Markdown. Emphasis delimiters are only written when CommonMark would honour them
     * given the characters on both sides (`x**"a"**y` would not); otherwise the mark's HTML fallback is written.
     * Delimiters that touch form one run in CommonMark, so only the text around the run counts.
     *
     * @param  array<array<string, mixed>>  $nodes
     */
    public function renderInline(array $nodes): string
    {
        $output = '';
        $last = '';
        $spans = [];
        $active = [];
        $pendingSpace = '';

        $isInRun = false;

        $emit = function (string $markdown, bool $isDelimiter = false) use (&$output, &$last, &$isInRun): void {
            if ($markdown === '') {
                return;
            }

            $output .= $markdown;
            $isInRun = $isDelimiter;

            if (! $isDelimiter) {
                $last = mb_substr($markdown, -1);
            }
        };

        $open = function (array $entries) use (&$output, &$last, &$spans, &$isInRun, $emit): array {
            foreach ($entries as $index => [$rule, $mark]) {
                if ($rule->hasHtmlFallback()) {
                    $id = count($spans);
                    $spans[$id] = ['rule' => $rule, 'mark' => $mark];
                    $emit("\0O{$id}\0", true);
                    $entries[$index][2] = $id;

                    continue;
                }

                $delimiter = $rule->open($mark, $this);

                if (! $isInRun && $last === '!' && str_starts_with($delimiter, '[')) {
                    $output = substr($output, 0, -1).'\\!';
                }

                $emit($delimiter);
                $entries[$index][2] = null;
            }

            return $entries;
        };

        $close = function (array $entries) use ($emit): void {
            foreach (array_reverse($entries) as [$rule, $mark, $id]) {
                if ($id === null) {
                    $emit($rule->close($mark, $this));

                    continue;
                }

                $emit("\0C{$id}\0", true);
            }
        };

        foreach ($nodes as $node) {
            if (($node['type'] ?? null) !== 'text') {
                $close($active);
                $active = [];
                $emit($pendingSpace);
                $pendingSpace = '';
                $emit($this->renderNode($node));

                continue;
            }

            $text = str_replace("\0", '', (string) ($node['text'] ?? ''));
            [$delimited, $wrapping] = $this->marksOf($node);

            if ($wrapping === [] && trim($text) === '') {
                $pendingSpace .= $text;

                continue;
            }

            $lead = '';
            $core = $text;
            $trail = '';

            if ($wrapping === []) {
                preg_match('/^(\s*)(.*?)(\s*)$/su', $text, $parts);
                [, $lead, $core, $trail] = $parts;
            }

            $shared = $this->sharedPrefix($active, $delimited);
            $close(array_slice($active, $shared));
            $emit($pendingSpace);
            $emit($lead);
            $opened = $open(array_slice($delimited, $shared));
            $active = [...array_slice($active, 0, $shared), ...$opened];

            $written = $wrapping === [] ? $this->escape($core) : $core;

            foreach ($wrapping as [$rule, $mark]) {
                $written = $rule->wrap($written, $mark);
            }

            $emit($written);
            $pendingSpace = $trail;
        }

        $close($active);
        $emit($pendingSpace);

        return $this->resolveEmphasis($output, $spans);
    }

    /**
     * Replaces the placeholders of emphasis marks with their delimiters, or with HTML where CommonMark wouldn't honour
     * the delimiters. A delimiter run is a stretch of touching delimiters of one character, judged by the characters
     * around it; a different delimiter next to the run counts as punctuation. A run that both closes and opens marks
     * is written as HTML too, because CommonMark may pair its delimiters differently.
     *
     * @param  array<int, array{rule: MarkRule, mark: array<string, mixed>}>  $spans
     */
    protected function resolveEmphasis(string $output, array $spans): string
    {
        $pieces = preg_split('/\0([OC])(\d+)\0/', $output, -1, PREG_SPLIT_DELIM_CAPTURE);
        $items = [];

        foreach (array_chunk($pieces, 3) as $chunk) {
            [$text, $kind, $id] = array_pad($chunk, 3, null);

            if ($text !== '') {
                $items[] = ['text' => $text];
            }

            if ($kind !== null) {
                $items[] = ['kind' => $kind, 'id' => (int) $id, 'char' => mb_substr($spans[(int) $id]['rule']->open($spans[(int) $id]['mark'], $this), 0, 1)];
            }
        }

        $fallback = [];

        for ($start = 0; $start < count($items); $start++) {
            if (! isset($items[$start]['kind'])) {
                continue;
            }

            $end = $start;

            while (isset($items[$end + 1]['kind']) && $items[$end + 1]['char'] === $items[$start]['char']) {
                $end++;
            }

            $run = array_slice($items, $start, $end - $start + 1);
            $before = $this->neighbour($items[$start - 1] ?? null, false);
            $after = $this->neighbour($items[$end + 1] ?? null, true);
            $isMixed = count(array_unique(array_column($run, 'kind'))) > 1;

            foreach ($run as $item) {
                $isHonoured = ! $isMixed && ($item['kind'] === 'O' ? $this->isLeftFlanking($before, $after) : $this->isRightFlanking($before, $after));

                if (! $isHonoured) {
                    $fallback[$item['id']] = true;
                }
            }

            $start = $end;
        }

        $markdown = '';

        foreach ($items as $item) {
            if (isset($item['text'])) {
                $markdown .= $item['text'];

                continue;
            }

            $span = $spans[$item['id']];
            $isHtml = isset($fallback[$item['id']]);

            $markdown .= match (true) {
                $item['kind'] === 'O' && $isHtml => $span['rule']->fallbackOpen(),
                $item['kind'] === 'O' => $span['rule']->open($span['mark'], $this),
                $isHtml => $span['rule']->fallbackClose(),
                default => $span['rule']->close($span['mark'], $this),
            };
        }

        return $markdown;
    }

    /**
     * The character next to a delimiter run: '' at the edge, a punctuation mark when another delimiter touches it.
     *
     * @param  ?array<string, mixed>  $item
     */
    protected function neighbour(?array $item, bool $isAfter): string
    {
        if ($item === null) {
            return '';
        }

        if (isset($item['kind'])) {
            return '*';
        }

        return $isAfter ? mb_substr($item['text'], 0, 1) : mb_substr($item['text'], -1);
    }

    /**
     * CommonMark's left-flanking rule for a delimiter run, from the character before it and the one after it ('' for a
     * line edge).
     */
    protected function isLeftFlanking(string $before, string $after): bool
    {
        return $after !== '' && ! $this->isWhitespace($after)
            && (! $this->isPunctuation($after) || $before === '' || $this->isWhitespace($before) || $this->isPunctuation($before));
    }

    protected function isRightFlanking(string $before, string $after): bool
    {
        return $before !== '' && ! $this->isWhitespace($before)
            && (! $this->isPunctuation($before) || $after === '' || $this->isWhitespace($after) || $this->isPunctuation($after));
    }

    protected function isWhitespace(string $character): bool
    {
        return preg_match('/^[\s\p{Zs}]$/u', $character) === 1;
    }

    protected function isPunctuation(string $character): bool
    {
        return preg_match('/^[\p{P}\p{S}]$/u', $character) === 1;
    }

    /**
     * Escapes characters that would start Markdown syntax inside a line. Line starts are handled separately by
     * {@see escapeLineStarts()}.
     */
    public function escape(string $text): string
    {
        $text = str_replace('\\', '\\\\', $text);
        $text = preg_replace('/([*`\[\]~])/', '\\\\$1', $text);
        $text = preg_replace('/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/u', '\\\\_', $text);
        $text = preg_replace('/<(?=[A-Za-z\/!?])/', '\\\\<', $text);

        $text = preg_replace('/&(?=#?[A-Za-z0-9]+;)/', '\\\\&', $text);

        return $this->recall('escapePipes') === true ? str_replace('|', '\\|', $text) : $text;
    }

    /**
     * Escapes what would make a line a heading, quote, list item or rule. Spaces and tabs at the start of a line are
     * dropped first: they would make it a code block or hide the other syntax from the escapes, and the editor doesn't
     * keep them anyway.
     */
    public function escapeLineStarts(string $markdown): string
    {
        return preg_replace(
            ['/^(#{1,6})(?=\s|$)/m', '/^>/m', '/^([-+])(?=\s)/m', '/^(\d+)([.)])(?=\s|$)/m', '/^(=+|-+)$/m'],
            ['\\\\$1', '\\\\>', '\\\\$1', '$1\\\\$2', '\\\\$1'],
            preg_replace('/^[ \t]+/m', '', $markdown),
        );
    }

    /**
     * Prefixes the first line with `$first` and the others with `$rest`, leaving blank lines without trailing spaces.
     */
    public function indent(string $text, string $first, string $rest): string
    {
        $lines = explode("\n", $text);

        foreach ($lines as $index => $line) {
            $prefix = $index === 0 ? $first : $rest;
            $lines[$index] = $line === '' ? rtrim($prefix) : $prefix.$line;
        }

        return implode("\n", $lines);
    }

    /**
     * A link or image destination, in `<…>` when it holds spaces, parentheses or angle brackets. Line breaks, which no
     * destination can hold, are percent-encoded.
     */
    public function linkDestination(string $url): string
    {
        $url = str_replace(["\r", "\n"], ['%0D', '%0A'], $url);

        return preg_match('/[\s()<>]/', $url) === 1 ? '<'.str_replace(['<', '>'], ['\<', '\>'], $url).'>' : $url;
    }

    /**
     * Whether a URL may be written for a mark's or node's attribute: relative, or with a protocol the schema allows
     * for that attribute (`$protocols` when the schema doesn't say). Stored state comes from the browser, so a
     * `javascript:` link must not reach Markdown that other renderers turn into a live link.
     *
     * @param  array<string>  $protocols
     */
    public function isAllowedUrl(string $url, string $type, string $attribute, array $protocols): bool
    {
        $spec = $this->schema->mark($type) ?? $this->schema->node($type);

        return ContentSpec::isAllowedUrl($url, $spec?->getUrlProtocols($attribute) ?? $protocols);
    }

    /**
     * ` "title"` for a link or image, or nothing when the title is empty.
     */
    public function linkTitle(string $title): string
    {
        return $title === '' ? '' : ' "'.str_replace(['\\', '"'], ['\\\\', '\\"'], $title).'"';
    }

    /**
     * How deep in nested blocks the rule being rendered is, for state kept per level with {@see remember()}.
     */
    public function depth(): int
    {
        return count($this->previousSiblings);
    }

    /**
     * State rules share while writing one document, such as the bullet the last list used.
     */
    public function remember(string $key, mixed $value): void
    {
        $this->memory[$key] = $value;
    }

    public function recall(string $key): mixed
    {
        return $this->memory[$key] ?? null;
    }

    /**
     * The plain text of a node, as the schema renders it for search and previews, or the text of its children when the schema gives none.
     *
     * @param  array<string, mixed>  $node
     */
    public function textOf(array $node): string
    {
        $spec = $this->schema->node((string) ($node['type'] ?? ''));
        $rendered = $spec?->renderText($node) ?? '';

        if ($rendered !== '') {
            return $rendered;
        }

        if (($node['type'] ?? null) === 'text') {
            return (string) ($node['text'] ?? '');
        }

        $children = $node['content'] ?? [];
        $hasBlocks = array_filter($children, fn (array $child): bool => ! $this->isInlineNode($child)) !== [];

        return implode($hasBlocks ? "\n\n" : '', array_map($this->textOf(...), $children));
    }

    /**
     * @param  array<string, mixed>  $node
     */
    protected function isInlineNode(array $node): bool
    {
        return ($node['type'] ?? null) === 'text' || ($this->schema->node((string) ($node['type'] ?? ''))?->isInline() ?? false);
    }

    /**
     * @param  array<string, mixed>  $node
     */
    protected function renderNode(array $node, bool $isBlock = false): string
    {
        $type = (string) ($node['type'] ?? '');
        $rule = $this->nodeRules[$type] ?? null;

        if ($rule === null) {
            if ($this->strict) {
                throw new UnsupportedContentFormatException("Markdown can't write [{$type}] nodes.");
            }

            $text = $this->escape(trim($this->textOf($node)));

            return $isBlock ? $this->escapeLineStarts($text) : $text;
        }

        $this->buffers[] = '';
        $rule->render($node, $this);

        return array_pop($this->buffers);
    }

    /**
     * The node's marks with rules, in schema order: delimited marks, and marks that wrap the text.
     *
     * @param  array<string, mixed>  $node
     * @return array{0: array<array{0: MarkRule, 1: array<string, mixed>}>, 1: array<array{0: MarkRule, 1: array<string, mixed>}>}
     */
    protected function marksOf(array $node): array
    {
        $marks = $node['marks'] ?? [];
        usort($marks, fn (array $a, array $b): int => $this->schema->markRank((string) $a['type']) <=> $this->schema->markRank((string) $b['type']));

        $delimited = [];
        $wrapping = [];

        foreach ($marks as $mark) {
            $rule = $this->markRules[$mark['type']] ?? null;

            if ($rule === null) {
                if ($this->strict) {
                    throw new UnsupportedContentFormatException("Markdown can't write [{$mark['type']}] marks.");
                }

                continue;
            }

            if (! $rule->applies($mark, $this)) {
                continue;
            }

            if ($rule->wraps()) {
                $wrapping[] = [$rule, $mark];
            } else {
                $delimited[] = [$rule, $mark];
            }
        }

        return [$delimited, $wrapping];
    }

    /**
     * @param  array<array{0: MarkRule, 1: array<string, mixed>}>  $active
     * @param  array<array{0: MarkRule, 1: array<string, mixed>}>  $next
     */
    protected function sharedPrefix(array $active, array $next): int
    {
        $shared = 0;

        while (isset($active[$shared], $next[$shared]) && $active[$shared][1] == $next[$shared][1]) {
            $shared++;
        }

        return $shared;
    }

    /**
     * @param  array<array{0: MarkRule, 1: array<string, mixed>}>  $marks
     */
    protected function openMarks(array $marks): string
    {
        return implode('', array_map(fn (array $entry): string => $entry[0]->open($entry[1], $this), $marks));
    }

    /**
     * @param  array<array{0: MarkRule, 1: array<string, mixed>}>  $marks
     */
    protected function closeMarks(array $marks): string
    {
        return implode('', array_map(fn (array $entry): string => $entry[0]->close($entry[1], $this), array_reverse($marks)));
    }
}

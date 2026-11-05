<?php

namespace Webwizardsusa\RichEditorPlus\Tests\Support;

use InvalidArgumentException;
use Random\Engine\Mt19937;
use Random\Randomizer;

/**
 * Builds TipTap documents in fixed shapes from a seed, so the same seed always gives the same documents.
 */
class DocumentFactory
{
    /**
     * @var array<int, string>
     */
    public const array SHAPES = ['small', 'article', 'mention-heavy', 'deep'];

    /**
     * @var array<int, string>
     */
    protected const array WORDS = [
        'cache', 'render', 'query', 'index', 'editor', 'plugin', 'schema', 'document', 'mention', 'server', 'browser',
        'layout', 'table', 'column', 'request', 'response', 'queue', 'worker', 'batch', 'lookup', 'storage', 'version',
        'release', 'feature', 'test', 'deploy', 'metric', 'latency', 'memory', 'payload', 'the', 'a', 'with', 'without',
        'before', 'after', 'quickly', 'carefully', 'often', 'rarely', 'fast', 'slow', 'simple', 'clear', 'stale', 'fresh',
    ];

    protected Randomizer $random;

    /**
     * @var array<int, array{id: string, label: string}>
     */
    protected array $people = [];

    /**
     * @param  array<int | string, string>  $mentionables  `id => name`
     */
    public function __construct(int $seed, array $mentionables)
    {
        $this->random = new Randomizer(new Mt19937($seed));

        foreach ($mentionables as $id => $name) {
            $this->people[] = ['id' => (string) $id, 'label' => $name];
        }
    }

    /**
     * @return array{type: string, content: array<int, array<string, mixed>>}
     */
    public function make(string $shape): array
    {
        $content = match ($shape) {
            'small' => $this->small(),
            'article' => $this->article(mentions: 3),
            'mention-heavy' => $this->article(mentions: 30),
            'deep' => $this->deep(),
            default => throw new InvalidArgumentException("Unknown fixture shape [{$shape}]."),
        };

        return ['type' => 'doc', 'content' => $content];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function small(): array
    {
        return [$this->heading(), $this->paragraph(1), $this->paragraph(0), $this->paragraph(0), $this->paragraph(0)];
    }

    /**
     * Eight sections of a heading, three paragraphs and one other block: 40 blocks.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function article(int $mentions): array
    {
        $mentionsPerParagraph = $this->spread($mentions, 24);
        $blocks = [];

        for ($section = 0; $section < 8; $section++) {
            $blocks[] = $this->heading();

            for ($paragraph = 0; $paragraph < 3; $paragraph++) {
                $blocks[] = $this->paragraph($mentionsPerParagraph[($section * 3) + $paragraph]);
            }

            $blocks[] = match ($section % 5) {
                0 => $this->list('bulletList', 4),
                1 => $this->list('orderedList', 4),
                2 => ['type' => 'blockquote', 'content' => [$this->paragraph(0)]],
                3 => $this->codeBlock(),
                default => ['type' => 'horizontalRule'],
            };
        }

        return $blocks;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function deep(): array
    {
        $blocks = [];

        for ($index = 0; $index < 5; $index++) {
            $blocks[] = $this->nestedList(4);
            $blocks[] = $this->nestedQuote(3);
        }

        return $blocks;
    }

    /**
     * @return array<string, mixed>
     */
    protected function heading(): array
    {
        return ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [['type' => 'text', 'text' => ucfirst($this->words(3, 6))]]];
    }

    /**
     * Four to eight runs of words, some with a mark, and the given number of mentions between runs.
     *
     * @return array<string, mixed>
     */
    protected function paragraph(int $mentions): array
    {
        $runs = $this->random->getInt(4, 8);
        $mentions = $this->people === [] ? 0 : min($mentions, $runs - 1);
        $mentionAfter = $mentions > 0 ? $this->random->pickArrayKeys(range(0, $runs - 2), $mentions) : [];
        $content = [];

        for ($run = 0; $run < $runs; $run++) {
            $text = $this->words(1, 4).($run < $runs - 1 ? ' ' : '.');
            $node = ['type' => 'text', 'text' => $run === 0 ? ucfirst($text) : $text];
            $mark = $this->mark();

            if ($mark !== null) {
                $node['marks'] = [$mark];
            }

            $content[] = $node;

            if (in_array($run, $mentionAfter, true)) {
                $content[] = $this->mention();
                $content[] = ['type' => 'text', 'text' => ' '];
            }
        }

        return ['type' => 'paragraph', 'content' => $content];
    }

    /**
     * @return array<string, mixed> | null
     */
    protected function mark(): ?array
    {
        return match ($this->random->getInt(0, 9)) {
            0 => ['type' => 'bold'],
            1 => ['type' => 'italic'],
            2 => ['type' => 'underline'],
            3 => ['type' => 'strike'],
            4 => ['type' => 'link', 'attrs' => ['href' => 'https://example.com/'.$this->words(1, 1)]],
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    protected function mention(): array
    {
        $person = $this->people[$this->random->getInt(0, count($this->people) - 1)];

        return ['type' => 'mention', 'attrs' => ['id' => $person['id'], 'label' => $person['label'], 'char' => '@']];
    }

    /**
     * @return array<string, mixed>
     */
    protected function list(string $type, int $items): array
    {
        $content = [];

        for ($item = 0; $item < $items; $item++) {
            $content[] = ['type' => 'listItem', 'content' => [$this->paragraph(0)]];
        }

        return ['type' => $type, 'content' => $content];
    }

    /**
     * @return array<string, mixed>
     */
    protected function nestedList(int $depth): array
    {
        $first = ['type' => 'listItem', 'content' => [$this->paragraph(0)]];

        if ($depth > 1) {
            $first['content'][] = $this->nestedList($depth - 1);
        }

        return ['type' => 'bulletList', 'content' => [$first, ['type' => 'listItem', 'content' => [$this->paragraph(0)]]]];
    }

    /**
     * @return array<string, mixed>
     */
    protected function nestedQuote(int $depth): array
    {
        $content = [$this->paragraph($depth === 1 ? 1 : 0)];

        if ($depth > 1) {
            $content[] = $this->nestedQuote($depth - 1);
        }

        return ['type' => 'blockquote', 'content' => $content];
    }

    /**
     * @return array<string, mixed>
     */
    protected function codeBlock(): array
    {
        return ['type' => 'codeBlock', 'attrs' => ['language' => 'php'], 'content' => [[
            'type' => 'text',
            'text' => "\$value = cache()->remember('{$this->words(1, 1)}', 60, fn () => 'value');\nreturn \$value;",
        ]]];
    }

    protected function words(int $min, int $max): string
    {
        $words = [];

        for ($index = $this->random->getInt($min, $max); $index > 0; $index--) {
            $words[] = self::WORDS[$this->random->getInt(0, count(self::WORDS) - 1)];
        }

        return implode(' ', $words);
    }

    /**
     * Spreads a total over slots as evenly as possible, earlier slots first.
     *
     * @return array<int, int>
     */
    protected function spread(int $total, int $slots): array
    {
        $spread = array_fill(0, $slots, intdiv($total, $slots));

        for ($slot = 0; $slot < $total % $slots; $slot++) {
            $spread[$slot]++;
        }

        return $spread;
    }
}

<?php

namespace Hollyit\RichEditorPlus\Support;

use Closure;
use Filament\Forms\Components\Field;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * One kind of mention: its trigger, and how to find and label its records. Configure it with closures, or subclass it
 * and override `search()`, `labels()` and `url()`.
 *
 * When content is rendered, `labels()` and `urls()` are called once per render with the ids of every mention in it,
 * across all the documents of a batch render, so each can be a single query.
 *
 * Security: `search()` and `labels()` run for anyone who can load the page, with any input, so they must scope records
 * themselves, for example to the current tenant. `getField()` gives access to the field to do that, and is null in the
 * renderer.
 */
class MentionProvider
{
    protected string $trigger = '';

    protected bool $allowsSpaces = false;

    protected int $minQueryLength = 0;

    protected int $limit = 50;

    protected ?string $displayFormat = null;

    protected ?string $noResultsMessage = null;

    protected ?string $searchingMessage = null;

    protected ?string $searchPrompt = null;

    /**
     * @var array<string | int, string> | Closure
     */
    protected array|Closure $items = [];

    protected ?Closure $getSearchResultsUsing = null;

    protected ?Closure $getLabelsUsing = null;

    protected ?Closure $getUrlUsing = null;

    protected ?Closure $getUrlsUsing = null;

    protected ?Field $field = null;

    public function __construct(?string $trigger = null)
    {
        $this->trigger = $trigger ?? $this->trigger;

        $this->assertValidTrigger();
    }

    public static function make(?string $trigger = null): static
    {
        return app(static::class, ['trigger' => $trigger]);
    }

    /**
     * @param  array<string | int, string> | Closure  $items
     */
    public function items(array|Closure $items): static
    {
        $this->items = $items;

        return $this;
    }

    public function getSearchResultsUsing(?Closure $callback): static
    {
        $this->getSearchResultsUsing = $callback;

        return $this;
    }

    public function getLabelsUsing(?Closure $callback): static
    {
        $this->getLabelsUsing = $callback;

        return $this;
    }

    public function getUrlUsing(?Closure $callback): static
    {
        $this->getUrlUsing = $callback;

        return $this;
    }

    /**
     * Gives the URLs for many mentions at once: the callback gets `id => label` and returns `id => url`. Use it instead
     * of `getUrlUsing()` when building a URL needs a query.
     */
    public function getUrlsUsing(?Closure $callback): static
    {
        $this->getUrlsUsing = $callback;

        return $this;
    }

    /**
     * Lets a query run on past a space, for searching full names.
     */
    public function allowSpaces(bool $condition = true): static
    {
        $this->allowsSpaces = $condition;

        return $this;
    }

    public function minQueryLength(int $length): static
    {
        $this->minQueryLength = $length;

        return $this;
    }

    public function limit(int $limit): static
    {
        $this->limit = $limit;

        return $this;
    }

    /**
     * How a token reads, with `:label` for the label. It is a string, not a method to override, because the browser
     * draws tokens too.
     */
    public function displayFormat(?string $format): static
    {
        $this->displayFormat = $format;

        return $this;
    }

    public function noResultsMessage(?string $message): static
    {
        $this->noResultsMessage = $message;

        return $this;
    }

    public function searchingMessage(?string $message): static
    {
        $this->searchingMessage = $message;

        return $this;
    }

    public function searchPrompt(?string $message): static
    {
        $this->searchPrompt = $message;

        return $this;
    }

    public function field(?Field $field): static
    {
        $this->field = $field;

        return $this;
    }

    public function getField(): ?Field
    {
        return $this->field;
    }

    public function getTrigger(): string
    {
        return $this->trigger;
    }

    /**
     * Finds records for a query. Return `id => label`, a list of {@see MentionItem}s, or a Collection of either.
     */
    public function search(string $query): mixed
    {
        if ($this->getSearchResultsUsing) {
            return ($this->getSearchResultsUsing)($query);
        }

        $items = $this->getItems();

        if ($query === '') {
            return $items;
        }

        return array_filter($items, static fn (string $label): bool => mb_stripos($label, $query) !== false);
    }

    /**
     * The current labels for these ids, as `id => label`. Leave out ids that no longer exist.
     *
     * @param  array<string>  $ids
     * @return array<string | int, string>
     */
    public function labels(array $ids): array
    {
        if ($this->getLabelsUsing) {
            return ($this->getLabelsUsing)($ids);
        }

        return array_intersect_key($this->getItems(), array_flip($ids));
    }

    /**
     * Where a rendered mention links to, or null for no link.
     */
    public function url(string $id, string $label): ?string
    {
        return $this->getUrlUsing ? ($this->getUrlUsing)($id, $label) : null;
    }

    /**
     * Where each rendered mention links to, as `id => url`. Leave out (or give null for) ids with no link. By default it
     * asks `url()` for each id.
     *
     * @param  array<string, string>  $labels  `id => label`
     * @return array<string | int, string | null>
     */
    public function urls(array $labels): array
    {
        if ($this->getUrlsUsing) {
            return ($this->getUrlsUsing)($labels);
        }

        $urls = [];

        foreach ($labels as $id => $label) {
            $urls[$id] = $this->url((string) $id, $label);
        }

        return $urls;
    }

    /**
     * @return array<MentionItem>
     */
    public function getResults(string $query): array
    {
        if (mb_strlen($query) < $this->minQueryLength) {
            return [];
        }

        return array_slice($this->normalizeResults($this->search($query)), 0, $this->limit);
    }

    /**
     * @param  array<string>  $ids
     * @return array<string, string>
     */
    public function getLabels(array $ids): array
    {
        $labels = [];

        foreach ($this->labels($ids) as $id => $label) {
            if (in_array((string) $id, $ids, true)) {
                $labels[(string) $id] = (string) $label;
            }
        }

        return $labels;
    }

    /**
     * Only `http`, `https` and relative URLs get through, so a bad value can never become a `javascript:` link.
     */
    public function getUrl(string $id, string $label): ?string
    {
        return $this->sanitizeUrl($this->url($id, $label));
    }

    /**
     * The safe URLs for these mentions, as `id => url`, leaving out ids with no link. See {@see getUrl()}.
     *
     * @param  array<string, string>  $labels  `id => label`
     * @return array<string, string>
     */
    public function getUrls(array $labels): array
    {
        $urls = [];

        foreach ($this->urls($labels) as $id => $url) {
            $id = (string) $id;

            if (! array_key_exists($id, $labels)) {
                continue;
            }

            $url = $this->sanitizeUrl(is_scalar($url) ? (string) $url : null);

            if ($url !== null) {
                $urls[$id] = $url;
            }
        }

        return $urls;
    }

    /**
     * Only `http`, `https` and relative URLs get through, so a bad value can never become a `javascript:` link.
     */
    protected function sanitizeUrl(?string $url): ?string
    {
        $url = trim((string) $url);

        if ($url === '') {
            return null;
        }

        $scheme = parse_url((string) preg_replace('/[\x00-\x20]/', '', $url), PHP_URL_SCHEME);

        if ($scheme === false) {
            return null;
        }

        return $scheme === null || in_array(strtolower($scheme), ['http', 'https'], true) ? $url : null;
    }

    public function getDisplayFormat(): string
    {
        return $this->displayFormat ?? "{$this->trigger}:label";
    }

    public function formatLabel(string $label): string
    {
        return str_replace(':label', $label, $this->getDisplayFormat());
    }

    /**
     * @return array{trigger: string, allowSpaces: bool, minQueryLength: int, displayFormat: string, messages: array{noResults: string, searching: string, searchPrompt: string}}
     */
    public function toJsConfig(): array
    {
        return [
            'trigger' => $this->trigger,
            'allowSpaces' => $this->allowsSpaces,
            'minQueryLength' => $this->minQueryLength,
            'displayFormat' => $this->getDisplayFormat(),
            'messages' => [
                'noResults' => $this->noResultsMessage ?? __('rich-editor-plus::mentions.no_results'),
                'searching' => $this->searchingMessage ?? __('rich-editor-plus::mentions.searching'),
                'searchPrompt' => $this->searchPrompt ?? __('rich-editor-plus::mentions.search_prompt'),
            ],
        ];
    }

    /**
     * @return array<string | int, string>
     */
    protected function getItems(): array
    {
        return $this->items instanceof Closure ? ($this->items)() : $this->items;
    }

    /**
     * @return array<MentionItem>
     */
    protected function normalizeResults(mixed $results): array
    {
        $results = $results instanceof Collection ? $results->all() : ($results ?? []);

        $items = [];

        foreach ($results as $id => $result) {
            $items[] = $result instanceof MentionItem ? $result : MentionItem::make($id, (string) $result);
        }

        return $items;
    }

    protected function assertValidTrigger(): void
    {
        if ($this->trigger === '' || preg_match('/\s/', $this->trigger) === 1) {
            throw new InvalidArgumentException('A mention trigger cannot be blank or contain spaces.');
        }

        if ($this->trigger === '/') {
            throw new InvalidArgumentException('The trigger [/] is reserved for the slash menu.');
        }
    }
}

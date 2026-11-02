<?php

namespace Hollyit\RichEditorPlus\Benchmarks\Strategies;

use Hollyit\RichEditorPlus\Benchmarks\DocumentStore;
use Illuminate\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;

class StrategyFactory
{
    /**
     * @var array<int, string>
     */
    public const array NAMES = ['json', 'storable-html:reparse', 'storable-html:patch', 'rendered-html', 'cached'];

    /**
     * The strategies `cached` can wrap. The others either store final HTML already or are not worth caching.
     *
     * @var array<int, string>
     */
    public const array CACHED_INNER = ['json', 'storable-html:patch'];

    protected Repository $cache;

    public function __construct(protected DocumentStore $store, ?Repository $cache = null, protected string $cachedInner = 'json')
    {
        $this->cache = $cache ?? Cache::store('array');
    }

    public function make(string $name): ContentStrategy
    {
        return match ($name) {
            'json' => new JsonStrategy($this->store),
            'storable-html:reparse' => new StorableHtmlReparseStrategy($this->store),
            'storable-html:patch' => new StorableHtmlPatchStrategy($this->store),
            'rendered-html' => new RenderedHtmlStrategy($this->store),
            'cached' => new CachedStrategy($this->makeCachedInner(), $this->store, $this->cache),
            default => throw new InvalidArgumentException("Unknown strategy [{$name}]."),
        };
    }

    protected function makeCachedInner(): ContentStrategy
    {
        if (! in_array($this->cachedInner, self::CACHED_INNER, true)) {
            throw new InvalidArgumentException('The cached strategy can only wrap ['.implode(', ', self::CACHED_INNER).'].');
        }

        return $this->make($this->cachedInner);
    }
}

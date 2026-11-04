<?php

use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Contracts\PatchesRenderedMarkup;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Rendering\HtmlPatcher;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

/**
 * A block atom like the image figure: `<figure data-type="photo" data-key="…"><img src="…" alt="…"><figcaption>…</figcaption></figure>`,
 * whose `src` is filled in at render time from its key.
 */
class PhotoTestPlugin extends Plugin implements PatchesRenderedMarkup
{
    public int $calls = 0;

    public function getId(): string
    {
        return 'test/photo';
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('photo')
                ->atom()
                ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'figure' && $element->getAttribute('data-type') === 'photo')
                ->attribute('key', parse: static fn (DOMElement $element): ?string => $element->getAttribute('data-key') ?: null, render: static fn (): array => [])
                ->attribute('alt', parse: static fn (DOMElement $element): string => $element->getElementsByTagName('img')->item(0)?->getAttribute('alt') ?? '', render: static fn (): array => [], default: '')
                ->attribute('caption', parse: static fn (DOMElement $element): string => $element->getElementsByTagName('figcaption')->item(0)?->textContent ?? '', render: static fn (): array => [], default: '')
                ->transientAttribute('src', ['https'])
                ->renderUsing(static function (array $node, array $attributes): array {
                    $attrs = $node['attrs'] ?? [];
                    $img = ['img', array_filter(['src' => $attributes['src'] ?? null, 'alt' => (string) ($attrs['alt'] ?? '')], static fn (mixed $value): bool => $value !== null)];

                    return ['figure', ['data-type' => 'photo', 'data-key' => $attrs['key'] ?? null], $img, ...(($attrs['caption'] ?? '') === '' ? [] : [['figcaption', (string) $attrs['caption']]])];
                }),
        ];
    }

    public function getRenderedNodes(): array
    {
        return ['photo'];
    }

    public function getRenderedMarkupNodes(): array
    {
        return ['photo'];
    }

    public function prepareRenderedContents(array $documents): array
    {
        $this->calls++;

        return array_map(fn (array $document): array => $this->fill($document), $documents);
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    protected function fill(array $node): array
    {
        if (($node['type'] ?? null) === 'photo') {
            $node['attrs']['src'] = 'https://cdn.test/'.$node['attrs']['key'];
        }

        if (isset($node['content'])) {
            $node['content'] = array_map(fn (array $child): array => $this->fill($child), $node['content']);
        }

        return $node;
    }
}

function fullPhotoRender(string $html): string
{
    return RichContentPlusRenderer::make($html)->parseHtml()->plugins([new PhotoTestPlugin])->toHtml();
}

function photoRenderer(PhotoTestPlugin $plugin, array $documents): array
{
    return (new HtmlPatcher(PluginRegistry::make([$plugin])))->patch($documents);
}

it('refreshes a rendered element that contains markup, leaving everything else as stored', function (): void {
    $plugin = new PhotoTestPlugin;
    $stored = '<p>Before</p><figure data-type="photo" data-key="a.jpg"><img alt="An A"><figcaption>Cap &amp; tion</figcaption></figure><p>After</p>';

    expect(photoRenderer($plugin, [$stored])[0])
        ->toBe('<p>Before</p><figure data-type="photo" data-key="a.jpg"><img src="https://cdn.test/a.jpg" alt="An A"><figcaption>Cap &amp; tion</figcaption></figure><p>After</p>')
        ->and($plugin->calls)->toBe(1);
});

it('prepares every markup node in a batch with one call', function (): void {
    $plugin = new PhotoTestPlugin;
    $figure = fn (string $key): string => '<figure data-type="photo" data-key="'.$key.'"><img alt=""></figure>';

    $patched = photoRenderer($plugin, ['one' => $figure('a.jpg').$figure('b.jpg'), 'two' => '<p>x</p>'.$figure('c.jpg')]);

    expect($plugin->calls)->toBe(1)
        ->and($patched['one'])->toContain('src="https://cdn.test/a.jpg"')->toContain('src="https://cdn.test/b.jpg"')
        ->and($patched['two'])->toBe('<p>x</p><figure data-type="photo" data-key="c.jpg"><img src="https://cdn.test/c.jpg" alt=""></figure>');
});

it('renders a document whose markup node does not parse back through the full parse path', function (): void {
    $plugin = new PhotoTestPlugin;
    $broken = '<p>a</p><div data-type="photo" data-key="a.jpg"><p>not a photo</p></div>';
    $fine = '<figure data-type="photo" data-key="b.jpg"><img alt=""></figure>';

    $patched = photoRenderer($plugin, ['broken' => $broken, 'fine' => $fine]);

    expect($patched['fine'])->toBe('<figure data-type="photo" data-key="b.jpg"><img src="https://cdn.test/b.jpg" alt=""></figure>')
        ->and($patched['broken'])->toBe(RichContentPlusRenderer::make($broken)->parseHtml()->plugins([new PhotoTestPlugin])->toHtml())
        ->and($plugin->calls)->toBe(2);
});

it('leaves documents without rendered nodes untouched and makes no call', function (): void {
    $plugin = new PhotoTestPlugin;

    expect(photoRenderer($plugin, ['<p>plain</p>'])[0])->toBe('<p>plain</p>')
        ->and($plugin->calls)->toBe(0);
});

it('refuses a markup node that the plugin does not also declare as rendered', function (): void {
    $plugin = new class extends PhotoTestPlugin
    {
        public function getRenderedNodes(): array
        {
            return [];
        }
    };

    expect(fn () => new HtmlPatcher(PluginRegistry::make([$plugin])))->toThrow(LogicException::class);
});

it('patches mentions and markup nodes together, leaving a mention inside a markup element to that element', function (): void {
    $plugin = new PhotoTestPlugin;
    $mentions = MentionPlugin::make()->providers([MentionProvider::make('@')->items(['1' => 'Ada'])]);
    $stored = '<p><span data-id="1" data-label="Old" data-char="@" data-type="mention" class="rep-mention">@Old</span></p>'
        .'<figure data-type="photo" data-key="a.jpg"><img alt=""><figcaption><span data-type="mention" data-id="1">@Old</span></figcaption></figure>';

    $patched = (new HtmlPatcher(PluginRegistry::make(PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [$mentions, $plugin]))))->patch([$stored])[0];

    expect($patched)->toBe('<p><span data-id="1" data-label="Ada" data-char="@" data-type="mention" class="rep-mention">@Ada</span></p>'
        .'<figure data-type="photo" data-key="a.jpg"><img src="https://cdn.test/a.jpg" alt=""><figcaption>@Old</figcaption></figure>')
        ->and($plugin->calls)->toBe(1);
});

it('renders an unclosed markup element before a large body through the full parse path instead of hitting the backtrack limit', function (): void {
    $plugin = new PhotoTestPlugin;
    $stored = '<figure data-type="photo" data-key="a.jpg"><img alt="">'.str_repeat('<p>Lorem ipsum dolor sit amet.</p>', 60_000);

    expect(photoRenderer($plugin, [$stored])[0])->toBe(fullPhotoRender($stored))
        ->and($plugin->calls)->toBe(1);
});

it('patches a markup element whose body is very large without hitting the backtrack limit', function (): void {
    $plugin = new PhotoTestPlugin;
    $caption = str_repeat('Long caption text. ', 60_000);

    $patched = photoRenderer($plugin, ['<figure data-type="photo" data-key="a.jpg"><img alt=""><figcaption>'.$caption.'</figcaption></figure>'])[0];

    expect($patched)->toBe('<figure data-type="photo" data-key="a.jpg"><img src="https://cdn.test/a.jpg" alt=""><figcaption>'.$caption.'</figcaption></figure>');
});

it('renders a document whose markup element contains another element of its tag through the full parse path', function (string $stored): void {
    $plugin = new PhotoTestPlugin;
    $fine = '<figure data-type="photo" data-key="b.jpg"><img alt=""></figure>';

    $patched = photoRenderer($plugin, ['nested' => $stored, 'fine' => $fine]);

    expect($patched['nested'])->toBe(fullPhotoRender($stored))
        ->and($patched['fine'])->toBe('<figure data-type="photo" data-key="b.jpg"><img src="https://cdn.test/b.jpg" alt=""></figure>')
        ->and($plugin->calls)->toBe(2);
})->with([
    'a nested photo figure' => ['<p>before</p><figure data-type="photo" data-key="outer.jpg"><figure data-type="photo" data-key="inner.jpg"><img alt="inner"></figure><img alt="outer"></figure><p>after</p>'],
    'a nested plain figure' => ['<figure data-type="photo" data-key="a.jpg"><figure><img alt="x"></figure><figcaption>cap</figcaption></figure><p>after</p>'],
]);

it('renders a document with an unclosed markup element through the full parse path, still patching the rest of the batch', function (): void {
    $plugin = new PhotoTestPlugin;
    $unclosed = '<figure data-type="photo" data-key="a.jpg"><img alt="">'
        .'<figure data-type="photo" data-key="b.jpg"><img alt=""></figure>';
    $fine = '<figure data-type="photo" data-key="c.jpg"><img alt=""></figure>';

    $patched = photoRenderer($plugin, ['unclosed' => $unclosed, 'fine' => $fine]);

    expect($patched['unclosed'])->toBe(fullPhotoRender($unclosed))
        ->and($patched['fine'])->toBe('<figure data-type="photo" data-key="c.jpg"><img src="https://cdn.test/c.jpg" alt=""></figure>')
        ->and($plugin->calls)->toBe(2);
});

it('renders a document the markup pattern fails on through the full parse path, still patching the rest of the batch', function (): void {
    $plugin = new PhotoTestPlugin;
    $failing = '<figure data-type="photo" data-key="a.jpg"><img alt="">'.str_repeat('<b>x</b>', 2_000);
    $fine = '<figure data-type="photo" data-key="b.jpg"><img alt=""></figure>';
    $backtrackLimit = ini_get('pcre.backtrack_limit');
    $jit = ini_get('pcre.jit');

    try {
        ini_set('pcre.jit', '0');
        ini_set('pcre.backtrack_limit', '100');

        $patched = photoRenderer($plugin, ['failing' => $failing, 'fine' => $fine]);
    } finally {
        ini_set('pcre.backtrack_limit', $backtrackLimit);
        ini_set('pcre.jit', $jit);
    }

    expect($patched['fine'])->toBe('<figure data-type="photo" data-key="b.jpg"><img src="https://cdn.test/b.jpg" alt=""></figure>')
        ->and($patched['failing'])->toBe(fullPhotoRender($failing))
        ->and($plugin->calls)->toBe(2);
});

<?php

use Webwizardsusa\RichEditorPlus\Plugins\Core\BoldPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

afterEach(fn (): mixed => PluginRegistry::flush());

class FakeTagMention extends MentionProvider
{
    protected string $trigger = '#';
}

function mentionNode(string $id, string $label, string $char = '@'): array
{
    return ['type' => 'mention', 'attrs' => ['id' => $id, 'label' => $label, 'char' => $char]];
}

function docWith(array ...$inline): array
{
    return ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => $inline]]];
}

function renderMentions(array $document, MentionProvider ...$providers): RichContentPlusRenderer
{
    return RichContentPlusRenderer::make($document)->plugins([BoldPlugin::make(), MentionPlugin::make()->providers($providers)]);
}

it('is opt-in, and added and removed by class name', function (): void {
    $added = RichEditorPlus::make('body')->addPlugins([MentionPlugin::class]);

    expect(RichEditorPlus::make('body')->getPluginRegistry()->has(MentionPlugin::ID))->toBeFalse()
        ->and($added->getPluginRegistry()->has(MentionPlugin::ID))->toBeTrue()
        ->and($added->withoutPlugins([MentionPlugin::class])->getPluginRegistry()->has(MentionPlugin::ID))->toBeFalse();
});

it('takes providers as instances or class names', function (): void {
    $plugin = MentionPlugin::make()->providers([FakeTagMention::class, MentionProvider::make('@')]);

    expect(array_keys($plugin->getProviders()))->toBe(['#', '@'])
        ->and($plugin->getProvider('#'))->toBeInstanceOf(FakeTagMention::class)
        ->and($plugin->getProvider('!'))->toBeNull();
});

it('rejects two providers with one trigger', function (): void {
    MentionPlugin::make()->providers([MentionProvider::make('@'), MentionProvider::make('@')]);
})->throws(InvalidArgumentException::class, 'trigger [@]');

it('lets another package add or replace a provider, however often the registry is rebuilt', function (): void {
    RichEditorPlus::extendPlugin(MentionPlugin::ID, function (PluginExtension $extension, MentionPlugin $plugin): void {
        $plugin->addProviders([MentionProvider::make('#')->limit(3)]);
    });

    $field = RichEditorPlus::make('body')->addPlugins([MentionPlugin::make()->providers([MentionProvider::make('@')])]);

    $field->getPluginRegistry();
    $registry = $field->getPluginRegistry();

    expect(array_keys($registry->getPlugins()[MentionPlugin::ID]->getProviders()))->toBe(['@', '#']);
});

it('sends its providers to the browser', function (): void {
    $descriptor = MentionPlugin::make()->providers([MentionProvider::make('@')])->getJsExtension()->toArray();

    expect($descriptor['id'])->toBe('core/mention')
        ->and($descriptor['options']['providers'][0]['trigger'])->toBe('@');
});

it('renders the current label', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Old name')),
        MentionProvider::make('@')->getLabelsUsing(fn (): array => ['1' => 'New name']),
    )->toHtml();

    expect($html)
        ->toContain('class="rep-mention"')
        ->toContain('data-id="1"')
        ->toContain('data-char="@"')
        ->toContain('>@New name<')
        ->not->toContain('Old name');
});

it('falls back to the stored label for a deleted record', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada')),
        MentionProvider::make('@')->getLabelsUsing(fn (): array => []),
    )->toHtml();

    expect($html)->toContain('>@Ada<');
});

it('falls back to the stored label when there is no provider for the trigger', function (): void {
    expect(renderMentions(docWith(mentionNode('1', 'Ada', '!')))->toHtml())->toContain('>!Ada<');
});

it('makes one label lookup per trigger however many mentions a document has', function (): void {
    $calls = [];

    $provider = function (string $trigger) use (&$calls): MentionProvider {
        return MentionProvider::make($trigger)->getLabelsUsing(function (array $ids) use (&$calls, $trigger): array {
            $calls[] = [$trigger, $ids];

            return [];
        });
    };

    renderMentions(
        docWith(mentionNode('1', 'a'), mentionNode('2', 'b'), mentionNode('1', 'a'), mentionNode('9', 'c', '#')),
        $provider('@'),
        $provider('#'),
    )->toHtml();

    expect($calls)->toBe([['@', ['1', '2']], ['#', ['9']]]);
});

it('makes one label lookup per trigger for a whole batch of documents', function (): void {
    $calls = [];

    $provider = MentionProvider::make('@')->getLabelsUsing(function (array $ids) use (&$calls): array {
        $calls[] = $ids;

        return ['1' => 'Ada', '2' => 'Grace', '3' => 'Hedy'];
    });

    $html = RichContentPlusRenderer::many([
        'a' => docWith(mentionNode('1', 'old')),
        'b' => docWith(mentionNode('2', 'old'), mentionNode('1', 'old')),
        'c' => docWith(mentionNode('3', 'old')),
    ])->plugins([MentionPlugin::make()->providers([$provider])])->toHtml();

    expect($calls)->toBe([['1', '2', '3']])
        ->and($html['a'])->toContain('>@Ada<')
        ->and($html['b'])->toContain('>@Grace<')->toContain('>@Ada<')
        ->and($html['c'])->toContain('>@Hedy<');
});

it('makes one URL lookup per trigger for a whole batch of documents', function (): void {
    $calls = [];

    $provider = MentionProvider::make('@')
        ->getLabelsUsing(fn (): array => ['1' => 'Ada', '2' => 'Grace'])
        ->getUrlsUsing(function (array $labels) use (&$calls): array {
            $calls[] = $labels;

            return ['1' => '/people/ada', '2' => 'javascript:alert(1)'];
        });

    $html = RichContentPlusRenderer::many([
        docWith(mentionNode('1', 'Ada')),
        docWith(mentionNode('2', 'Grace')),
    ])->plugins([MentionPlugin::make()->providers([$provider])])->toHtml();

    expect($calls)->toBe([['1' => 'Ada', '2' => 'Grace']])
        ->and($html[0])->toContain('href="/people/ada"')
        ->and($html[1])->not->toContain('<a')->not->toContain('javascript');
});

it('links each mention with a provider that only has a URL for one id at a time', function (): void {
    $html = RichContentPlusRenderer::many([docWith(mentionNode('1', 'Ada')), docWith(mentionNode('2', 'Grace'))])
        ->plugins([MentionPlugin::make()->providers([
            MentionProvider::make('@')->getUrlUsing(fn (string $id, string $label): string => "/people/{$id}/{$label}"),
        ])])
        ->toHtml();

    expect($html[0])->toContain('href="/people/1/Ada"')
        ->and($html[1])->toContain('href="/people/2/Grace"');
});

it('survives a URL lookup that throws, rendering mentions without links', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada')),
        MentionProvider::make('@')->getUrlsUsing(fn (): array => throw new RuntimeException('down')),
    )->toHtml();

    expect($html)->toContain('>@Ada<')->not->toContain('<a');
});

it('uses the provider display format', function (): void {
    $html = renderMentions(docWith(mentionNode('1', 'Ada', '[[')), MentionProvider::make('[[')->displayFormat('[[:label]]'))->toHtml();

    expect($html)->toContain('>[[Ada]]<');
});

it('links a mention when the provider has a URL', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada')),
        MentionProvider::make('@')->getUrlUsing(fn (string $id): string => "/people/{$id}"),
    )->toHtml();

    expect($html)->toContain('<a')->toContain('href="/people/1"');
});

it('keeps the stored label of a mention the provider no longer has, but links it nowhere', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada'), mentionNode('99', 'Forged')),
        MentionProvider::make('@')->items(['1' => 'Ada Lovelace'])->getUrlUsing(fn (string $id): string => "/people/{$id}"),
    )->toHtml();

    expect($html)->toContain('href="/people/1"')->toContain('>@Ada Lovelace<')
        ->toContain('>@Forged<')->not->toContain('/people/99');
});

it('keeps every link when the label lookup fails', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada')),
        MentionProvider::make('@')
            ->getLabelsUsing(fn (): array => throw new RuntimeException('down'))
            ->getUrlUsing(fn (string $id): string => "/people/{$id}"),
    )->toHtml();

    expect($html)->toContain('href="/people/1"')->toContain('>@Ada<');
});

it('renders a span for an unsafe URL', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada')),
        MentionProvider::make('@')->getUrlUsing(fn (): string => 'javascript:alert(1)'),
    )->toHtml();

    expect($html)->not->toContain('<a')->not->toContain('javascript');
});

it('ignores an href stored in the document, so a crafted one can never become a link', function (string $href): void {
    $node = mentionNode('1', 'Ada');
    $node['attrs']['href'] = $href;

    $html = renderMentions(docWith($node), MentionProvider::make('@')->items(['1' => 'Ada']))->toHtml();

    expect($html)->not->toContain('<a')->not->toContain($href);
})->with(['javascript:alert(1)', 'https://evil.example']);

it('ignores a stored href when there is no provider for the trigger', function (): void {
    $node = mentionNode('1', 'Ada', '!');
    $node['attrs']['href'] = 'javascript:alert(1)';

    expect(renderMentions(docWith($node))->toHtml())->not->toContain('javascript');
});

it('escapes labels and ids', function (): void {
    $html = renderMentions(docWith(mentionNode('"><script>', '<img src=x>')), MentionProvider::make('@'))->toHtml();

    expect($html)->not->toContain('<script>')->not->toContain('<img');
});

it('survives a provider that throws, using the stored label', function (): void {
    $html = renderMentions(
        docWith(mentionNode('1', 'Ada')),
        MentionProvider::make('@')->getLabelsUsing(fn (): array => throw new RuntimeException('down')),
    )->toHtml();

    expect($html)->toContain('>@Ada<');
});

it('uses current labels in text output', function (): void {
    $text = renderMentions(
        docWith(['type' => 'text', 'text' => 'Hi '], mentionNode('1', 'Old')),
        MentionProvider::make('@')->getLabelsUsing(fn (): array => ['1' => 'New']),
    )->toText();

    expect($text)->toContain('Hi @New');
});

it('keeps a mention in line with the text around it in text output', function (): void {
    $text = renderMentions(
        docWith(['type' => 'text', 'text' => 'Hi '], mentionNode('1', 'Ada'), ['type' => 'text', 'text' => ' there']),
        MentionProvider::make('@'),
    )->toText();

    expect($text)->toBe('Hi @Ada there');
});

it('uses the display format in text output', function (): void {
    $text = renderMentions(docWith(mentionNode('1', 'Home', '[[')), MentionProvider::make('[[')->displayFormat('[[:label]]'))->toText();

    expect($text)->toBe('[[Home]]');
});

it('leaves the stored document alone in toArray', function (): void {
    $document = renderMentions(
        docWith(mentionNode('1', 'Old')),
        MentionProvider::make('@')->getLabelsUsing(fn (): array => ['1' => 'New']),
    )->toArray();

    expect($document['content'][0]['content'][0]['attrs'])->toMatchArray(['id' => '1', 'label' => 'Old', 'char' => '@']);
});

it('round trips through HTML', function (): void {
    $html = renderMentions(docWith(mentionNode('1', 'Ada')), MentionProvider::make('@'))->toHtml();

    $document = RichContentPlusRenderer::make($html)->plugins([MentionPlugin::make()])->toArray();

    expect($document['content'][0]['content'][0]['type'])->toBe('mention')
        ->and($document['content'][0]['content'][0]['attrs'])->toMatchArray(['id' => '1', 'label' => 'Ada', 'char' => '@'])
        ->and($document['content'][0]['content'][0])->not->toHaveKey('content');
});

it('keeps an id and label of 0 when parsing HTML', function (): void {
    $document = RichContentPlusRenderer::make('<p><span data-type="mention" data-id="0" data-label="0" data-char="@">@0</span></p>')
        ->plugins([MentionPlugin::make()])
        ->toArray();

    expect($document['content'][0]['content'][0]['attrs'])->toMatchArray(['id' => '0', 'label' => '0', 'char' => '@']);
});

it('drops mentions when the renderer has no mention plugin', function (): void {
    expect(RichContentPlusRenderer::make(docWith(mentionNode('1', 'Ada')))->plugins([BoldPlugin::make()])->toHtml())
        ->not->toContain('Ada');
});

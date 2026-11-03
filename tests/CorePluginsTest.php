<?php

use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\CodeBlockPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\CodePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DividerPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DocumentPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\FindReplacePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\StrikethroughPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\SubscriptPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\SuperscriptPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\ToolScope;
use Tests\TestCase;

uses(TestCase::class);

function heading4Element(): DOMElement
{
    return (new DOMDocument)->createElement('h4');
}

beforeEach(fn (): mixed => PluginRegistry::flush());

dataset('core plugins', [
    'bold' => [BoldPlugin::class, 'core/bold', 'bold', 'toggleBold', 'mdi-format-bold', ToolScope::Inline],
    'italic' => [ItalicPlugin::class, 'core/italic', 'italic', 'toggleItalic', 'mdi-format-italic', ToolScope::Inline],
    'underline' => [UnderlinePlugin::class, 'core/underline', 'underline', 'toggleUnderline', 'mdi-format-underline', ToolScope::Inline],
    'strikethrough' => [StrikethroughPlugin::class, 'core/strikethrough', 'strike', 'toggleStrike', 'mdi-format-strikethrough', ToolScope::Inline],
    'link' => [LinkPlugin::class, 'core/link', 'link', null, 'mdi-link', ToolScope::Inline],
    'code' => [CodePlugin::class, 'core/code', 'code', 'toggleCode', 'mdi-code-tags', ToolScope::Inline],
    'subscript' => [SubscriptPlugin::class, 'core/subscript', 'subscript', 'toggleSubscript', 'mdi-format-subscript', ToolScope::Overflow],
    'superscript' => [SuperscriptPlugin::class, 'core/superscript', 'superscript', 'toggleSuperscript', 'mdi-format-superscript', ToolScope::Overflow],
]);

it('describes itself to both PHP and JS', function (string $class, string $id, string $tiptapName, ?string $command, string $icon, ToolScope $scope): void {
    $plugin = $class::make();
    $tool = $plugin->getTools()[0];

    expect($plugin->getId())->toBe($id)
        ->and($plugin->getJsExtension()->getId())->toBe($id)
        ->and($plugin->getMarks()[0]->getName())->toBe($tiptapName)
        ->and($tool->getCommand())->toBe($command)
        ->and($tool->getActiveName())->toBe($tiptapName)
        ->and($tool->getIcon())->toBe($icon)
        ->and($tool->getScope())->toBe($scope)
        ->and($tool->getLabel())->not->toStartWith('rich-editor-plus::');
})->with('core plugins');

it('opens the link modal instead of running a command', function (): void {
    $plugin = LinkPlugin::make();
    $tool = $plugin->getTools()[0];

    expect($tool->getAction())->toBe('link')
        ->and($tool->getCommand())->toBeNull()
        ->and($plugin->getActions())->toHaveCount(1)
        ->and($plugin->getActions()[0]->getName())->toBe('link');
});

it('uses icons that exist in the mdi set', function (string $class, string $id, string $tiptapName, ?string $command, string $icon): void {
    expect(svg($icon)->toHtml())->toContain('<svg');
})->with('core plugins');

it('configures the link plugin for both sides', function (): void {
    $plugin = LinkPlugin::make()->protocols(['https'])->defaultProtocol('https')->openInNewTab(false)->autolink(false);

    expect($plugin->getJsExtension()->getOptions())->toBe([
        'protocols' => ['https'],
        'defaultProtocol' => 'https',
        'autolink' => false,
        'HTMLAttributes' => [],
    ]);

    expect(RichContentPlusRenderer::make(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'x', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'tel:1']]]],
    ]]]])->plugins([$plugin])->toHtml())->not->toContain('tel:');
});

it('opens links in a new tab by default', function (): void {
    expect(LinkPlugin::make()->getJsExtension()->getOptions()['HTMLAttributes'])
        ->toBe(['target' => '_blank', 'rel' => 'noopener noreferrer nofollow']);
});

dataset('block plugins', [
    'blockquote' => [BlockquotePlugin::class, 'core/blockquote', 'blockquote', 'blockquote', 'setBlockquote', 'mdi-format-quote-open', true],
    'heading' => [HeadingPlugin::class, 'core/heading', 'heading2', 'heading', 'setHeading', 'mdi-format-header-2', true],
    'bullet list' => [BulletListPlugin::class, 'core/bullet-list', 'bulletList', 'bulletList', 'toggleBulletList', 'mdi-format-list-bulleted', true],
    'ordered list' => [OrderedListPlugin::class, 'core/ordered-list', 'orderedList', 'orderedList', 'toggleOrderedList', 'mdi-format-list-numbered', true],
    'code block' => [CodeBlockPlugin::class, 'core/code-block', 'codeBlock', 'codeBlock', 'setCodeBlock', 'mdi-code-braces', true],
    'divider' => [DividerPlugin::class, 'core/divider', 'divider', 'horizontalRule', 'setHorizontalRule', 'mdi-minus', false],
    'paragraph' => [DocumentPlugin::class, 'core/document', 'paragraph', 'paragraph', 'setParagraph', 'mdi-format-paragraph', true],
]);

it('declares its block type', function (string $class, string $id, string $name, string $node, string $command, string $icon, bool $switchable): void {
    $plugin = $class::make();
    $blockType = $plugin->getBlockTypes()[0];

    expect($plugin->getId())->toBe($id)
        ->and($plugin->getJsExtension()->getId())->toBe($id)
        ->and($blockType->getName())->toBe($name)
        ->and($blockType->getNodeName())->toBe($node)
        ->and($blockType->getCommand())->toBe($command)
        ->and($blockType->getIcon())->toBe($icon)
        ->and($blockType->isSwitchable())->toBe($switchable)
        ->and($blockType->getLabel())->not->toStartWith('rich-editor-plus::')
        ->and($blockType->getDescription())->not->toStartWith('rich-editor-plus::')
        ->and(svg($icon)->toHtml())->toContain('<svg');
})->with('block plugins');

it('has no blockquote toolbar button any more', function (): void {
    $names = collect(BlockquotePlugin::make()->getTools())->map->getName()->all();

    expect($names)->toBe(['blockquoteDecreaseLevel', 'blockquoteIncreaseLevel']);
});

it('offers one block type per configured heading level on both sides', function (): void {
    $plugin = HeadingPlugin::make()->levels([1, 4]);

    expect(array_map(fn ($type): string => $type->getName(), $plugin->getBlockTypes()))->toBe(['heading1', 'heading4'])
        ->and($plugin->getBlockTypes()[1]->getNodeAttributes())->toBe(['level' => 4])
        ->and($plugin->getBlockTypes()[1]->getArguments())->toBe([['level' => 4]])
        ->and($plugin->getJsExtension()->getOptions())->toBe(['levels' => [1, 4]])
        ->and($plugin->getNodes()[0]->match(heading4Element()))->not->toBeNull();
});

it('uses heading levels 2 and 3 by default', function (): void {
    expect(HeadingPlugin::make()->getJsExtension()->getOptions())->toBe(['levels' => [2, 3]]);
});

it('uses an icon that exists for every heading level', function (int $level): void {
    expect(svg(HeadingPlugin::make()->levels([$level])->getBlockTypes()[0]->getIcon())->toHtml())->toContain('<svg');
})->with([1, 2, 3, 4, 5, 6]);

it('turns every new block on by default and removes each one by class name', function (string $class, string $id): void {
    expect(RichEditorPlus::make('content')->getPluginRegistry()->has($id))->toBeTrue()
        ->and(RichEditorPlus::make('content')->withoutPlugins([$class])->getPluginRegistry()->has($id))->toBeFalse();
})->with([
    [HeadingPlugin::class, 'core/heading'],
    [BulletListPlugin::class, 'core/bullet-list'],
    [OrderedListPlugin::class, 'core/ordered-list'],
    [CodeBlockPlugin::class, 'core/code-block'],
    [DividerPlugin::class, 'core/divider'],
]);

it('keeps list items when only one list plugin is removed', function (string $removed): void {
    $names = array_map(
        fn ($node): string => $node->getName(),
        RichEditorPlus::make('content')->withoutPlugins([$removed])->getPluginRegistry()->getNodes(),
    );

    expect($names)->toContain('listItem');
})->with([BulletListPlugin::class, OrderedListPlugin::class]);

it('shows every block type in order by default', function (): void {
    $names = array_keys(RichEditorPlus::make('content')->getPluginRegistry()->getBlockTypesConfig());

    expect($names)->toBe(['paragraph', 'heading2', 'heading3', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'divider', 'findReplace']);
});

it('offers find and replace as a command that is not a block', function (): void {
    $blockType = FindReplacePlugin::make()->getBlockTypes()[0];

    expect($blockType->getName())->toBe('findReplace')
        ->and($blockType->getCommand())->toBe('openFindReplace')
        ->and($blockType->getNodeName())->toBeNull()
        ->and($blockType->isSwitchable())->toBeFalse()
        ->and($blockType->getKeywords())->toContain('search', 'replace');
});

it('offers find and replace in the more menu', function (): void {
    $tool = FindReplacePlugin::make()->getTools()[0];

    expect($tool->getScope())->toBe(ToolScope::Overflow)
        ->and($tool->getCommand())->toBe('openFindReplace');
});

it('renders the find panel hidden, with everything the browser binds to', function (): void {
    expect(FindReplacePlugin::make()->getEditorHtml())
        ->toContain('role="search"')
        ->toContain('data-rep-find ')
        ->toContain('hidden')
        ->toContain('data-rep-find-query')
        ->toContain('data-rep-find-replacement')
        ->toContain('data-rep-find-option="matchCase"')
        ->toContain('data-rep-find-option="wholeWord"')
        ->toContain('data-rep-find-action="findPrevious"')
        ->toContain('data-rep-find-action="findNext"')
        ->toContain('data-rep-find-action="closeFindReplace"')
        ->toContain('data-rep-find-action="replaceCurrent"')
        ->toContain('data-rep-find-action="replaceAll"')
        ->toContain('aria-live="polite"')
        ->toContain('data-rep-find-count-label=":current of :total"')
        ->toContain('data-rep-find-no-results="No results"')
        ->toContain('data-rep-find-replaced=":count replaced"');
});

it('gives every find panel control a name, and only buttons that cannot submit a form', function (): void {
    $html = FindReplacePlugin::make()->getEditorHtml();

    expect(substr_count($html, '<button'))->toBe(substr_count($html, '<button type="button"'))
        ->and(substr_count($html, 'aria-label='))->toBeGreaterThanOrEqual(8)
        ->and($html)->not->toContain(' name=');
});

it('escapes the find panel text', function (): void {
    app('translator')->addLines(['find.find' => '"><script>'], 'en', 'rich-editor-plus');

    expect(FindReplacePlugin::make()->getEditorHtml())->not->toContain('<script>');
});

it('leaves the optional plugins out of the default set', function (): void {
    expect(collect(PluginRegistry::defaultPlugins())->map->getId()->all())
        ->not->toContain('core/code', 'core/subscript', 'core/superscript');
});

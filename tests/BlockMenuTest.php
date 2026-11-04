<?php

use Hollyit\RichEditorPlus\Rendering\BlockMenuRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\Tool;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn (): mixed => PluginRegistry::flush());

function menuBlockTypes(): array
{
    return [
        BlockType::make('quote')->label('Quote')->description('Quoted text')->icon('mdi-format-quote-open')->node('blockquote')->command('setBlockquote')->switchable(),
        BlockType::make('rule')->label('Rule')->icon('mdi-minus')->node('horizontalRule')->command('setHorizontalRule'),
    ];
}

it('renders a hidden listbox with every block type', function (): void {
    $html = (new BlockMenuRenderer)->renderSlashMenu(menuBlockTypes(), 'field-1');

    expect($html)
        ->toContain('data-rep-slash-menu')
        ->toContain('role="listbox"')
        ->toContain('id="field-1-slash"')
        ->toContain('hidden')
        ->toContain('role="option"')
        ->toContain('id="field-1-slash-quote"')
        ->toContain('data-rep-block-type="quote"')
        ->toContain('data-rep-block-type="rule"')
        ->toContain('Quoted text')
        ->toContain('<svg');
});

it('renders no slash menu without block types', function (): void {
    expect((new BlockMenuRenderer)->renderSlashMenu([], 'field-1'))->toBe('');
});

it('lists only switchable types in the switcher', function (): void {
    $html = (new BlockMenuRenderer)->renderSwitcherMenu(menuBlockTypes());

    expect($html)
        ->toContain('data-rep-switcher-menu')
        ->toContain('role="menu"')
        ->toContain('role="menuitemradio"')
        ->toContain('aria-checked="false"')
        ->toContain('data-rep-block-type="quote"')
        ->not->toContain('data-rep-block-type="rule"');
});

it('offers duplicate and delete in the more menu', function (): void {
    expect((new BlockMenuRenderer)->renderMoreMenu())
        ->toContain('data-rep-more-action="selectParentBlock"')
        ->toContain('data-rep-more-action="duplicateBlock"')
        ->toContain('data-rep-more-action="deleteBlock"');
});

it('adds overflow tools to the more menu after its own items', function (): void {
    $html = (new BlockMenuRenderer)->renderMoreMenu([
        Tool::make('find')->label('Find <b>')->icon('mdi-find-replace')->command('openFindReplace')->overflow(),
    ]);

    expect($html)
        ->toContain('data-rep-more-action="openFindReplace"')
        ->toContain('Find &lt;b&gt;')
        ->not->toContain('Find <b>')
        ->and(strpos($html, 'selectParentBlock'))->toBeLessThan(strpos($html, 'openFindReplace'));
});

it('renders an overflow tool with no label or icon', function (): void {
    expect((new BlockMenuRenderer)->renderMoreMenu([Tool::make('find')->command('openFindReplace')->overflow()]))
        ->toContain('<span class="rep-menu-item-label">find</span>');
});

it('renders a polite live region with its messages', function (): void {
    expect((new BlockMenuRenderer)->renderLiveRegion())
        ->toContain('aria-live="polite"')
        ->toContain('data-rep-moved-up="')
        ->toContain('data-rep-moved-down="');
});

it('escapes block type names and labels', function (): void {
    $html = (new BlockMenuRenderer)->renderSlashMenu(
        [BlockType::make('x"><script>')->label('<b>')->description('<i>')->node('x')->command('y')],
        'field-1',
    );

    expect($html)->not->toContain('<script>')->not->toContain('<b>')->not->toContain('<i>');
});

it('falls back to the default placeholder and accepts an override', function (): void {
    expect(RichEditorPlus::make('content')->getEditorPlaceholder())->toBe('Type / for commands')
        ->and(RichEditorPlus::make('content')->placeholder('Write something')->getEditorPlaceholder())->toBe('Write something');
});

it('offers level changes and every list type in the list menu', function (): void {
    $html = (new BlockMenuRenderer)->renderListMenu([
        BlockType::make('bullets')->label('Bulleted <list>')->icon('mdi-format-list-bulleted')->node('bulletList')->listType(),
        BlockType::make('numbers')->label('Numbered')->icon('mdi-format-list-numbered')->node('orderedList')->listType(),
    ]);

    expect($html)
        ->toContain('data-rep-list-menu')
        ->toContain('data-rep-list-action="decreaseBlockLevel"')
        ->toContain('data-rep-list-action="increaseBlockLevel"')
        ->toContain('data-rep-list-type="bulletList"')
        ->toContain('data-rep-list-type="orderedList"')
        ->toContain('role="menuitemradio"')
        ->toContain('Bulleted &lt;list&gt;')
        ->not->toContain('data-rep-list-separator hidden')
        ->not->toContain('Bulleted <list>');
});

it('hides the list type section when there is only one type to choose', function (): void {
    $html = (new BlockMenuRenderer)->renderListMenu([
        BlockType::make('bullets')->label('Bulleted')->icon('mdi-format-list-bulleted')->node('bulletList')->listType(),
    ]);

    expect($html)
        ->toContain('data-rep-list-separator hidden')
        ->toContain('aria-checked="false" hidden');
});

it('has no list menu without list types', function (): void {
    expect((new BlockMenuRenderer)->renderListMenu([]))->toBe('');
});

it('marks more menu tools that stay usable while the editor is read-only', function (): void {
    $html = (new BlockMenuRenderer)->renderMoreMenu([Tool::make('src')->command('toggleSrc')->availableWhileReadOnly()->overflow(), Tool::make('other')->command('doOther')->overflow()]);

    expect($html)->toContain('data-rep-more-action="toggleSrc" data-rep-read-only-ok')
        ->and($html)->not->toContain('data-rep-more-action="doOther" data-rep-read-only-ok');
});

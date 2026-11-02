<?php

use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\StateFormat;
use Tests\TestCase;

uses(TestCase::class);

// Package tests must not depend on plugins the host app registers globally.
beforeEach(fn (): mixed => PluginRegistry::flush());

it('uses the default plugin set', function (): void {
    $ids = collect(RichEditorPlus::make('content')->getPluginRegistry()->getJsExtensions())->pluck('id')->all();

    expect($ids)->toBe([
        'core/document', 'core/bold', 'core/italic', 'core/underline', 'core/strikethrough', 'core/link', 'core/blockquote',
        'core/heading', 'core/bullet-list', 'core/ordered-list', 'core/code-block', 'core/divider', 'core/find-replace',
    ]);
});

it('replaces the default plugins', function (): void {
    $registry = RichEditorPlus::make('content')->plugins([ItalicPlugin::class])->getPluginRegistry();

    expect(array_keys($registry->getPlugins()))->toBe(['core/document', 'core/italic']);
});

it('removes plugins by class or by id', function (): void {
    $registry = RichEditorPlus::make('content')
        ->withoutPlugins([BoldPlugin::class, 'core/blockquote'])
        ->getPluginRegistry();

    expect($registry->has('core/bold'))->toBeFalse()
        ->and($registry->has('core/blockquote'))->toBeFalse()
        ->and($registry->has('core/italic'))->toBeTrue();
});

it('stores JSON by default', function (): void {
    expect(RichEditorPlus::make('content')->getStateFormat())->toBe(StateFormat::Json);
});

it('keeps plugins that are not excluded, in order', function (): void {
    $plugins = RichEditorPlus::make('content')
        ->plugins([BoldPlugin::make(), BlockquotePlugin::make()])
        ->withoutPlugins([BoldPlugin::class])
        ->getPlugins();

    expect($plugins)->toHaveCount(1)->and($plugins[0])->toBeInstanceOf(BlockquotePlugin::class);
});

it('removes every way into find and replace with its plugin', function (): void {
    $field = RichEditorPlus::make('content')->withoutPlugins(['core/find-replace']);
    $html = $field->getToolbarsHtml();

    expect($html)
        ->not->toContain('data-rep-find')
        ->not->toContain('openFindReplace')
        ->not->toContain('findReplace')
        ->and($field->getPluginRegistry()->getBlockTypesConfig())->not->toHaveKey('findReplace')
        ->and(collect($field->getPluginRegistry()->getJsExtensions())->pluck('id'))->not->toContain('core/find-replace');
});

it('offers find and replace in the slash menu and more menu, but not the switcher', function (): void {
    $html = RichEditorPlus::make('content')->getToolbarsHtml();

    expect($html)
        ->toContain('data-rep-block-type="findReplace"')
        ->toContain('data-rep-more-action="openFindReplace"')
        ->and(substr_count($html, 'data-rep-block-type="findReplace"'))->toBe(1);
});

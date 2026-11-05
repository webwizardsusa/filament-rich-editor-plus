<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Contracts;

use Filament\Actions\Action;
use Webwizardsusa\RichEditorPlus\Content\MarkSpec;
use Webwizardsusa\RichEditorPlus\Content\NodeSpec;
use Webwizardsusa\RichEditorPlus\Support\BlockType;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

/**
 * A plugin can own several nodes and marks end to end: its server-side schema, the JS extension that gets loaded
 * in the browser, its toolbar tools and any Filament actions it needs.
 */
interface EditorPlugin
{
    /**
     * Unique id, also used for dependency resolution, e.g. `core/heading`.
     */
    public function getId(): string;

    /**
     * Ids of plugins that must be registered for this one to work.
     *
     * @return array<string>
     */
    public function getDependencies(): array;

    /**
     * Lower numbers are registered first.
     */
    public function getPriority(): int;

    /**
     * The nodes this plugin adds, used to render and parse content on the server. A plugin that adds a node in JS must
     * declare it here too: otherwise its tag disappears from rendered output and from stored HTML, with its text kept.
     *
     * @return array<NodeSpec>
     */
    public function getNodes(): array;

    /**
     * The marks this plugin adds, on the same terms as {@see getNodes()}.
     *
     * @return array<MarkSpec>
     */
    public function getMarks(): array;

    /**
     * The TipTap JS extension that the browser must load for this plugin.
     */
    public function getJsExtension(): JsExtension;

    /**
     * @return array<Tool>
     */
    public function getTools(): array;

    /**
     * The block types this plugin offers in the slash menu and block switcher.
     *
     * @return array<BlockType>
     */
    public function getBlockTypes(): array;

    /**
     * @return array<Action>
     */
    public function getActions(): array;

    /**
     * Markup rendered inside the editor, once per editor, for a panel the plugin's JS binds. It isn't rendered on a
     * disabled field. It goes on the page as it is, so the plugin must escape what it returns.
     */
    public function getEditorHtml(): ?string;
}

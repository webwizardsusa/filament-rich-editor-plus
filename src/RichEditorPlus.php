<?php

namespace Hollyit\RichEditorPlus;

use Closure;
use Filament\Actions\Action;
use Filament\Forms\Components\Concerns\HasPlaceholder;
use Filament\Forms\Components\Field;
use Filament\Schemas\Components\StateCasts\Contracts\StateCast;
use Filament\Support\Components\Attributes\ExposedLivewireMethod;
use Filament\Support\Components\Contracts\HasEmbeddedView;
use Hollyit\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\MentionPlugin;
use Hollyit\RichEditorPlus\Rendering\BlockMenuRenderer;
use Hollyit\RichEditorPlus\Rendering\ToolbarRenderer;
use Hollyit\RichEditorPlus\StateCasts\RichEditorPlusStateCast;
use Hollyit\RichEditorPlus\Support\EditorCommand;
use Hollyit\RichEditorPlus\Support\MentionItem;
use Hollyit\RichEditorPlus\Support\MentionProvider;
use Hollyit\RichEditorPlus\Support\PluginExtension;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use Hollyit\RichEditorPlus\Support\StateFormat;
use Hollyit\RichEditorPlus\Support\ToolbarPlacement;
use Illuminate\Support\Js;
use Livewire\Attributes\Renderless;

class RichEditorPlus extends Field implements HasEmbeddedView
{
    use HasPlaceholder;

    /**
     * @var array<EditorPlugin | class-string<EditorPlugin>> | Closure | null
     */
    protected array|Closure|null $plugins = null;

    /**
     * @var array<string> | Closure
     */
    protected array|Closure $excludedPlugins = [];

    /**
     * @var array<EditorPlugin | class-string<EditorPlugin>> | Closure
     */
    protected array|Closure $additionalPlugins = [];

    protected StateFormat|Closure $stateFormat = StateFormat::Html;

    /**
     * @var array<string | array<string>> | Closure | null
     */
    protected array|Closure|null $toolbarTools = null;

    protected bool|Closure $hasFloatingToolbar = true;

    protected bool|Closure $hasFixedToolbar = false;

    protected bool|Closure $isFixedToolbarSticky = true;

    /**
     * @var array<string | array<string>> | Closure | null
     */
    protected array|Closure|null $fixedToolbarTools = null;

    protected bool|Closure $isToolbarOnlyListed = false;

    protected bool|Closure $isFixedToolbarOnlyListed = false;

    protected bool|Closure $inheritsToolbarTools = true;

    /**
     * Replaces the default plugin set. Each entry is a plugin instance or class name.
     *
     * @param  array<EditorPlugin | class-string<EditorPlugin>> | Closure | null  $plugins
     */
    public function plugins(array|Closure|null $plugins): static
    {
        $this->plugins = $plugins;

        return $this;
    }

    /**
     * Adds plugins to the set, whether that is the defaults or the list given to `plugins()`. A plugin replaces
     * one with the same id, so this is also how to configure a default plugin differently for one field.
     *
     * @param  array<EditorPlugin | class-string<EditorPlugin>> | Closure  $plugins
     */
    public function addPlugins(array|Closure $plugins): static
    {
        $this->additionalPlugins = $plugins;

        return $this;
    }

    /**
     * Adds plugins to the default set of every editor. Call it from a service provider, in the app or in a
     * package that provides plugins.
     *
     * @param  array<EditorPlugin | class-string<EditorPlugin> | Closure>  $plugins
     */
    public static function registerDefaultPlugins(array $plugins): void
    {
        PluginRegistry::registerDefaultPlugins($plugins);
    }

    /**
     * Adds tools, actions, server-side extensions or JS modules to an existing plugin, by plugin id or class.
     *
     * @param  string | class-string<EditorPlugin>  $plugin
     * @param  Closure(PluginExtension, EditorPlugin): mixed  $callback
     */
    public static function extendPlugin(string $plugin, Closure $callback): void
    {
        PluginRegistry::extendPlugin(
            class_exists($plugin) ? PluginRegistry::resolvePlugin($plugin)->getId() : $plugin,
            $callback,
        );
    }

    /**
     * Removes plugins from the set, by class name or plugin id.
     *
     * @param  array<string> | Closure  $plugins
     */
    public function withoutPlugins(array|Closure $plugins): static
    {
        $this->excludedPlugins = $plugins;

        return $this;
    }

    /**
     * Chooses what the floating toolbar shows and in what order, by name. Each inner array is a group, with a
     * divider between groups; a flat list is one group. A list of tool names only arranges the formatting tools,
     * and the controls stay where they are. Naming a control (`dragHandle`, `blockSwitcher`, `moveUp`, `moveDown`,
     * `listOptions`, `more`) or the `blockTools` slot makes the list the whole toolbar, so only what it names is
     * shown. Tools left out are hidden, though their keyboard shortcuts still work (remove the plugin with
     * `withoutPlugins()` to drop those too), and names the field doesn't have are skipped. `null` keeps the default
     * layout and the plugins' own order.
     *
     * Pass `onlyListed: true` to make the list the whole toolbar even when it names no control, for example a
     * floating toolbar with formatting tools only. A list that shows nothing renders no toolbar.
     *
     * @param  array<string | array<string>> | Closure | null  $tools
     */
    public function toolbarTools(array|Closure|null $tools, bool|Closure $onlyListed = false): static
    {
        $this->toolbarTools = $tools;
        $this->isToolbarOnlyListed = $onlyListed;

        return $this;
    }

    /**
     * @return ?array<int, array<string>>
     */
    public function getToolbarTools(): ?array
    {
        return $this->normalizeToolbarGroups($this->evaluate($this->toolbarTools));
    }

    public function isToolbarOnlyListed(): bool
    {
        return (bool) $this->evaluate($this->isToolbarOnlyListed);
    }

    /**
     * Shows the toolbar that floats above the selection. It is on by default.
     */
    public function floatingToolbar(bool|Closure $condition = true): static
    {
        $this->hasFloatingToolbar = $condition;

        return $this;
    }

    public function hasFloatingToolbar(): bool
    {
        return (bool) $this->evaluate($this->hasFloatingToolbar);
    }

    /**
     * Shows a toolbar above the editor, which stays in place and shows the active block's own tools in its block
     * tools section. It can be used with the floating toolbar or instead of it.
     */
    public function fixedToolbar(bool|Closure $condition = true): static
    {
        $this->hasFixedToolbar = $condition;

        return $this;
    }

    public function hasFixedToolbar(): bool
    {
        return (bool) $this->evaluate($this->hasFixedToolbar);
    }

    /**
     * Keeps the fixed toolbar at the top of the screen while the editor scrolls past, below a Filament panel's
     * topbar. It is on by default, and has no effect inside a container that scrolls on its own, such as a modal.
     */
    public function stickyFixedToolbar(bool|Closure $condition = true): static
    {
        $this->isFixedToolbarSticky = $condition;

        return $this;
    }

    public function isFixedToolbarSticky(): bool
    {
        return (bool) $this->evaluate($this->isFixedToolbarSticky);
    }

    /**
     * Chooses what the fixed toolbar shows, the same way `toolbarTools()` does for the floating one. With no tools it
     * uses the floating arrangement, `onlyListed` flag included, or with `inherit: false` its own default layout,
     * so a formatting-only bubble can sit next to a full fixed toolbar. The drag handle is never shown in the fixed
     * toolbar. `onlyListed: true` makes the list the whole toolbar even when it names no control.
     *
     * @param  array<string | array<string>> | Closure | null  $tools
     */
    public function fixedToolbarTools(array|Closure|null $tools = null, bool|Closure $onlyListed = false, bool|Closure $inherit = true): static
    {
        $this->fixedToolbarTools = $tools;
        $this->isFixedToolbarOnlyListed = $onlyListed;
        $this->inheritsToolbarTools = $inherit;

        return $this;
    }

    /**
     * @return ?array<int, array<string>>
     */
    public function getFixedToolbarTools(): ?array
    {
        $tools = $this->evaluate($this->fixedToolbarTools);

        if ($tools !== null) {
            return $this->normalizeToolbarGroups($tools);
        }

        return $this->inheritsToolbarTools() ? $this->getToolbarTools() : null;
    }

    public function isFixedToolbarOnlyListed(): bool
    {
        if ($this->evaluate($this->fixedToolbarTools) !== null) {
            return (bool) $this->evaluate($this->isFixedToolbarOnlyListed);
        }

        return $this->inheritsToolbarTools() && $this->isToolbarOnlyListed();
    }

    /**
     * Whether a fixed toolbar with no tools of its own uses the floating toolbar's arrangement.
     */
    public function inheritsToolbarTools(): bool
    {
        return (bool) $this->evaluate($this->inheritsToolbarTools);
    }

    /**
     * @param  ?array<string | array<string>>  $tools
     * @return ?array<int, array<string>>
     */
    protected function normalizeToolbarGroups(?array $tools): ?array
    {
        if ($tools === null) {
            return null;
        }

        if (array_filter($tools, is_array(...)) === []) {
            return [array_values($tools)];
        }

        return array_map(
            static fn (string|array $group): array => array_values((array) $group),
            array_values($tools),
        );
    }

    public function storeAs(StateFormat|Closure $format): static
    {
        $this->stateFormat = $format;

        return $this;
    }

    public function getStateFormat(): StateFormat
    {
        return $this->evaluate($this->stateFormat);
    }

    /**
     * @return array<EditorPlugin>
     */
    public function getPlugins(): array
    {
        $plugins = PluginRegistry::mergePlugins(
            $this->evaluate($this->plugins) ?? PluginRegistry::defaultPlugins(),
            $this->evaluate($this->additionalPlugins),
        );

        $excluded = $this->evaluate($this->excludedPlugins);

        return array_values(array_filter(
            $plugins,
            static function (EditorPlugin $plugin) use ($excluded): bool {
                foreach ($excluded as $exclusion) {
                    if ($plugin->getId() === $exclusion || $plugin instanceof $exclusion) {
                        return false;
                    }
                }

                return true;
            },
        ));
    }

    public function getPluginRegistry(): PluginRegistry
    {
        return PluginRegistry::make($this->getPlugins());
    }

    /**
     * The Filament actions the plugins need, such as the link modal.
     *
     * @return array<Action>
     */
    public function getDefaultActions(): array
    {
        return $this->getPluginRegistry()->getActions();
    }

    /**
     * Runs TipTap commands in the browser on this field's editor, after restoring the given selection.
     *
     * @param  array<EditorCommand>  $commands
     * @param  ?array<string, mixed>  $editorSelection
     */
    public function runCommands(array $commands, ?array $editorSelection = null): void
    {
        $key = $this->getKey();
        $livewire = $this->getLivewire();

        $livewire->dispatch(
            'run-rich-editor-plus-commands',
            awaitSchemaComponent: $key,
            livewireId: $livewire->getId(),
            key: $key,
            editorSelection: $editorSelection,
            commands: array_map(static fn (EditorCommand $command): array => $command->toArray(), $commands),
        );
    }

    /**
     * The field's Livewire state is one JSON (or HTML) string; see {@see RichEditorPlusStateCast}.
     *
     * @return array<StateCast>
     */
    public function getDefaultStateCasts(): array
    {
        return [
            ...parent::getDefaultStateCasts(),
            app(RichEditorPlusStateCast::class, ['richEditor' => $this]),
        ];
    }

    /**
     * Where the Alpine component is loaded from: the Vite dev server while it is running, otherwise the built
     * asset that `filament:assets` copies into `public/js`.
     */
    public function getAlpineComponentSrc(): string
    {
        return RichEditorPlusServiceProvider::moduleUrl();
    }

    /**
     * @return array<string, MentionProvider>
     */
    public function getMentionProviders(): array
    {
        $plugin = $this->getPluginRegistry()->getPlugins()[MentionPlugin::ID] ?? null;

        if (! $plugin instanceof MentionPlugin) {
            return [];
        }

        return array_map(fn (MentionProvider $provider): MentionProvider => $provider->field($this), $plugin->getProviders());
    }

    /**
     * Search results for the mention dropdown. An unknown trigger finds nothing, so a crafted request cannot reach
     * another provider, and a failing provider is reported rather than interrupting whoever is typing.
     *
     * @return array<int, array{id: string, label: string, description: ?string, avatar: ?string}>
     */
    #[ExposedLivewireMethod]
    #[Renderless]
    public function getMentionResultsForJs(?string $query = null, string $trigger = ''): array
    {
        $provider = $this->getMentionProviders()[$trigger] ?? null;

        if (! $provider || $this->isDisabled()) {
            return [];
        }

        return rescue(
            static fn (): array => array_map(
                static fn (MentionItem $item): array => $item->toArray(),
                $provider->getResults($query ?? ''),
            ),
            [],
        );
    }

    /**
     * Passes a request from the editor's JS to the plugin with that id, when it answers editor requests. An unknown
     * plugin, one without the contract, or a failure answers nothing.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<array-key, mixed>
     */
    #[ExposedLivewireMethod]
    public function answerPluginRequestForJs(string $plugin, string $request, array $payload = []): array
    {
        $instance = $this->getPluginRegistry()->getPlugins()[$plugin] ?? null;

        if (! $instance instanceof AnswersEditorRequests) {
            return [];
        }

        return rescue(fn (): array => $instance->answerEditorRequest($request, $payload, $this), [], report: false);
    }

    /**
     * Current labels for the mentions in a document, keyed by trigger then id, at most 100 ids per trigger.
     *
     * @param  array<string, array<string>>  $idsByTrigger
     * @return array<string, array<string, string>>
     */
    #[ExposedLivewireMethod]
    #[Renderless]
    public function getMentionLabelsForJs(array $idsByTrigger = []): array
    {
        $providers = $this->getMentionProviders();
        $labels = [];

        foreach ($idsByTrigger as $trigger => $ids) {
            $provider = $providers[$trigger] ?? null;

            if ($provider && is_array($ids)) {
                $ids = array_slice(array_map('strval', array_filter($ids, is_scalar(...))), 0, 100);
                $labels[$trigger] = rescue(static fn (): array => $provider->getLabels($ids), []);
            }
        }

        return $labels;
    }

    /**
     * What an empty block shows: the field's placeholder, or the hint for the slash menu.
     */
    public function getEditorPlaceholder(): string
    {
        return $this->getPlaceholder() ?? __('rich-editor-plus::blocks.placeholder');
    }

    /**
     * @param  ?string  $idPrefix  makes the slash menu's option ids unique on the page; defaults to the field's name
     */
    public function getToolbarsHtml(?string $idPrefix = null): string
    {
        $registry = $this->getPluginRegistry();
        $toolbarRenderer = new ToolbarRenderer;
        $menuRenderer = new BlockMenuRenderer;

        $blockTypes = $registry->getBlockTypes();

        $listTypes = $registry->getListTypes();

        $html = '';

        if ($this->hasFloatingToolbar()) {
            $layout = $registry->getToolbarLayout($this->getToolbarTools(), ToolbarPlacement::Floating, $this->isToolbarOnlyListed());

            if (! $layout->isEmpty()) {
                foreach (['*' => [], ...$registry->getBlockToolbars()] as $node => $tools) {
                    $html .= $toolbarRenderer->renderBlockToolbar($node, $tools, [], $listTypes !== [], $layout);
                }
            }
        }

        $html .= $menuRenderer->renderSlashMenu($blockTypes, $idPrefix ?? $this->getName());

        if ($this->getMentionProviders() !== []) {
            $html .= $menuRenderer->renderMentionMenu($idPrefix ?? $this->getName());
        }

        return $html
            .$menuRenderer->renderSwitcherMenu($blockTypes)
            .$menuRenderer->renderMoreMenu($registry->getOverflowTools())
            .$menuRenderer->renderListMenu($listTypes)
            .$menuRenderer->renderToolMenus($registry->getMenuTools())
            .$menuRenderer->renderLiveRegion()
            .$registry->getEditorHtml();
    }

    /**
     * The plugins' CSS for the content, such as palette classes. Rendered also when the field is disabled, since the
     * content still shows. Plugins validate what they return, so it is printed as it is.
     */
    public function getEditorStylesHtml(): string
    {
        $styles = $this->getPluginRegistry()->getEditorStyles();

        return $styles === '' ? '' : '<style data-rep-editor-styles>'.$styles.'</style>';
    }

    /**
     * The toolbar above the editor, or nothing when the field has none. A disabled field still shows it, with every
     * button disabled, so the field keeps its shape. It hides with the editor when the editor cannot load.
     */
    public function getFixedToolbarHtml(): string
    {
        if (! $this->hasFixedToolbar()) {
            return '';
        }

        $registry = $this->getPluginRegistry();
        $layout = $registry->getToolbarLayout($this->getFixedToolbarTools(), ToolbarPlacement::Fixed, $this->isFixedToolbarOnlyListed());

        if ($layout->isEmpty()) {
            return '';
        }

        return (new ToolbarRenderer)->renderFixedToolbar(
            $layout,
            $registry->getBlockToolGroups(),
            $registry->getListTypes() !== [],
            $this->isFixedToolbarSticky(),
            $this->isDisabled(),
            'x-show="! error"',
        );
    }

    public function toEmbeddedHtml(): string
    {
        $id = $this->getId();
        $isDisabled = $this->isDisabled();
        $statePath = $this->getStatePath();

        ob_start(); ?>

        <div
            aria-labelledby="<?= e($id) ?>-label"
            id="<?= e($id) ?>"
            role="group"
            x-load
            x-load-src="<?= e($this->getAlpineComponentSrc()) ?>"
            x-data="richEditorPlusComponent({
                            blockTypes: <?= Js::from($this->getPluginRegistry()->getBlockTypesConfig()) ?>,
                            contentErrorMessage: <?= Js::from(__('rich-editor-plus::errors.content_invalid')) ?>,
                            extensions: <?= Js::from($this->getPluginRegistry()->getJsExtensions()) ?>,
                            format: <?= Js::from($this->getStateFormat()->value) ?>,
                            isDisabled: <?= Js::from($isDisabled) ?>,
                            isLiveDebounced: <?= Js::from($this->isLiveDebounced()) ?>,
                            isLiveOnBlur: <?= Js::from($this->isLiveOnBlur()) ?>,
                            key: <?= Js::from($this->getKey()) ?>,
                            loadErrorMessage: <?= Js::from(__('rich-editor-plus::errors.plugins_failed')) ?>,
                            liveDebounce: <?= Js::from($this->getNormalizedLiveDebounce()) ?>,
                            livewireId: <?= Js::from($this->getLivewire()->getId()) ?>,
                            tools: <?= Js::from($this->getPluginRegistry()->getToolsConfig()) ?>,
                            placeholder: <?= Js::from($this->getEditorPlaceholder()) ?>,
                            state: $wire.<?= $this->applyStateBindingModifiers("\$entangle('{$statePath}')", isOptimisticallyLive: false) ?>,
                        })"
            wire:ignore
            wire:key="<?= e($this->getLivewireKey()) ?>.<?= substr(md5(serialize([$isDisabled, $this->hasFloatingToolbar(), $this->hasFixedToolbar(), $this->isFixedToolbarSticky(), $this->getToolbarTools(), $this->getFixedToolbarTools(), $this->isToolbarOnlyListed(), $this->isFixedToolbarOnlyListed(), $this->inheritsToolbarTools()])), 0, 64) ?>"
            class="rep-editor"
        >
            <p x-show="error" x-text="error" class="rep-error" role="alert" style="display: none"></p>
            <?= $this->getEditorStylesHtml() ?>
            <?= $this->getFixedToolbarHtml() ?>
            <div x-ref="editor" x-show="! error"></div>
            <?= $isDisabled ? '' : $this->getToolbarsHtml($id) ?>
        </div>

        <?php return $this->wrapEmbeddedHtml(
            $this->wrapInputHtml((string) ob_get_clean()),
            labelTag: 'div',
        );
    }
}

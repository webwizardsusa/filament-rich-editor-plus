<?php

namespace Webwizardsusa\RichEditorPlus;

use Closure;
use Filament\Actions\Action;
use Filament\Forms\Components\Concerns\HasFileAttachments;
use Filament\Forms\Components\Concerns\HasPlaceholder;
use Filament\Forms\Components\Field;
use Filament\Schemas\Components\StateCasts\Contracts\StateCast;
use Filament\Support\Components\Attributes\ExposedLivewireMethod;
use Filament\Support\Components\Contracts\HasEmbeddedView;
use Illuminate\Support\Arr;
use Illuminate\Support\Js;
use InvalidArgumentException;
use Livewire\Attributes\Renderless;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Webwizardsusa\RichEditorPlus\Content\Contracts\ContentFormat;
use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AcceptsEditorUploads;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ChecksFieldPlugins;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\InheritsFieldFileAttachments;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesContentFormat;
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\Rendering\BlockMenuRenderer;
use Webwizardsusa\RichEditorPlus\Rendering\ToolbarRenderer;
use Webwizardsusa\RichEditorPlus\StateCasts\RichEditorPlusStateCast;
use Webwizardsusa\RichEditorPlus\Support\EditorCommand;
use Webwizardsusa\RichEditorPlus\Support\MentionItem;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginExtension;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Support\StateFormat;
use Webwizardsusa\RichEditorPlus\Support\ToolbarPlacement;

class RichEditorPlus extends Field implements HasEmbeddedView
{
    use HasFileAttachments;
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

    protected StateFormat|ContentFormat|Closure $stateFormat = StateFormat::Html;

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
     * The registry while {@see toEmbeddedHtml()} runs, and null otherwise.
     */
    protected ?PluginRegistry $renderingPluginRegistry = null;

    protected function setUp(): void
    {
        parent::setUp();

        // Filament's defaults for these would override every plugin's own; unset, each plugin keeps its default.
        $this->fileAttachmentsAcceptedFileTypes = null;
        $this->fileAttachmentsMaxSize = null;

        $this->rule(
            static fn (RichEditorPlus $component): Closure => static function (string $attribute, mixed $value, Closure $fail) use ($component): void {
                try {
                    app(RichEditorPlusStateCast::class, ['richEditor' => $component])->get($value);
                } catch (UnsupportedContentFormatException) {
                    $fail(__('rich-editor-plus::errors.content_unsupported'));
                }
            },
            static fn (RichEditorPlus $component): bool => $component->getContentFormat() !== null,
        );
    }

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

    /**
     * How the field's value is stored: as a JSON document, as HTML, or in a {@see ContentFormat} such as Markdown. With
     * a content format the editor still works on JSON, and the state cast converts.
     */
    public function storeAs(StateFormat|ContentFormat|Closure $format): static
    {
        $this->stateFormat = $format;

        return $this;
    }

    /**
     * The format of the Livewire state: always JSON when a content format is set.
     */
    public function getStateFormat(): StateFormat
    {
        $format = $this->evaluate($this->stateFormat);

        if ($format instanceof ContentFormat || $this->getContentFormat() !== null) {
            return StateFormat::Json;
        }

        return $format;
    }

    /**
     * The content format from `storeAs()`, else from the first explicitly added plugin that provides one.
     *
     * @throws InvalidArgumentException When `storeAs()` and a plugin choose different formats.
     */
    public function getContentFormat(): ?ContentFormat
    {
        $chosen = $this->evaluate($this->stateFormat);
        $fromPlugins = null;

        foreach ($this->getExplicitPlugins() as $plugin) {
            if ($plugin instanceof ProvidesContentFormat && ($format = $plugin->getContentFormat()) !== null) {
                $fromPlugins = $format;

                break;
            }
        }

        if (! $chosen instanceof ContentFormat) {
            return $fromPlugins;
        }

        if ($fromPlugins !== null && $fromPlugins->getId() !== $chosen->getId()) {
            throw new InvalidArgumentException("The field [{$this->getName()}] stores [{$chosen->getId()}] but a plugin chooses [{$fromPlugins->getId()}].");
        }

        return $chosen;
    }

    /**
     * The plugins given with `plugins()` and `addPlugins()`, without the defaults.
     *
     * @return array<EditorPlugin>
     */
    protected function getExplicitPlugins(): array
    {
        return array_map(
            PluginRegistry::resolvePlugin(...),
            [...($this->evaluate($this->plugins) ?? []), ...($this->evaluate($this->additionalPlugins) ?? [])],
        );
    }

    /**
     * @return array<EditorPlugin>
     */
    public function getPlugins(): array
    {
        $defaults = null;

        if ($this->evaluate($this->plugins) === null) {
            $defaults = PluginRegistry::defaultPlugins();
            $format = $this->getContentFormat();

            if ($format !== null) {
                $unsupported = $format->unsupportedPlugins($defaults);
                $defaults = array_values(array_filter($defaults, static fn (EditorPlugin $plugin): bool => ! in_array($plugin, $unsupported, true)));
            }
        }

        $plugins = PluginRegistry::mergePlugins(
            $this->evaluate($this->plugins) ?? $defaults,
            $this->evaluate($this->additionalPlugins),
        );

        $excluded = $this->evaluate($this->excludedPlugins);
        $fileAttachments = $this->getFileAttachmentsDefaults();

        return array_values(array_map(
            static fn (EditorPlugin $plugin): EditorPlugin => $plugin instanceof InheritsFieldFileAttachments && $fileAttachments !== []
                ? $plugin->withFieldFileAttachments($fileAttachments)
                : $plugin,
            array_filter(
                $plugins,
                static function (EditorPlugin $plugin) use ($excluded): bool {
                    foreach ($excluded as $exclusion) {
                        if ($plugin->getId() === $exclusion || $plugin instanceof $exclusion) {
                            return false;
                        }
                    }

                    return true;
                },
            ),
        ));
    }

    /**
     * The Filament attachment settings given to this field, which plugins that store files take as defaults (see
     * {@see InheritsFieldFileAttachments}). Settings that were not given are missing.
     *
     * @return array{disk?: string, directory?: string, visibility?: string, maxSize?: int, acceptedFileTypes?: array<string>, uploads?: bool}
     */
    public function getFileAttachmentsDefaults(): array
    {
        $acceptedFileTypes = $this->getFileAttachmentsAcceptedFileTypes();

        return array_filter([
            'disk' => $this->evaluate($this->fileAttachmentsDiskName),
            'directory' => $this->getFileAttachmentsDirectory(),
            'visibility' => $this->evaluate($this->fileAttachmentsVisibility),
            'maxSize' => $this->getFileAttachmentsMaxSize(),
            'acceptedFileTypes' => $acceptedFileTypes === null ? null : array_values($acceptedFileTypes),
            'uploads' => $this->evaluate($this->hasFileAttachments),
        ], static fn (mixed $value): bool => $value !== null);
    }

    public function getPluginRegistry(): PluginRegistry
    {
        return $this->renderingPluginRegistry ?? $this->buildPluginRegistry();
    }

    /**
     * A new registry from the field's current configuration. Closures can answer differently as the form's state
     * changes, so the registry is only kept while one render runs (see {@see toEmbeddedHtml()}).
     */
    protected function buildPluginRegistry(): PluginRegistry
    {
        $plugins = $this->getPlugins();
        $format = $this->getContentFormat();

        $format?->assertSupports($plugins);

        foreach ($plugins as $plugin) {
            if ($plugin instanceof ChecksFieldPlugins) {
                $plugin->checkFieldPlugins($plugins);
            }
        }

        return PluginRegistry::make($plugins)->withoutTools($format?->getHiddenTools() ?? []);
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
     * plugin, one without the contract, or a failure answers nothing; a failure is reported.
     *
     * @param  array<array-key, mixed>  $payload
     * @return array<array-key, mixed>
     */
    #[ExposedLivewireMethod]
    #[Renderless]
    public function answerPluginRequestForJs(string $plugin, string $request, array $payload = []): array
    {
        $instance = $this->getPluginRegistry()->getPlugins()[$plugin] ?? null;

        if (! $instance instanceof AnswersEditorRequests) {
            return [];
        }

        return rescue(fn (): array => $instance->answerEditorRequest($request, $payload, $this), []);
    }

    /**
     * Filament only lets the page receive uploads under this field's `componentFileAttachments` entry when this is
     * true, so it is true exactly when a plugin takes uploads from the editor and `fileAttachments(false)` was not
     * called.
     */
    public function hasFileAttachments(?bool $default = null): bool
    {
        if ($this->evaluate($this->hasFileAttachments) === false) {
            return false;
        }

        foreach ($this->getPluginRegistry()->getPlugins() as $plugin) {
            if ($plugin instanceof AcceptsEditorUploads && $plugin->acceptsEditorUploads()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Filament's own attachment storage (its default disk and rules) is not used: plugins store the files they take.
     * Overridden without `#[ExposedLivewireMethod]` so the browser cannot call it.
     */
    public function getUploadedFileAttachmentTemporaryUrl(TemporaryUploadedFile|string|null $attachment = null): ?string
    {
        return null;
    }

    /**
     * See {@see getUploadedFileAttachmentTemporaryUrl()}.
     */
    public function saveUploadedFileAttachmentAndGetUrl(): ?string
    {
        return null;
    }

    /**
     * The file the editor uploaded under `componentFileAttachments.{statePath}.{key}`, removed from there so it is
     * taken at most once. Null for a malformed key, a disabled field, or an entry that is missing or not an upload.
     */
    public function pullTemporaryUpload(string $key): ?TemporaryUploadedFile
    {
        if (preg_match('/^[A-Za-z0-9-]{1,64}\z/', $key) !== 1) {
            return null;
        }

        $livewire = $this->getLivewire();

        if (! property_exists($livewire, 'componentFileAttachments') || ! is_array($livewire->componentFileAttachments)) {
            return null;
        }

        $attachments = $livewire->componentFileAttachments;
        $path = "{$this->getStatePath()}.{$key}";
        $file = Arr::get($attachments, $path);

        Arr::forget($attachments, $path);
        $livewire->componentFileAttachments = $attachments;

        if ($this->isDisabled() || ! $file instanceof TemporaryUploadedFile) {
            return null;
        }

        return $file;
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

    /**
     * Builds the plugin registry once for the whole render, rather than once for every part of the markup that needs it.
     */
    public function toEmbeddedHtml(): string
    {
        $this->renderingPluginRegistry = $this->buildPluginRegistry();

        try {
            return $this->renderEmbeddedHtml();
        } finally {
            $this->renderingPluginRegistry = null;
        }
    }

    protected function renderEmbeddedHtml(): string
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
                            statePath: <?= Js::from($statePath) ?>,
                            uploadingMessage: <?= Js::from(__('rich-editor-plus::uploads.uploading')) ?>,
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

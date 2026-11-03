<?php

namespace Hollyit\RichEditorPlus\Support;

use Closure;
use Filament\Actions\Action;
use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\ContentSpec;
use Hollyit\RichEditorPlus\Content\GlobalAttribute;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Hollyit\RichEditorPlus\Plugins\Contracts\PreparesRenderedContent;
use Hollyit\RichEditorPlus\Plugins\Contracts\ProvidesGlobalAttributes;
use Hollyit\RichEditorPlus\Plugins\Core\BlockquotePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BoldPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\BulletListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\CodeBlockPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DividerPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\DocumentPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\FindReplacePlugin;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\ItalicPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\LinkPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\OrderedListPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\StrikethroughPlugin;
use Hollyit\RichEditorPlus\Plugins\Core\UnderlinePlugin;
use InvalidArgumentException;
use LogicException;

/**
 * Resolves a list of plugins into the single, ordered set an editor (or renderer) works from.
 */
class PluginRegistry
{
    /**
     * Plugins that packages and the app add to every editor's default set.
     *
     * @var array<EditorPlugin | class-string<EditorPlugin> | Closure>
     */
    protected static array $registeredDefaults = [];

    /**
     * @var array<string, array<Closure>>
     */
    protected static array $extenders = [];

    /**
     * @var array<string, EditorPlugin>
     */
    protected array $plugins = [];

    /**
     * @var array<string, PluginExtension>
     */
    protected array $extensions = [];

    /**
     * @param  array<EditorPlugin | class-string<EditorPlugin>>  $plugins
     */
    public function __construct(array $plugins)
    {
        foreach ($plugins as $plugin) {
            $plugin = static::resolvePlugin($plugin);

            if (array_key_exists($plugin->getId(), $this->plugins)) {
                throw new InvalidArgumentException("The editor plugin [{$plugin->getId()}] is registered more than once.");
            }

            $this->plugins[$plugin->getId()] = $plugin;
        }

        if (! array_key_exists(DocumentPlugin::ID, $this->plugins)) {
            $this->plugins[DocumentPlugin::ID] = DocumentPlugin::make();
        }

        $this->assertDependenciesAreMet();
        $this->sortByPriority();
        $this->collectExtensions();
        $this->assertToolNamesAreNotReserved();
        $this->assertBlockTypesAreValid();
    }

    /**
     * @param  array<EditorPlugin | class-string<EditorPlugin>>  $plugins
     */
    public static function make(array $plugins): static
    {
        return new static($plugins);
    }

    /**
     * @param  EditorPlugin | class-string<EditorPlugin>  $plugin
     */
    public static function resolvePlugin(EditorPlugin|string $plugin): EditorPlugin
    {
        if (! is_string($plugin)) {
            return $plugin;
        }

        return method_exists($plugin, 'make') ? $plugin::make() : app($plugin);
    }

    /**
     * Adds plugins to the default set of every editor, for packages and the app to call from a service provider.
     * A registered plugin replaces a default with the same id.
     *
     * @param  array<EditorPlugin | class-string<EditorPlugin> | Closure>  $plugins  a Closure may return one plugin or a list
     */
    public static function registerDefaultPlugins(array $plugins): void
    {
        static::$registeredDefaults = [...static::$registeredDefaults, ...$plugins];
    }

    /**
     * Adds to an existing plugin, by plugin id, without subclassing it. The callback receives a
     * {@see PluginExtension} to add tools, actions, server-side extensions and JS modules to, and the plugin.
     *
     * @param  Closure(PluginExtension, EditorPlugin): mixed  $callback
     */
    public static function extendPlugin(string $pluginId, Closure $callback): void
    {
        static::$extenders[$pluginId][] = $callback;
    }

    public static function flush(): void
    {
        static::$registeredDefaults = [];
        static::$extenders = [];
    }

    /**
     * @return array<EditorPlugin>
     */
    public static function defaultPlugins(): array
    {
        $plugins = [
            BoldPlugin::make(),
            ItalicPlugin::make(),
            UnderlinePlugin::make(),
            StrikethroughPlugin::make(),
            LinkPlugin::make(),
            BlockquotePlugin::make(),
            HeadingPlugin::make(),
            BulletListPlugin::make(),
            OrderedListPlugin::make(),
            CodeBlockPlugin::make(),
            DividerPlugin::make(),
            FindReplacePlugin::make(),
        ];

        foreach (static::$registeredDefaults as $registered) {
            $registered = $registered instanceof Closure ? $registered() : $registered;

            $plugins = static::mergePlugins($plugins, is_array($registered) ? $registered : [$registered]);
        }

        return $plugins;
    }

    /**
     * Adds plugins to a list, replacing any already in it that has the same id.
     *
     * @param  array<EditorPlugin | class-string<EditorPlugin>>  $plugins
     * @param  array<EditorPlugin | class-string<EditorPlugin>>  $additional
     * @return array<EditorPlugin>
     */
    public static function mergePlugins(array $plugins, array $additional): array
    {
        $plugins = array_map(static::resolvePlugin(...), $plugins);

        foreach ($additional as $plugin) {
            $plugin = static::resolvePlugin($plugin);

            $replaced = false;

            foreach ($plugins as $index => $candidate) {
                if ($candidate->getId() === $plugin->getId()) {
                    $plugins[$index] = $plugin;
                    $replaced = true;

                    break;
                }
            }

            if (! $replaced) {
                $plugins[] = $plugin;
            }
        }

        return $plugins;
    }

    /**
     * @return array<string, EditorPlugin>
     */
    public function getPlugins(): array
    {
        return $this->plugins;
    }

    public function has(string $id): bool
    {
        return array_key_exists($id, $this->plugins);
    }

    /**
     * Hands every document to each plugin that prepares rendered content, in priority order, so lookups are made once
     * for the whole batch.
     *
     * @param  array<array-key, array<string, mixed>>  $documents
     * @return array<array-key, array<string, mixed>>
     */
    public function prepareRenderedContents(array $documents): array
    {
        $keys = array_keys($documents);

        foreach ($this->plugins as $plugin) {
            if (! $plugin instanceof PreparesRenderedContent) {
                continue;
            }

            $documents = $plugin->prepareRenderedContents($documents);

            if (array_keys($documents) !== $keys) {
                throw new LogicException("The editor plugin [{$plugin->getId()}] must return the documents it was given, with the same keys.");
            }
        }

        return $documents;
    }

    /**
     * Plugins can share a node, such as `listItem`, which is only registered once.
     *
     * @return array<NodeSpec>
     */
    public function getNodes(): array
    {
        return $this->uniqueByName($this->gather(
            static fn (EditorPlugin $plugin): array => $plugin->getNodes(),
            static fn (PluginExtension $extension): array => $extension->getNodes(),
        ));
    }

    /**
     * @return array<MarkSpec>
     */
    public function getMarks(): array
    {
        return $this->uniqueByName($this->gather(
            static fn (EditorPlugin $plugin): array => $plugin->getMarks(),
            static fn (PluginExtension $extension): array => $extension->getMarks(),
        ));
    }

    /**
     * @template TSpec of ContentSpec
     *
     * @param  array<TSpec>  $specs
     * @return array<TSpec>
     */
    protected function uniqueByName(array $specs): array
    {
        $unique = [];

        foreach ($specs as $spec) {
            $unique[$spec->getName()] ??= $spec;
        }

        return array_values($unique);
    }

    /**
     * Every plugin's global attributes, then those added to it with {@see extendPlugin()}, in plugin order.
     *
     * @return array<GlobalAttribute>
     */
    public function getGlobalAttributes(): array
    {
        $attributes = [];

        foreach (array_keys($this->plugins) as $id) {
            $attributes = [...$attributes, ...$this->globalAttributesOf($id)];
        }

        return $attributes;
    }

    /**
     * @return array<GlobalAttribute>
     */
    protected function globalAttributesOf(string $id): array
    {
        $plugin = $this->plugins[$id];

        return [
            ...($plugin instanceof ProvidesGlobalAttributes ? $plugin->getGlobalAttributes() : []),
            ...$this->extensions[$id]->getGlobalAttributes(),
        ];
    }

    /**
     * Each plugin's extension, followed by a `core/global-attributes` extension for the global attributes it declares
     * (other than those a TipTap extension provides), so the browser collects them in the same order as the server.
     * `'*'`, `'nodes'` and `'marks'` are resolved here, so both sides target the same types.
     *
     * @return array<array{id: string, options: array<string, mixed>, modules?: array<string>}>
     */
    public function getJsExtensions(): array
    {
        $descriptors = [];
        $nodeNames = [];
        $markNames = [];

        if ($this->getGlobalAttributes() !== []) {
            ContentSchema::fromRegistry($this);

            $nodeNames = array_map(static fn (NodeSpec $node): string => $node->getName(), $this->getNodes());
            $markNames = array_map(static fn (MarkSpec $mark): string => $mark->getName(), $this->getMarks());
        }

        foreach ($this->plugins as $id => $plugin) {
            $descriptor = $plugin->getJsExtension()->toArray();

            $modules = [...($descriptor['modules'] ?? []), ...$this->extensions[$id]->getModules()];

            if ($modules !== []) {
                $descriptor['modules'] = array_values(array_unique($modules));
            }

            $descriptors[] = $descriptor;

            $attributes = array_values(array_filter(
                $this->globalAttributesOf($id),
                static fn (GlobalAttribute $attribute): bool => ! $attribute->isProvidedByJsExtension(),
            ));

            if ($attributes === []) {
                continue;
            }

            $descriptors[] = JsExtension::make('core/global-attributes', [
                'name' => "globalAttributes:{$id}",
                'attributes' => array_map(
                    static fn (GlobalAttribute $attribute): array => [
                        ...$attribute->toArray(),
                        'types' => $attribute->resolveTypes($nodeNames, $markNames),
                    ],
                    $attributes,
                ),
            ])->toArray();
        }

        return $descriptors;
    }

    /**
     * @return array<Tool>
     */
    public function getTools(): array
    {
        return $this->gather(
            static fn (EditorPlugin $plugin): array => $plugin->getTools(),
            static fn (PluginExtension $extension): array => $extension->getTools(),
        );
    }

    /**
     * The tools for the inline (text selection) toolbar, in display order.
     *
     * @param  ?array<int, array<string>>  $groups  tool names to show, grouped and in order, in place of the plugins'
     *                                              own order and groups. Names with no inline tool are skipped.
     * @return array<Tool>
     */
    public function getInlineTools(?array $groups = null): array
    {
        $tools = array_filter(
            $this->getTools(),
            static fn (Tool $tool): bool => $tool->getScope() === ToolScope::Inline,
        );

        if ($groups === null) {
            return $this->sortTools($tools);
        }

        $toolsByName = [];

        foreach ($tools as $tool) {
            $toolsByName[$tool->getName()] = $tool;
        }

        $arranged = [];

        foreach ($groups as $index => $names) {
            foreach ($names as $name) {
                if (isset($toolsByName[$name])) {
                    // A copy, so the plugin's own tool keeps its group for any other field.
                    $arranged[] = (clone $toolsByName[$name])->group("toolbar-{$index}");
                    unset($toolsByName[$name]);
                }
            }
        }

        return $arranged;
    }

    /**
     * What a toolbar shows, grouped and in order. With no arrangement, or one that only names tools, the placement's
     * default layout is used around the formatting tools, arranged as {@see getInlineTools()} does. Naming any
     * {@see ToolbarControl}, or passing `$onlyListed`, makes the arrangement the whole layout, so only what it names
     * is shown (and a list that places nothing gives an empty layout). `$onlyListed` has no effect without groups. Each name is
     * placed once, unknown names are skipped, and the drag handle never goes in the fixed toolbar.
     *
     * @param  ?array<int, array<string>>  $groups
     */
    public function getToolbarLayout(?array $groups, ToolbarPlacement $placement, bool $onlyListed = false): ToolbarLayout
    {
        if ($groups === null || (! $onlyListed && ! $this->namesAControl($groups))) {
            return ToolbarLayout::default($placement, $this->getInlineTools($groups));
        }

        $toolsByName = [];

        foreach ($this->getInlineTools() as $tool) {
            $toolsByName[$tool->getName()] = $tool;
        }

        $placed = [];
        $layout = [];

        foreach ($groups as $index => $names) {
            $items = [];

            foreach ($names as $name) {
                if (isset($placed[$name])) {
                    continue;
                }

                $control = ToolbarControl::tryFrom($name);

                if ($control === ToolbarControl::DragHandle && $placement === ToolbarPlacement::Fixed) {
                    continue;
                }

                if ($control !== null) {
                    $items[] = $control;
                } elseif (isset($toolsByName[$name])) {
                    // A copy, so the plugin's own tool keeps its group for any other field.
                    $items[] = (clone $toolsByName[$name])->group("toolbar-{$index}");
                } else {
                    continue;
                }

                $placed[$name] = true;
            }

            if ($items !== []) {
                $layout[] = $items;
            }
        }

        return new ToolbarLayout($layout);
    }

    /**
     * @param  array<int, array<string>>  $groups
     */
    protected function namesAControl(array $groups): bool
    {
        foreach ($groups as $names) {
            foreach ($names as $name) {
                if (ToolbarControl::tryFrom($name) !== null) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * The tools for the more menu, in display order.
     *
     * @return array<Tool>
     */
    public function getOverflowTools(): array
    {
        return $this->sortTools(array_filter(
            $this->getTools(),
            static fn (Tool $tool): bool => $tool->getScope() === ToolScope::Overflow && $tool->getCommand() !== null,
        ));
    }

    /**
     * The tools for each block toolbar, keyed by node type. The `*` toolbar is the fallback for node types
     * that have no toolbar of their own; a node type's own toolbar also includes every `*` tool.
     *
     * @return array<string, array<Tool>>
     */
    public function getBlockToolbars(): array
    {
        $blockTools = array_filter(
            $this->getTools(),
            static fn (Tool $tool): bool => $tool->getScope() === ToolScope::Block,
        );

        $nodeNames = array_values(array_unique(array_merge(...array_map(
            static fn (Tool $tool): array => array_values(array_diff($tool->getNodes(), ['*'])),
            $blockTools,
        ))));

        $toolbars = [];

        foreach (['*', ...$nodeNames] as $node) {
            $tools = array_filter(
                $blockTools,
                static fn (Tool $tool): bool => in_array('*', $tool->getNodes(), true) || in_array($node, $tool->getNodes(), true),
            );

            if ($tools !== []) {
                $toolbars[$node] = $this->sortTools($tools);
            }
        }

        return $toolbars;
    }

    /**
     * The block tools for the fixed toolbar, keyed by node type. `*` holds the tools for every block and each node
     * type only its own, because the fixed toolbar shows the `*` group next to the active block's.
     *
     * @return array<string, array<Tool>>
     */
    public function getBlockToolGroups(): array
    {
        $groups = ['*' => []];

        foreach ($this->getTools() as $tool) {
            if ($tool->getScope() !== ToolScope::Block) {
                continue;
            }

            foreach (in_array('*', $tool->getNodes(), true) ? ['*'] : $tool->getNodes() as $node) {
                $groups[$node][] = $tool;
            }
        }

        return array_map($this->sortTools(...), array_filter($groups));
    }

    /**
     * What the browser needs to run a tool and to know when it is active, keyed by tool name.
     *
     * @return array<string, array{command: ?string, action: ?string, arguments: array<int, mixed>, checksAvailability: bool, hidesInListItem: bool, active: ?array{name: string, attributes: array<string, mixed>}}>
     */
    public function getToolsConfig(): array
    {
        $config = [];

        foreach ($this->getTools() as $tool) {
            $config[$tool->getName()] = [
                'command' => $tool->getCommand(),
                'action' => $tool->getAction(),
                'arguments' => $tool->getArguments(),
                'checksAvailability' => $tool->checksAvailability(),
                'hidesInListItem' => $tool->hidesInListItem(),
                'active' => $tool->getActiveName() === null ? null : [
                    'name' => $tool->getActiveName(),
                    'attributes' => (object) $tool->getActiveAttributes(),
                ],
            ];
        }

        return $config;
    }

    /**
     * Every block type, in display order.
     *
     * @return array<BlockType>
     */
    public function getBlockTypes(): array
    {
        $blockTypes = $this->gather(
            static fn (EditorPlugin $plugin): array => $plugin->getBlockTypes(),
            static fn (PluginExtension $extension): array => $extension->getBlockTypes(),
        );

        usort($blockTypes, static fn (BlockType $a, BlockType $b): int => $a->getOrder() <=> $b->getOrder());

        return $blockTypes;
    }

    /**
     * The block types a list can switch between in place.
     *
     * @return array<BlockType>
     */
    public function getListTypes(): array
    {
        return array_values(array_filter(
            $this->getBlockTypes(),
            static fn (BlockType $blockType): bool => $blockType->isListType(),
        ));
    }

    /**
     * What the browser needs to filter, recognise and run block types, keyed by name in display order.
     *
     * @return array<string, array{label: string, keywords: array<string>, node: array{name: ?string, attributes: object}, command: ?string, arguments: array<int, mixed>, action: ?string, switchable: bool, multiBlock: bool}>
     */
    public function getBlockTypesConfig(): array
    {
        $config = [];

        foreach ($this->getBlockTypes() as $blockType) {
            $config[$blockType->getName()] = [
                'label' => $blockType->getLabel(),
                'keywords' => $blockType->getKeywords(),
                'node' => [
                    'name' => $blockType->getNodeName(),
                    'attributes' => (object) $blockType->getNodeAttributes(),
                ],
                'command' => $blockType->getCommand(),
                'arguments' => $blockType->getArguments(),
                'action' => $blockType->getAction(),
                'switchable' => $blockType->isSwitchable(),
                'multiBlock' => $blockType->isMultiBlock(),
            ];
        }

        return $config;
    }

    /**
     * @return array<Action>
     */
    public function getActions(): array
    {
        return $this->gather(
            static fn (EditorPlugin $plugin): array => $plugin->getActions(),
            static fn (PluginExtension $extension): array => $extension->getActions(),
        );
    }

    /**
     * Markup the plugins want rendered inside the editor, such as a panel.
     */
    public function getEditorHtml(): string
    {
        return implode('', array_filter(array_map(
            static fn (EditorPlugin $plugin): ?string => $plugin->getEditorHtml(),
            $this->plugins,
        )));
    }

    /**
     * Gathers each plugin's own items followed by what other packages and the app added to it.
     *
     * @template TItem
     *
     * @param  Closure(EditorPlugin): array<TItem>  $fromPlugin
     * @param  Closure(PluginExtension): array<TItem>  $fromExtension
     * @return array<TItem>
     */
    protected function gather(Closure $fromPlugin, Closure $fromExtension): array
    {
        $items = [];

        foreach ($this->plugins as $id => $plugin) {
            $items = [...$items, ...$fromPlugin($plugin), ...$fromExtension($this->extensions[$id])];
        }

        return $items;
    }

    protected function collectExtensions(): void
    {
        foreach ($this->plugins as $id => $plugin) {
            $extension = new PluginExtension;

            foreach (static::$extenders[$id] ?? [] as $extender) {
                $extender($extension, $plugin);
            }

            $this->extensions[$id] = $extension;
        }
    }

    /**
     * @param  array<Tool>  $tools
     * @return array<Tool>
     */
    protected function sortTools(array $tools): array
    {
        $tools = array_values($tools);

        usort($tools, static fn (Tool $a, Tool $b): int => $a->getOrder() <=> $b->getOrder());

        return $tools;
    }

    protected function assertDependenciesAreMet(): void
    {
        foreach ($this->plugins as $plugin) {
            foreach ($plugin->getDependencies() as $dependency) {
                if (! array_key_exists($dependency, $this->plugins)) {
                    throw new LogicException("The editor plugin [{$plugin->getId()}] requires [{$dependency}], which is not registered.");
                }
            }
        }
    }

    /**
     * Toolbar arrangements place controls by name, so a tool with one of those names could never be placed.
     */
    protected function assertToolNamesAreNotReserved(): void
    {
        foreach ($this->plugins as $id => $plugin) {
            foreach ([...$plugin->getTools(), ...$this->extensions[$id]->getTools()] as $tool) {
                if (ToolbarControl::tryFrom($tool->getName()) !== null) {
                    throw new InvalidArgumentException("The editor plugin [{$id}] registers a tool named [{$tool->getName()}], which is reserved for the toolbar.");
                }
            }
        }
    }

    protected function assertBlockTypesAreValid(): void
    {
        $names = [];

        foreach ($this->getBlockTypes() as $blockType) {
            $name = $blockType->getName();

            if (array_key_exists($name, $names)) {
                throw new InvalidArgumentException("The block type [{$name}] is registered more than once.");
            }

            if ($blockType->getNodeName() === null && ($blockType->isSwitchable() || $blockType->isListType())) {
                throw new InvalidArgumentException("The block type [{$name}] must declare a node.");
            }

            if ($blockType->getCommand() === null && $blockType->getAction() === null) {
                throw new InvalidArgumentException("The block type [{$name}] needs a command or an action.");
            }

            $names[$name] = true;
        }
    }

    protected function sortByPriority(): void
    {
        uasort(
            $this->plugins,
            static fn (EditorPlugin $a, EditorPlugin $b): int => $a->getPriority() <=> $b->getPriority(),
        );
    }
}

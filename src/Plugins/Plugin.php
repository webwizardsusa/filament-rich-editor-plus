<?php

namespace Hollyit\RichEditorPlus\Plugins;

use Closure;
use Hollyit\RichEditorPlus\Plugins\Contracts\EditorPlugin;

abstract class Plugin implements EditorPlugin
{
    /**
     * @var array<class-string<Plugin>, array<Closure>>
     */
    protected static array $configurations = [];

    /**
     * Configures every plugin of this class (and its subclasses) as it is made, so a package or the app can set
     * defaults once, for example `LinkPlugin::configureUsing(fn (LinkPlugin $plugin) => $plugin->openInNewTab(false))`.
     * A plugin configured on a field afterwards still wins.
     */
    public static function configureUsing(Closure $modifier): void
    {
        static::$configurations[static::class][] = $modifier;
    }

    public static function flushConfigurations(): void
    {
        static::$configurations = [];
    }

    public static function make(): static
    {
        $plugin = app(static::class);

        foreach (static::$configurations as $class => $modifiers) {
            if (! $plugin instanceof $class) {
                continue;
            }

            foreach ($modifiers as $modifier) {
                $modifier($plugin);
            }
        }

        return $plugin;
    }

    public function getDependencies(): array
    {
        return [];
    }

    public function getPriority(): int
    {
        return 100;
    }

    public function getNodes(): array
    {
        return [];
    }

    public function getMarks(): array
    {
        return [];
    }

    public function getTools(): array
    {
        return [];
    }

    public function getBlockTypes(): array
    {
        return [];
    }

    public function getActions(): array
    {
        return [];
    }

    public function getEditorHtml(): ?string
    {
        return null;
    }
}

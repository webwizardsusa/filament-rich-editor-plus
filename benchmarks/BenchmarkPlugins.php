<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks;

use Webwizardsusa\RichEditorPlus\Benchmarks\Fixtures\BenchmarkMentionProvider;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\EditorPlugin;
use Webwizardsusa\RichEditorPlus\Plugins\Core\MentionPlugin;
use Webwizardsusa\RichEditorPlus\Support\MentionProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;

/**
 * The plugin set every strategy renders with: the editor defaults plus mentions.
 */
class BenchmarkPlugins
{
    /**
     * @return array<EditorPlugin>
     */
    public static function make(?MentionProvider $mentions = null): array
    {
        return PluginRegistry::mergePlugins(PluginRegistry::defaultPlugins(), [
            MentionPlugin::make()->providers([$mentions ?? BenchmarkMentionProvider::make()]),
        ]);
    }

    /**
     * A short hash of the plugin classes, stored with rendered rows and used in cache keys.
     *
     * @param  array<EditorPlugin>  $plugins
     */
    public static function version(array $plugins): string
    {
        $classes = array_map(static fn (EditorPlugin $plugin): string => $plugin::class, $plugins);

        return substr(hash('xxh128', implode('|', $classes)), 0, 16);
    }

    /**
     * A mention provider that needs no database, for micro-benchmarks.
     *
     * @param  array<int | string, string>  $names  `id => name`
     */
    public static function inMemoryMentions(array $names): MentionProvider
    {
        return MentionProvider::make('@')
            ->items($names)
            ->getUrlUsing(static fn (string $id): string => "/bench/mentionables/{$id}");
    }
}

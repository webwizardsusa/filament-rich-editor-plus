<?php

namespace Webwizardsusa\RichEditorPlus\Tests\Support;

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Storage;
use ReflectionClass;
use Webwizardsusa\ImageCache\ImageCacheServiceProvider;
use Webwizardsusa\RichEditorPlus\Support\PluginRegistry;
use Webwizardsusa\RichEditorPlus\Tests\Support\ImageStyles\BannerStyle;
use Webwizardsusa\RichEditorPlus\Tests\Support\ImageStyles\ThumbStyle;
use Webwizardsusa\RichEditorPlus\Tests\TestCase;

/**
 * The editor with Laravel Image Cache, for `ImagePlugin::imageCache()`: the `thumb` and `banner` Image Styles are
 * registered, the `public` and `local` disks Images go to are faked, and the image cache tables are created.
 */
abstract class ImageCacheTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        PluginRegistry::flush();
        Storage::fake('public');
        Storage::fake('local');
    }

    /**
     * @param  Application  $app
     * @return array<class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [...parent::getPackageProviders($app), ImageCacheServiceProvider::class];
    }

    /**
     * @param  Application  $app
     */
    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);

        $app['config']->set('cache.default', 'array');
        $app['config']->set('image-cache.styles', [ThumbStyle::class, BannerStyle::class]);
    }

    protected function defineDatabaseMigrations(): void
    {
        // Wherever Composer put Laravel Image Cache: vendor/ on its own, packages/ in the workbench.
        $imageCache = dirname((string) (new ReflectionClass(ImageCacheServiceProvider::class))->getFileName(), 2);

        (include $imageCache.'/database/migrations/create_image_cache_tables.php.stub')->up();
    }
}

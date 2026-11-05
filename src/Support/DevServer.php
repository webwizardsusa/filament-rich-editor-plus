<?php

namespace Webwizardsusa\RichEditorPlus\Support;

use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\Blade;

/**
 * Finds a package's running Vite dev server through the hot file its `vite.config.js` writes into `public/`.
 * Packages that ship JS for Rich Editor Plus usually get one through the `RegistersPluginAssets` trait.
 */
class DevServer
{
    /**
     * @param  string  $hotFileName  file name in `public/`, for example `my-package.hot`
     * @param  string  $entry  the JS entry, relative to the app root, for example `packages/my-package/resources/js/index.js`
     */
    public function __construct(
        protected string $hotFileName,
        protected string $entry,
    ) {}

    public function hotFilePath(): string
    {
        return public_path($this->hotFileName);
    }

    public function isRunning(): bool
    {
        return app()->isLocal() && is_file($this->hotFilePath());
    }

    /**
     * Base URL of the running Vite dev server, or null when it is not running.
     */
    public function url(): ?string
    {
        if (! $this->isRunning()) {
            return null;
        }

        return rtrim(trim((string) file_get_contents($this->hotFilePath())), '/');
    }

    public function entryUrl(): ?string
    {
        $url = $this->url();

        return $url === null ? null : "{$url}/{$this->entry}";
    }

    public function clientUrl(): ?string
    {
        $url = $this->url();

        return $url === null ? null : "{$url}/@vite/client";
    }

    /**
     * While the dev server is running, loads its HMR client in every panel.
     */
    public function registerClient(): void
    {
        if (! $this->isRunning()) {
            return;
        }

        FilamentView::registerRenderHook(
            PanelsRenderHook::HEAD_END,
            fn (): string => Blade::render(
                '<script type="module" src="{{ $src }}"></script>',
                ['src' => $this->clientUrl()],
            ),
        );
    }
}

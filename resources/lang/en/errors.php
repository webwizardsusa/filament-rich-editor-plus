<?php

return [
    'plugins_failed' => 'The editor could not load these plugins: :plugins. Your content has not been changed.',
    'plugin_assets_missing' => 'The assets for :package are not available: its Vite dev server is not running (no public/:hot) and it has not been built. Start its dev server, or build it and then run `php artisan filament:assets`.',
    'content_invalid' => 'This content uses blocks this editor does not have. It has not been changed.',
    'content_unsupported' => "This content has formatting this field can't save. Remove it and try again.",
    'bundled_assets_missing' => 'The Rich Editor Plus :name assets are not available: the Vite dev server is not running (no public/:hot) and the package has not been built. Run `npm run dev::name`, or `npm run build:rep` followed by `php artisan filament:assets`.',
];

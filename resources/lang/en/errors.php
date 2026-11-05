<?php

return [
    'plugins_failed' => 'The editor could not load these plugins: :plugins. Your content has not been changed.',
    'plugin_assets_missing' => 'The assets for :package are not available: its Vite dev server is not running (no public/:hot) and it has not been built. Start its dev server, or build it and then run `php artisan filament:assets`.',
    'content_invalid' => 'This content uses blocks this editor does not have. It has not been changed.',
    'content_unsupported' => "This content has formatting this field can't save. Remove it and try again.",
    'bundled_assets_missing' => 'The Rich Editor Plus :name assets are not available: the package\'s dist/ directory is missing and no Vite dev server is running (no public/:hot). Reinstall webwizardsusa/rich-editor-plus; when working on the package itself, run `npm run dev::name` or `npm run build`.',

    'image' => [
        'upload_missing' => 'The upload has expired or was already used. Try again.',
        'type_not_accepted' => 'This type of file can\'t be added here.',
        'too_large' => 'The file is larger than :size.',
        'uploads_disabled' => 'Uploads are turned off for images.',
        'store_failed' => 'The file couldn\'t be saved. Try again.',
    ],
];

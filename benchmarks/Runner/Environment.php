<?php

namespace Webwizardsusa\RichEditorPlus\Benchmarks\Runner;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;

class Environment
{
    /**
     * @return array{php: string, opcache: bool, jit: string, xdebug: bool, database: string, database_version: string | null, cache_store: string, git: string | null}
     */
    public static function describe(string $cacheStore): array
    {
        $git = trim(rescue(static fn (): string => Process::run('git rev-parse --short HEAD')->output(), '', false));

        return [
            'php' => PHP_VERSION,
            'opcache' => static::opcacheEnabled(),
            'jit' => (string) (ini_get('opcache.jit') ?: 'off'),
            'xdebug' => extension_loaded('xdebug'),
            'database' => DB::connection()->getDriverName(),
            'database_version' => rescue(static fn (): string => (string) DB::connection()->getServerVersion(), null, false),
            'cache_store' => $cacheStore,
            'git' => $git === '' ? null : $git,
        ];
    }

    /**
     * Settings that make timings unrepresentative of production.
     *
     * @return array<int, string>
     */
    public static function warnings(): array
    {
        $warnings = [];

        if (config('app.debug')) {
            $warnings[] = 'APP_DEBUG is on.';
        }

        if (! static::opcacheEnabled()) {
            $warnings[] = 'OPcache is off for the CLI (set opcache.enable_cli=1).';
        }

        if (extension_loaded('xdebug')) {
            $warnings[] = 'Xdebug is loaded.';
        }

        return $warnings;
    }

    public static function opcacheEnabled(): bool
    {
        return function_exists('opcache_get_status') && (bool) ini_get('opcache.enable_cli') && (bool) ini_get('opcache.enable');
    }
}

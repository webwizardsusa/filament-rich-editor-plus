<?php

namespace Hollyit\RichEditorPlus\Benchmarks;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The tables the benchmarks work on. They are created and dropped here, never by app migrations.
 */
class BenchmarkSchema
{
    /**
     * @var array<int, string>
     */
    public const array TABLES = ['bench_document_mentions', 'bench_documents', 'bench_mentionables'];

    public static function exists(): bool
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasTable($table)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Drops any old tables first, so a schema change never needs a manual cleanup.
     */
    public static function create(): void
    {
        static::drop();

        Schema::create('bench_mentionables', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
        });

        Schema::create('bench_documents', function (Blueprint $table): void {
            $table->id();
            $table->json('body');
            $table->longText('storable_html')->nullable();
            $table->longText('rendered_html')->nullable();
            $table->string('render_version')->nullable();
            $table->timestamps(6);
        });

        Schema::create('bench_document_mentions', function (Blueprint $table): void {
            $table->unsignedBigInteger('document_id');
            $table->string('mentionable_id');
            $table->primary(['document_id', 'mentionable_id']);
            $table->index('mentionable_id');
        });
    }

    public static function drop(): void
    {
        foreach (self::TABLES as $table) {
            Schema::dropIfExists($table);
        }
    }

    /**
     * Empties every table and resets the ids, so reseeding gives the same ids.
     */
    public static function truncate(): void
    {
        foreach (self::TABLES as $table) {
            DB::table($table)->truncate();
        }
    }
}

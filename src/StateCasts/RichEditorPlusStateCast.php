<?php

namespace Hollyit\RichEditorPlus\StateCasts;

use Filament\Schemas\Components\StateCasts\Contracts\StateCast;
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Hollyit\RichEditorPlus\RichEditorPlus;
use Hollyit\RichEditorPlus\Support\StateFormat;

/**
 * Keeps the field's Livewire state a single string, and gives everything else the format the field stores.
 *
 * Livewire diffs array state into one update per changed node, with a path like `content.0.content.1.content.0`,
 * and rejects paths deeper than `payload.max_nesting_depth` (10). A document deep enough to hit that is easy
 * to write (a marked word inside a table cell already does), so the editor's document travels as one JSON string.
 * Developers still get the array (or HTML) from `getState()`, and can fill the field with an array, JSON or HTML.
 */
class RichEditorPlusStateCast implements StateCast
{
    public function __construct(protected RichEditorPlus $richEditor) {}

    /**
     * From the Livewire state to the value the form, model and hooks work with.
     *
     * @return string | array<string, mixed> | null
     */
    public function get(mixed $state): string|array|null
    {
        if (blank($state)) {
            return null;
        }

        return match ($this->richEditor->getStateFormat()) {
            StateFormat::Json => $this->toDocument($state),
            StateFormat::Html => $this->toHtml($state),
        };
    }

    /**
     * From a stored value (an array, JSON or HTML) to the Livewire state.
     */
    public function set(mixed $state): ?string
    {
        if (blank($state)) {
            return null;
        }

        return match ($this->richEditor->getStateFormat()) {
            StateFormat::Json => json_encode($this->toDocument($state), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            StateFormat::Html => $this->toHtml($state),
        };
    }

    /**
     * @return array<string, mixed>
     */
    protected function toDocument(mixed $state): array
    {
        return is_array($state) ? $state : $this->renderer($state)->toArray();
    }

    protected function toHtml(mixed $state): string
    {
        return $this->renderer($state)->toStorableHtml();
    }

    protected function renderer(mixed $state): RichContentPlusRenderer
    {
        return RichContentPlusRenderer::make($state)->plugins($this->richEditor->getPlugins());
    }
}

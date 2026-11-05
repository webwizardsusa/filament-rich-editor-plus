<?php

namespace Webwizardsusa\RichEditorPlus\StateCasts;

use Filament\Schemas\Components\StateCasts\Contracts\StateCast;
use JsonException;
use UnexpectedValueException;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\StateFormat;

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
     * From the Livewire state to the value the form, model and hooks work with. With a content format, the format's
     * string.
     *
     * @return string | array<string, mixed> | null
     */
    public function get(mixed $state): string|array|null
    {
        if (blank($state)) {
            return null;
        }

        $format = $this->richEditor->getContentFormat();

        if ($format !== null) {
            return $format->fromDocument($this->toDocument($state), $this->richEditor->getPluginRegistry());
        }

        return match ($this->richEditor->getStateFormat()) {
            StateFormat::Json => $this->toDocument($state),
            StateFormat::Html => $this->toHtml($state),
        };
    }

    /**
     * From a stored value (an array, JSON or HTML, or the content format's string) to the Livewire state.
     */
    public function set(mixed $state): ?string
    {
        if (blank($state)) {
            return null;
        }

        $format = $this->richEditor->getContentFormat();

        if ($format !== null) {
            $document = is_array($state) ? $state : $format->toDocument((string) $state, $this->richEditor->getPluginRegistry());

            return $this->encode($document);
        }

        return match ($this->richEditor->getStateFormat()) {
            StateFormat::Json => $this->encode($this->toDocument($state)),
            StateFormat::Html => $this->toHtml($state),
        };
    }

    /**
     * A document that can't be encoded (too deep, or with invalid UTF-8) would load as an empty field and be saved
     * over the stored content, so it fails loudly instead.
     *
     * @param  array<string, mixed>  $document
     *
     * @throws UnexpectedValueException
     */
    protected function encode(array $document): string
    {
        try {
            return json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new UnexpectedValueException("The content of the field [{$this->richEditor->getName()}] can't be loaded into the editor: {$exception->getMessage()}.", previous: $exception);
        }
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

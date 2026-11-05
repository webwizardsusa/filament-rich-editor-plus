<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

use Hollyit\RichEditorPlus\RichEditorPlus;

/**
 * For plugins whose JS needs data from the server while editing, such as URLs for stored files. The editor's
 * `callPlugin(pluginId, request, payload)` reaches {@see answerEditorRequest()} through the field, with the page's own
 * authorization. Treat the payload as untrusted input.
 *
 * Requests are answered for a disabled (read-only) field too, because a read-only editor still loads what it shows,
 * such as image URLs. A request that changes anything (stores a file, writes a record) must refuse when
 * `$field->isDisabled()`; `RichEditorPlus::pullTemporaryUpload()` already does.
 */
interface AnswersEditorRequests
{
    /**
     * @param  array<array-key, mixed>  $payload
     * @return array<array-key, mixed>
     */
    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array;
}

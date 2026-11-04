<?php

namespace Hollyit\RichEditorPlus\Plugins\Contracts;

use Hollyit\RichEditorPlus\RichEditorPlus;

/**
 * For plugins whose JS needs data from the server while editing, such as URLs for stored files. The editor's
 * `callPlugin(pluginId, request, payload)` reaches {@see answerEditorRequest()} through the field, with the page's own
 * authorization. Treat the payload as untrusted input.
 */
interface AnswersEditorRequests
{
    /**
     * @param  array<array-key, mixed>  $payload
     * @return array<array-key, mixed>
     */
    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array;
}

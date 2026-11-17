---
title: Server requests and uploads
weight: 90
description: Ask a plugin on the server for data while editing, and take files uploaded from the editor.
---

## Asking the server from the editor

A plugin whose JS needs data from the server while editing, such as the URLs of stored files or a preview of an
embed, implements `AnswersEditorRequests`. The JS sends a request with `callPlugin()` from the
[editor context](javascript.md#the-editor-context), and the field passes it to the plugin's `answerEditorRequest()`.

In PHP:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

class FilesPlugin extends Plugin implements AnswersEditorRequests
{
    public function getId(): string
    {
        return 'acme/files';
    }

    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
    {
        return match ($request) {
            'urls' => ['urls' => $this->urlsFor(array_slice((array) ($payload['paths'] ?? []), 0, 100))],
            default => [],
        };
    }

    // getJsExtension(), urlsFor()...
}
```

In JS:

```js
registerExtension('acme/files', (options, tiptap, { callPlugin }) => {
    const loadUrls = async (paths) => {
        const { urls = {} } = await callPlugin('acme/files', 'urls', { paths })

        return urls
    }

    // ... an extension whose node view calls loadUrls()
})
```

`callPlugin(pluginId, request, payload)` returns a promise of the array the PHP method returns. The plugin id is the
PHP plugin's `getId()`.

How requests are handled:

- The request goes through a Livewire method on the field, so it runs under the page's own authorization: it is only
  answered for someone who can use the page.
- An unknown plugin id, or a plugin that doesn't implement the interface, answers `[]`.
- A plugin that throws answers `[]` too, and the exception is reported through Laravel's exception handler.
- Requests are answered for a **disabled** (read-only) field too, because a read-only editor still loads what it
  shows, such as image URLs.

> [!CAUTION]
> The payload comes from the browser. Validate it and cap its size, and never trust a path or an id in it: check that
> it is one the user may see, as the image plugin does for paths outside its directory. A request that changes
> anything, such as storing a file or writing a record, must return early when `$field->isDisabled()`.

`$field` gives you the field, so a request can read its settings, its plugin registry
(`$field->getPluginRegistry()`) or its record (`$field->getRecord()`).

## Taking uploads

A plugin that takes files from the editor implements `AcceptsEditorUploads` as well. Without at least one such plugin,
the field refuses uploads altogether.

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AcceptsEditorUploads;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;

class AudioPlugin extends Plugin implements AcceptsEditorUploads, AnswersEditorRequests
{
    protected bool $allowsUploads = true;

    public function acceptsEditorUploads(): bool
    {
        return $this->allowsUploads;
    }

    // ...
}
```

`acceptsEditorUploads()` lets the plugin turn uploads off through its own settings. A plugin that answers `false`
counts as one without the contract.

The flow:

1. The JS uploads the file with `upload(file, { onProgress })`, which sends it to the field's Livewire temporary uploads
   and resolves with a key.
2. It sends the key to the plugin with `callPlugin(pluginId, 'store', { key })`.
3. The plugin takes the file with `$field->pullTemporaryUpload($key)`, checks it, stores it, and answers with what the
   JS needs to insert, such as a disk and path.
4. The JS inserts the node.

Wrap the whole job in `processing()`, so the form can't save before the file is in the document:

```js
registerExtension('acme/audio', (options, tiptap, { upload, processing, callPlugin }) => {
    const insertFile = (editor, file) =>
        processing(
            (async () => {
                const key = await upload(file, { onProgress: (percent) => console.log(percent) })
                const answer = await callPlugin('acme/audio', 'store', { key })

                if (answer.error) {
                    throw new Error(answer.error)
                }

                editor.commands.insertContent({ type: 'audio', attrs: { disk: answer.disk, path: answer.path } })
            })(),
            options.labels.uploading,
        )

    // ... an extension whose paste or drop handler calls insertFile()
})
```

And in PHP:

```php
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;

public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
{
    if ($request !== 'store' || ! is_string($payload['key'] ?? null)) {
        return [];
    }

    $file = $field->pullTemporaryUpload($payload['key']);

    if ($file === null) {
        return ['error' => __('acme-audio::plugin.upload_missing')];
    }

    try {
        $mime = $file->getMimeType(); // detected from the contents

        if (! in_array($mime, ['audio/mpeg', 'audio/ogg'], true) || $file->getSize() > 20 * 1024 * 1024) {
            return ['error' => __('acme-audio::plugin.not_accepted')];
        }

        $path = $file->storeAs('editor-audio', Str::random(40).'.'.($mime === 'audio/ogg' ? 'ogg' : 'mp3'), 'public');

        return ['disk' => 'public', 'path' => $path];
    } finally {
        $file->delete();
    }
}
```

`pullTemporaryUpload($key)`:

- returns the `TemporaryUploadedFile` once, and forgets it, so a key can't be used twice;
- returns `null` for a malformed key, a missing or expired upload, or a **disabled field**, so a read-only editor can't
  store files.

Check the file's type from its contents and its size yourself, and store it under a name you choose: the browser chose
nothing but the key. The image and attachment plugins also refuse types that could run script when served from your
domain, such as HTML and SVG.

> [!TIP]
> Livewire's temporary uploads have their own size limit (12 MB by default), checked before your plugin sees the file.
> Tell users of a plugin that takes large files to raise `livewire.temporary_file_upload.rules`.

## Taking the field's attachment settings

A plugin that stores files can take the field's Filament attachment settings (`fileAttachmentsDisk()`,
`fileAttachmentsDirectory()`, `fileAttachmentsVisibility()`, `fileAttachmentsMaxSize()`,
`fileAttachmentsAcceptedFileTypes()` and `fileAttachments()`) as defaults, by implementing
`InheritsFieldFileAttachments`:

```php
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\InheritsFieldFileAttachments;

public function withFieldFileAttachments(array $defaults): static
{
    $plugin = clone $this;
    $plugin->disk ??= $defaults['disk'] ?? null;
    $plugin->directory ??= $defaults['directory'] ?? null;

    if (($defaults['uploads'] ?? true) === false) {
        $plugin->allowsUploads = false;
    }

    return $plugin;
}
```

`$defaults` has the keys `disk`, `directory`, `visibility`, `maxSize`, `acceptedFileTypes` and `uploads`, each only
when the field was given that setting. Return a **copy**: the same plugin instance may be shared by several fields.
Settings given to the plugin itself should win over the field's.

Remember that a renderer outside the form doesn't know the field's settings, so content rendered there uses the
plugin's own.

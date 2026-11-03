# Rich Editor Plus

## Storing content

The field stores **HTML** by default. Use a text column (`text` or `longText`) for it:

```php
$table->longText('body')->nullable();
```

To store the TipTap document instead, use a `json` column with an `array` cast and opt in:

```php
use Hollyit\RichEditorPlus\Support\StateFormat;

RichEditorPlus::make('body')->storeAs(StateFormat::Json);
```

Rows already stored as JSON keep working in an HTML field: they load, render, and are saved as HTML the next time
they are edited.

### Rendering

```php
use Hollyit\RichEditorPlus\Rendering\RichContentPlusRenderer;

RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml();

RichContentPlusRenderer::many($posts->pluck('body', 'id'))->plugins($plugins)->toHtml();
```

Stored HTML is rendered by patching only what plugins fill in at render time, such as mention labels and links. The
rest is printed as stored, which makes rendering fast, but it means **stored HTML is trusted**:

- Only write the column through the field, or through `toStorableHtml()`, which removes anything unsafe:

  ```php
  $post->body = RichContentPlusRenderer::make($importedHtml)->plugins($plugins)->toStorableHtml();
  ```

- To render HTML that came from anywhere else, parse it instead:

  ```php
  RichContentPlusRenderer::make($untrustedHtml)->plugins($plugins)->parseHtml()->toHtml();
  ```

Documents stored as JSON are always rendered from the document.

### Caching

The package doesn't cache rendered HTML. To cache it yourself, key the cache on the record and when it last changed:

```php
use Illuminate\Support\Facades\Cache;

$html = Cache::remember(
    "posts.{$post->id}.body.{$post->updated_at->timestamp}",
    now()->addHour(),
    fn (): string => RichContentPlusRenderer::make($post->body)->plugins($plugins)->toHtml(),
);
```

Mentions are looked up when the HTML is rendered, so a cached copy keeps a renamed user's old name until the entry
expires. Keep the lifetime as short as that staleness allows.

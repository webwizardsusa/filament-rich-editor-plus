<?php

use Webwizardsusa\RichEditorPlus\Plugins\Image\ImageCache\ImageCacheContent;
use Webwizardsusa\RichEditorPlus\Tests\Support\ImageCacheTestCase;

uses(ImageCacheTestCase::class);

it('reads the Images placed in stored HTML, each once, in order', function (): void {
    $first = '01m7qqgsen7gt2hh7rkj6n40zs';
    $second = '01m7qqgsen7gt2hh7rkj6n40zt';

    $html = <<<HTML
        <p>Intro</p>
        <figure class="rep-image" data-type="image" data-image="{$second}" data-style="banner"><img alt=""></figure>
        <figure class="rep-image" data-type="image" data-image="{$first}" data-style="thumb"><img alt=""></figure>
        <figure class="rep-image" data-type="image" data-image="{$second}" data-style="thumb"><img alt=""></figure>
        <figure class="rep-image" data-type="image" data-disk="public" data-path="editor-images/a.jpg"><img alt=""></figure>
        <p data-image="{$first}">Not a figure</p>
        HTML;

    expect(ImageCacheContent::imagesIn($html))->toBe([$second, $first]);
});

it('reads nothing from empty content, or from ids that are not ULIDs', function (): void {
    expect(ImageCacheContent::imagesIn(null))->toBe([])
        ->and(ImageCacheContent::imagesIn(''))->toBe([])
        ->and(ImageCacheContent::imagesIn('<figure data-image="not-a-ulid-at-all-xxxxxxxx"></figure>'))->toBe([]);
});

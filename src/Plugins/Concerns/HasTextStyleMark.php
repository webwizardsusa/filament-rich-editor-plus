<?php

namespace Hollyit\RichEditorPlus\Plugins\Concerns;

use DOMElement;
use Hollyit\RichEditorPlus\Content\MarkSpec;

/**
 * The `textStyle` span that colour and type plugins hang their attributes on. Each such plugin declares it; the registry
 * keeps one. A span counts only with a class or style, and never a mention's span (`data-type`).
 */
trait HasTextStyleMark
{
    protected function textStyleMark(): MarkSpec
    {
        return MarkSpec::make('textStyle')
            ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'span'
                && ! $element->hasAttribute('data-type')
                && ($element->hasAttribute('class') || $element->hasAttribute('style')))
            ->renderTag('span')
            ->priority(55);
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus\Content;

use LogicException;

class UnsupportedContentFormatException extends LogicException
{
    /**
     * @param  array<string, string>  $reasons  plugin label ⇒ reason, in field order
     */
    public static function forPlugins(string $formatName, array $reasons): static
    {
        $parts = [];

        foreach ($reasons as $plugin => $reason) {
            $parts[] = "{$plugin} ({$reason})";
        }

        return new static("{$formatName} storage can't keep: ".implode(', ', $parts).'.');
    }
}

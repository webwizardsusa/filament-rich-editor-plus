<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown\Contracts;

use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\MarkRule;
use Webwizardsusa\RichEditorPlus\Plugins\Markdown\Serializing\NodeRule;

/**
 * For plugins whose nodes or marks have a Markdown form. A plugin's content is allowed on a Markdown field when every
 * node and mark it declares has a rule. Parsing needs nothing extra: Markdown is read through HTML, which the plugin's
 * own parse rules already handle.
 */
interface ProvidesMarkdownRules
{
    /**
     * @return array<string, NodeRule> keyed by node type
     */
    public function getMarkdownNodeRules(): array;

    /**
     * @return array<string, MarkRule> keyed by mark type
     */
    public function getMarkdownMarkRules(): array;
}

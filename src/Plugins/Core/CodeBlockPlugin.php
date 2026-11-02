<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;

class CodeBlockPlugin extends Plugin
{
    public function getId(): string
    {
        return 'core/code-block';
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('codeBlock')
                ->parseTags(['pre'])
                ->preserveWhitespace()
                ->withoutMarks()
                ->attribute(
                    'language',
                    parse: static fn (DOMElement $element): ?string => preg_match(
                        '/(?:^|\s)language-(\S+)/',
                        $element->firstElementChild?->getAttribute('class') ?? '',
                        $matches,
                    ) === 1 ? $matches[1] : null,
                    render: static fn (): array => [],
                )
                ->renderUsing(static function (array $node, array $attributes): array {
                    $language = $node['attrs']['language'] ?? null;

                    return ['pre', $attributes, ['code', is_string($language) ? ['class' => "language-{$language}"] : [], 0]];
                }),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('codeBlock')
                ->label(__('rich-editor-plus::blocks.code_block'))
                ->description(__('rich-editor-plus::blocks.code_block_description'))
                ->icon('mdi-code-braces')
                ->keywords(['pre', 'snippet'])
                ->node('codeBlock')
                ->command('setCodeBlock')
                ->switchable()
                ->order(40),
        ];
    }
}

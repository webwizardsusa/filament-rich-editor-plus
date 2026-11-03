<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Concerns\HasLevelTools;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;

/**
 * A list of checkboxes, with TipTap's HTML. The checkbox is always `disabled` in saved and rendered HTML, where ticking
 * it couldn't save anything; the editor draws its own checkbox that can be ticked. TipTap reads only the first `<div>` of
 * a task item as its content, while the server parser keeps every child, so HTML that wraps a task item's content in
 * several elements is read differently.
 */
class TaskListPlugin extends Plugin
{
    use HasLevelTools;

    public function getId(): string
    {
        return 'core/task-list';
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('taskList')
                ->priority(60)
                ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'ul'
                    && $element->getAttribute('data-type') === 'taskList')
                ->htmlAttributes(['data-type' => 'taskList'])
                ->renderTag('ul'),
            NodeSpec::make('taskItem')
                ->priority(60)
                ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'li'
                    && $element->getAttribute('data-type') === 'taskItem')
                ->attribute(
                    'checked',
                    parse: static fn (DOMElement $element): bool => $element->hasAttribute('data-checked')
                        && in_array($element->getAttribute('data-checked'), ['', 'true'], true),
                    render: static fn (array $attributes): array => ['data-checked' => ($attributes['checked'] ?? false) ? 'true' : 'false'],
                    default: false,
                )
                ->htmlAttributes(['data-type' => 'taskItem'])
                ->renderUsing(static fn (array $node, array $attributes): array => [
                    'li',
                    $attributes,
                    ['label', ['input', [
                        'type' => 'checkbox',
                        'checked' => ($node['attrs']['checked'] ?? false) ? 'checked' : null,
                        'disabled' => 'disabled',
                    ]], ['span']],
                    ['div', 0],
                ])
                ->textUsing(static fn (array $node): string => ($node['attrs']['checked'] ?? false) ? '[x] ' : '[ ] '),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId());
    }

    public function getTools(): array
    {
        return $this->getLevelTools('taskList');
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('taskList')
                ->label(__('rich-editor-plus::blocks.task_list'))
                ->description(__('rich-editor-plus::blocks.task_list_description'))
                ->icon('mdi-format-list-checks')
                ->keywords(['todo', 'checkbox', 'checklist'])
                ->node('taskList')
                ->command('toggleTaskList')
                ->switchable()
                ->listType()
                ->multiBlock()
                ->order(22),
        ];
    }
}

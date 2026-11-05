<?php

namespace Hollyit\RichEditorPlus\Plugins\Table;

use Closure;
use DOMElement;
use Hollyit\RichEditorPlus\Content\NodeSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Plugins\Table\Actions\InsertTableAction;
use Hollyit\RichEditorPlus\Support\BlockType;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

/**
 * Tables for Rich Editor Plus. It adds a table block to the slash menu and a toolbar of its own that appears above
 * a table for adding, removing and merging rows, columns and cells.
 *
 * Add it to a field with `->addPlugins([TablePlugin::make()])`, or to every editor with
 * `RichEditorPlus::registerDefaultPlugins([TablePlugin::class])`.
 */
class TablePlugin extends Plugin
{
    public const string ID = 'hollyit/table';

    protected bool $isResizable = true;

    protected bool $hasHeaderRowByDefault = true;

    protected int $defaultRows = 3;

    protected int $defaultColumns = 3;

    /**
     * Whether column widths can be dragged.
     */
    public function resizable(bool $condition = true): static
    {
        $this->isResizable = $condition;

        return $this;
    }

    public function isResizable(): bool
    {
        return $this->isResizable;
    }

    /**
     * The size and header row that the insert dialog starts with.
     */
    public function defaultSize(int $rows, int $columns, bool $headerRow = true): static
    {
        $this->defaultRows = $rows;
        $this->defaultColumns = $columns;
        $this->hasHeaderRowByDefault = $headerRow;

        return $this;
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function getNodes(): array
    {
        return [
            NodeSpec::make('table')
                ->parseTags(['table'])
                ->renderUsing(static fn (array $node, array $attributes): array => ['table', $attributes, ['tbody', 0]]),
            NodeSpec::make('tableRow')->parseTags(['tr'])->renderTag('tr'),
            $this->cellSpec('tableHeader', 'th'),
            $this->cellSpec('tableCell', 'td'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), ['resizable' => $this->isResizable])
            ->module(TableAssets::moduleUrl());
    }

    public function getActions(): array
    {
        return [InsertTableAction::make($this->defaultRows, $this->defaultColumns, $this->hasHeaderRowByDefault)];
    }

    public function getTools(): array
    {
        return [
            $this->tableTool('addColumnBefore', 'add_column_before', 'mdi-table-column-plus-before', 'columns', 100),
            $this->tableTool('addColumnAfter', 'add_column_after', 'mdi-table-column-plus-after', 'columns', 110),
            $this->tableTool('deleteColumn', 'delete_column', 'mdi-table-column-remove', 'columns', 120),
            $this->tableTool('addRowBefore', 'add_row_before', 'mdi-table-row-plus-before', 'rows', 200),
            $this->tableTool('addRowAfter', 'add_row_after', 'mdi-table-row-plus-after', 'rows', 210),
            $this->tableTool('deleteRow', 'delete_row', 'mdi-table-row-remove', 'rows', 220),
            $this->tableTool('mergeOrSplit', 'merge_or_split_cells', 'mdi-table-merge-cells', 'cells', 300),
            $this->tableTool('toggleHeaderRow', 'toggle_header_row', 'mdi-table-headers-eye', 'cells', 310),
            $this->tableTool('deleteTable', 'delete_table', 'mdi-table-remove', 'table', 400),
        ];
    }

    public function getBlockTypes(): array
    {
        return [
            BlockType::make('table')
                ->label(__('rich-editor-plus::tools.table.table'))
                ->description(__('rich-editor-plus::tools.table.table_description'))
                ->icon('mdi-table')
                ->keywords(['grid', 'rows', 'columns'])
                ->node('table')
                ->action('insertTable')
                ->order(60),
        ];
    }

    protected function cellSpec(string $name, string $tag): NodeSpec
    {
        $parseSpan = static fn (string $attribute): Closure => static fn (DOMElement $element): ?int => $element->hasAttribute($attribute)
            ? (int) $element->getAttribute($attribute)
            : null;

        return NodeSpec::make($name)
            ->parseTags([$tag])
            ->attribute('colspan', parse: $parseSpan('colspan'), default: 1)
            ->attribute('rowspan', parse: $parseSpan('rowspan'), default: 1)
            ->attribute(
                'colwidth',
                parse: static fn (DOMElement $element): ?array => $element->getAttribute('colwidth') !== ''
                    ? array_map('intval', explode(',', $element->getAttribute('colwidth')))
                    : null,
                render: static fn (array $attrs): array => is_array($attrs['colwidth'] ?? null)
                    ? ['colwidth' => implode(',', array_map('intval', $attrs['colwidth']))]
                    : [],
            )
            ->attribute(
                'align',
                parse: static fn (DOMElement $element): ?string => self::normalizeAlign(
                    NodeSpec::styleValue($element, 'text-align') ?: strtolower(trim($element->getAttribute('align'))),
                ),
                render: static function (array $attrs): array {
                    $align = self::normalizeAlign($attrs['align'] ?? null);

                    return $align ? ['style' => "text-align: {$align}"] : [];
                },
            )
            ->renderTag($tag);
    }

    protected static function normalizeAlign(mixed $align): ?string
    {
        return in_array($align, ['left', 'right', 'center'], true) ? $align : null;
    }

    protected function tableTool(string $command, string $label, string $icon, string $group, int $order): Tool
    {
        return Tool::make($command)
            ->label(__("rich-editor-plus::tools.table.{$label}"))
            ->icon($icon)
            ->command($command)
            ->block()
            ->nodes(['table'])
            ->showWithCursor()
            ->group($group)
            ->order($order);
    }
}

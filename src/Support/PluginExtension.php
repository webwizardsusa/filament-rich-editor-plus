<?php

namespace Hollyit\RichEditorPlus\Support;

use Filament\Actions\Action;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Content\NodeSpec;

/**
 * What another package or the app adds to an existing plugin, collected by `RichEditorPlus::extendPlugin()`.
 */
class PluginExtension
{
    /**
     * @var array<Tool>
     */
    protected array $tools = [];

    /**
     * @var array<Action>
     */
    protected array $actions = [];

    /**
     * @var array<NodeSpec>
     */
    protected array $nodes = [];

    /**
     * @var array<MarkSpec>
     */
    protected array $marks = [];

    /**
     * @var array<string>
     */
    protected array $modules = [];

    /**
     * @var array<BlockType>
     */
    protected array $blockTypes = [];

    /**
     * @param  array<Tool>  $tools
     */
    public function addTools(array $tools): static
    {
        $this->tools = [...$this->tools, ...$tools];

        return $this;
    }

    public function addTool(Tool $tool): static
    {
        return $this->addTools([$tool]);
    }

    /**
     * @param  array<Action>  $actions
     */
    public function addActions(array $actions): static
    {
        $this->actions = [...$this->actions, ...$actions];

        return $this;
    }

    /**
     * An ES module the browser loads with the plugin, typically one that calls `extendExtension()`.
     */
    public function addModule(string $url): static
    {
        $this->modules[] = $url;

        return $this;
    }

    /**
     * @return array<Tool>
     */
    public function getTools(): array
    {
        return $this->tools;
    }

    /**
     * @return array<Action>
     */
    public function getActions(): array
    {
        return $this->actions;
    }

    /**
     * @param  array<BlockType>  $blockTypes
     */
    public function addBlockTypes(array $blockTypes): static
    {
        $this->blockTypes = [...$this->blockTypes, ...$blockTypes];

        return $this;
    }

    public function addBlockType(BlockType $blockType): static
    {
        return $this->addBlockTypes([$blockType]);
    }

    /**
     * @return array<BlockType>
     */
    public function getBlockTypes(): array
    {
        return $this->blockTypes;
    }

    /**
     * @param  array<NodeSpec>  $nodes
     */
    public function addNodes(array $nodes): static
    {
        $this->nodes = [...$this->nodes, ...$nodes];

        return $this;
    }

    /**
     * @param  array<MarkSpec>  $marks
     */
    public function addMarks(array $marks): static
    {
        $this->marks = [...$this->marks, ...$marks];

        return $this;
    }

    /**
     * @return array<NodeSpec>
     */
    public function getNodes(): array
    {
        return $this->nodes;
    }

    /**
     * @return array<MarkSpec>
     */
    public function getMarks(): array
    {
        return $this->marks;
    }

    /**
     * @return array<string>
     */
    public function getModules(): array
    {
        return $this->modules;
    }
}

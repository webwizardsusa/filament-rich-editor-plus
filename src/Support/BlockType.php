<?php

namespace Hollyit\RichEditorPlus\Support;

/**
 * What a block is: how to recognise it, how to apply it, and how it appears in the slash menu and block switcher.
 * A {@see Tool} is a button that acts on content; a block type is the kind of content itself.
 */
class BlockType
{
    protected ?string $label = null;

    protected ?string $description = null;

    protected ?string $icon = null;

    /**
     * @var array<string>
     */
    protected array $keywords = [];

    protected ?string $nodeName = null;

    /**
     * @var array<string, mixed>
     */
    protected array $nodeAttributes = [];

    protected ?string $command = null;

    /**
     * @var array<int, mixed>
     */
    protected array $arguments = [];

    protected ?string $action = null;

    protected bool $isSwitchable = false;

    protected bool $isListType = false;

    protected bool $isMultiBlock = false;

    protected int $order = 0;

    public function __construct(protected string $name) {}

    public static function make(string $name): static
    {
        return new static($name);
    }

    public function label(?string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function description(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function icon(?string $icon): static
    {
        $this->icon = $icon;

        return $this;
    }

    /**
     * Extra words the slash menu matches, besides the label.
     *
     * @param  array<string>  $keywords
     */
    public function keywords(array $keywords): static
    {
        $this->keywords = $keywords;

        return $this;
    }

    /**
     * The top-level node type and attributes that identify this block in a document.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function node(string $name, array $attributes = []): static
    {
        $this->nodeName = $name;
        $this->nodeAttributes = $attributes;

        return $this;
    }

    /**
     * @param  array<int, mixed>  $arguments
     */
    public function command(string $command, array $arguments = []): static
    {
        $this->command = $command;
        $this->arguments = $arguments;

        return $this;
    }

    /**
     * Opens the named Filament action to apply the block instead of running a command, for blocks that need
     * input such as a table's size.
     */
    public function action(?string $action): static
    {
        $this->action = $action;

        return $this;
    }

    /**
     * Whether the block appears in the block switcher and can be switched from.
     */
    public function switchable(bool $condition = true): static
    {
        $this->isSwitchable = $condition;

        return $this;
    }

    public function order(int $order): static
    {
        $this->order = $order;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getLabel(): string
    {
        return $this->label ?? $this->name;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    /**
     * @return array<string>
     */
    public function getKeywords(): array
    {
        return $this->keywords;
    }

    public function getNodeName(): ?string
    {
        return $this->nodeName;
    }

    /**
     * @return array<string, mixed>
     */
    public function getNodeAttributes(): array
    {
        return $this->nodeAttributes;
    }

    public function getCommand(): ?string
    {
        return $this->command;
    }

    /**
     * @return array<int, mixed>
     */
    public function getArguments(): array
    {
        return $this->arguments;
    }

    public function getAction(): ?string
    {
        return $this->action;
    }

    /**
     * Offers this block in the list button's menu, for switching a list to it in place. Its node must hold `listItem`s.
     */
    public function listType(bool $condition = true): static
    {
        $this->isListType = $condition;

        return $this;
    }

    /**
     * Offers this block in the switcher when several paragraphs are selected. Its command must turn the whole selection
     * into one block, as wrapping commands do.
     */
    public function multiBlock(bool $condition = true): static
    {
        $this->isMultiBlock = $condition;

        return $this;
    }

    public function isMultiBlock(): bool
    {
        return $this->isMultiBlock;
    }

    public function isListType(): bool
    {
        return $this->isListType;
    }

    public function isSwitchable(): bool
    {
        return $this->isSwitchable;
    }

    public function getOrder(): int
    {
        return $this->order;
    }
}

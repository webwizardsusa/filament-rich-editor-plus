<?php

namespace Hollyit\RichEditorPlus\Support;

/**
 * One result in the mention dropdown.
 */
class MentionItem
{
    protected ?string $description = null;

    protected ?string $avatar = null;

    public function __construct(protected string|int $id, protected string $label) {}

    public static function make(string|int $id, string $label): static
    {
        return new static($id, $label);
    }

    public function description(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    /**
     * The URL of an image shown beside the label.
     */
    public function avatar(?string $url): static
    {
        $this->avatar = $url;

        return $this;
    }

    public function getId(): string
    {
        return (string) $this->id;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    /**
     * @return array{id: string, label: string, description: ?string, avatar: ?string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'label' => $this->label,
            'description' => $this->description,
            'avatar' => $this->avatar,
        ];
    }
}

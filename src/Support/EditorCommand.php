<?php

namespace Hollyit\RichEditorPlus\Support;

use Illuminate\Contracts\Support\Arrayable;

/**
 * A TipTap chain command (for example `setLink`) that PHP asks the browser to run on the editor.
 *
 * @implements Arrayable<string, mixed>
 */
class EditorCommand implements Arrayable
{
    /**
     * @param  array<int, mixed>  $arguments
     */
    public function __construct(
        public readonly string $name,
        public readonly array $arguments = [],
    ) {}

    /**
     * @param  array<int, mixed>  $arguments
     */
    public static function make(string $name, array $arguments = []): static
    {
        return new static($name, $arguments);
    }

    /**
     * @return array{name: string, arguments: array<int, mixed>}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'arguments' => $this->arguments,
        ];
    }
}

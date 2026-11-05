<?php

namespace Webwizardsusa\RichEditorPlus\Support;

/**
 * Tells the JS side which TipTap extension a plugin needs. The id is looked up in the JS extension registry
 * (see resources/js/registry.js) and the options are passed to that extension's factory.
 */
class JsExtension
{
    /**
     * @var array<string>
     */
    protected array $modules = [];

    /**
     * @param  array<string, mixed>  $options
     */
    public function __construct(
        protected string $id,
        protected array $options = [],
    ) {}

    /**
     * @param  array<string, mixed>  $options
     */
    public static function make(string $id, array $options = []): static
    {
        return new static($id, $options);
    }

    /**
     * Adds the URL of an ES module the browser imports before the editor is built, for plugins that ship their
     * own JS. The module registers its extensions with `registerExtension()` (or decorates existing ones with
     * `extendExtension()`) and may default-export a function that is called with the shared editor API:
     * `{ tiptap, registerExtension, extendExtension, registerActionArguments }`. Use the shared `tiptap` modules
     * rather than bundling TipTap, so every extension runs on the same ProseMirror instance.
     */
    public function module(string $url): static
    {
        $this->modules[] = $url;

        return $this;
    }

    /**
     * @return array<string>
     */
    public function getModules(): array
    {
        return $this->modules;
    }

    public function getId(): string
    {
        return $this->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function getOptions(): array
    {
        return $this->options;
    }

    /**
     * @return array{id: string, options: array<string, mixed>, modules?: array<string>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'options' => $this->options,
            ...($this->modules === [] ? [] : ['modules' => $this->modules]),
        ];
    }
}

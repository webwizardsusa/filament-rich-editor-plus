<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Markdown;

use Webwizardsusa\RichEditorPlus\Content\Contracts\ContentFormat;
use Webwizardsusa\RichEditorPlus\Content\UnsupportedContentFormatException;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\AnswersEditorRequests;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ChecksFieldPlugins;
use Webwizardsusa\RichEditorPlus\Plugins\Contracts\ProvidesContentFormat;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

/**
 * Markdown on a Rich Editor Plus field: `store()` keeps the field's content as Markdown, `pasteMarkdown()` (on by
 * default) turns pasted Markdown into formatted content on any field, and `sourceToggle()` (on by default when
 * storing) adds a Markdown source view.
 */
class MarkdownPlugin extends Plugin implements AnswersEditorRequests, ChecksFieldPlugins, ProvidesContentFormat
{
    public const string ID = 'webwizardsusa/markdown';

    protected bool $stores = false;

    protected bool $pastesMarkdown = true;

    protected ?bool $hasSourceToggle = null;

    public function store(bool $condition = true): static
    {
        $this->stores = $condition;

        return $this;
    }

    public function pasteMarkdown(bool $condition = true): static
    {
        $this->pastesMarkdown = $condition;

        return $this;
    }

    /**
     * On a field that doesn't store Markdown, every plugin must have a Markdown form, or the field throws at boot.
     */
    public function sourceToggle(bool $condition = true): static
    {
        $this->hasSourceToggle = $condition;

        return $this;
    }

    public function stores(): bool
    {
        return $this->stores;
    }

    public function pastesMarkdown(): bool
    {
        return $this->pastesMarkdown;
    }

    public function hasSourceToggle(): bool
    {
        return $this->hasSourceToggle ?? $this->stores;
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function getContentFormat(): ?ContentFormat
    {
        return $this->stores ? MarkdownFormat::make() : null;
    }

    public function checkFieldPlugins(array $plugins): void
    {
        if ($this->hasSourceToggle() && ! $this->stores) {
            MarkdownFormat::make()->assertSupports($plugins);
        }
    }

    public function getTools(): array
    {
        if (! $this->hasSourceToggle()) {
            return [];
        }

        return [
            Tool::make('markdownSource')
                ->label(__('rich-editor-plus::markdown.source'))
                ->icon('mdi-language-markdown')
                ->command('toggleMarkdownSource')
                ->active('markdownSource')
                ->overflow()
                ->availableWhileReadOnly(),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make(self::ID, [
            'paste' => $this->pastesMarkdown,
            'source' => $this->hasSourceToggle(),
            'labels' => [
                'source' => __('rich-editor-plus::markdown.source'),
                'done' => __('rich-editor-plus::markdown.source_done'),
                'converting' => __('rich-editor-plus::markdown.converting'),
                'pasteFailed' => __('rich-editor-plus::markdown.paste_failed'),
                'convertFailed' => __('rich-editor-plus::markdown.convert_failed'),
            ],
        ])->module(MarkdownAssets::moduleUrl());
    }

    public function answerEditorRequest(string $request, array $payload, RichEditorPlus $field): array
    {
        return match ($request) {
            'toDocument' => $this->answerToDocument($payload, $field),
            'toMarkdown' => $this->answerToMarkdown($payload, $field),
            default => [],
        };
    }

    /**
     * @param  array<array-key, mixed>  $payload
     * @return array{document?: array<string, mixed>, error?: string}
     */
    protected function answerToDocument(array $payload, RichEditorPlus $field): array
    {
        $markdown = $payload['markdown'] ?? null;

        if (! is_string($markdown)) {
            return ['error' => __('rich-editor-plus::markdown.errors.invalid')];
        }

        if (strlen($markdown) > MarkdownFormat::MAX_LENGTH) {
            return ['error' => __('rich-editor-plus::markdown.errors.too_large')];
        }

        return ['document' => MarkdownFormat::make()->toDocument($markdown, $field->getPluginRegistry())];
    }

    /**
     * @param  array<array-key, mixed>  $payload
     * @return array{markdown?: string, error?: string}
     */
    protected function answerToMarkdown(array $payload, RichEditorPlus $field): array
    {
        $document = $payload['document'] ?? null;

        if (! is_array($document) || ($document['type'] ?? null) !== 'doc') {
            return ['error' => __('rich-editor-plus::markdown.errors.invalid')];
        }

        $encoded = json_encode($document);

        if ($encoded === false) {
            return ['error' => __('rich-editor-plus::markdown.errors.invalid')];
        }

        if (strlen($encoded) > MarkdownFormat::MAX_LENGTH) {
            return ['error' => __('rich-editor-plus::markdown.errors.too_large')];
        }

        try {
            return ['markdown' => MarkdownFormat::make()->fromDocument($document, $field->getPluginRegistry())];
        } catch (UnsupportedContentFormatException) {
            return ['error' => __('rich-editor-plus::markdown.errors.unsupported')];
        }
    }
}

<?php

namespace Webwizardsusa\RichEditorPlus\Actions;

use Filament\Actions\Action;
use Filament\Forms\Components\CodeEditor;
use Filament\Forms\Components\CodeEditor\Enums\Language;
use Filament\Support\Enums\Width;
use Webwizardsusa\RichEditorPlus\Content\ContentSchema;
use Webwizardsusa\RichEditorPlus\Content\HtmlParser;
use Webwizardsusa\RichEditorPlus\Rendering\RichContentPlusRenderer;
use Webwizardsusa\RichEditorPlus\RichEditorPlus;
use Webwizardsusa\RichEditorPlus\Support\EditorCommand;
use Webwizardsusa\RichEditorPlus\Support\HtmlFormatter;

/**
 * The modal for viewing and editing a field's content as HTML. It opens with the field's current content, written
 * with the field's plugins and formatted for reading. Saving parses the HTML with the same plugins, so anything they
 * don't support is dropped, and replaces the editor's document in the browser, where it can be undone.
 */
class HtmlSourceAction
{
    public static function make(): Action
    {
        return Action::make('htmlSource')
            ->label(__('rich-editor-plus::actions.html_source.label'))
            ->modalHeading(__('rich-editor-plus::actions.html_source.modal.heading'))
            ->modalWidth(Width::FiveExtraLarge)
            ->modalSubmitActionLabel(__('rich-editor-plus::actions.html_source.modal.submit'))
            ->fillForm(fn (RichEditorPlus $component): array => [
                'source' => HtmlFormatter::format(
                    RichContentPlusRenderer::make($component->getRawState())
                        ->plugins($component->getPlugins())
                        ->toStorableHtml(),
                ),
            ])
            ->schema([
                CodeEditor::make('source')
                    ->hiddenLabel()
                    ->language(Language::Html),
            ])
            ->action(function (array $data, RichEditorPlus $component): void {
                $schema = ContentSchema::fromRegistry($component->getPluginRegistry());
                $document = static::wrapLooseInlineContent((new HtmlParser($schema))->parse((string) ($data['source'] ?? '')), $schema);

                $component->runCommands([
                    blank($document['content'] ?? [])
                        ? EditorCommand::make('clearContent')
                        : EditorCommand::make('setContent', [$document]),
                ]);
            });
    }

    /**
     * Wraps text and other inline nodes typed outside any block in paragraphs, as the editor would, because a
     * document can only hold blocks.
     *
     * @param  array<string, mixed>  $document
     * @return array<string, mixed>
     */
    protected static function wrapLooseInlineContent(array $document, ContentSchema $schema): array
    {
        $blocks = [];
        $inline = [];

        foreach ($document['content'] ?? [] as $node) {
            if ($node['type'] === 'text' || $schema->node($node['type'])?->isInline()) {
                $inline[] = $node;

                continue;
            }

            $blocks = [...$blocks, ...static::paragraphFor($inline), $node];
            $inline = [];
        }

        return [...$document, 'content' => [...$blocks, ...static::paragraphFor($inline)]];
    }

    /**
     * @param  array<array<string, mixed>>  $inline
     * @return array<array<string, mixed>>
     */
    protected static function paragraphFor(array $inline): array
    {
        return $inline === [] ? [] : [['type' => 'paragraph', 'content' => $inline]];
    }
}

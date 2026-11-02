<?php

namespace Hollyit\RichEditorPlus\Plugins\Core;

use DOMElement;
use Hollyit\RichEditorPlus\Actions\LinkAction;
use Hollyit\RichEditorPlus\Content\MarkSpec;
use Hollyit\RichEditorPlus\Plugins\Plugin;
use Hollyit\RichEditorPlus\Support\JsExtension;
use Hollyit\RichEditorPlus\Support\Tool;

class LinkPlugin extends Plugin
{
    /**
     * @var array<string>
     */
    protected array $protocols = ['http', 'https', 'mailto', 'tel'];

    protected string $defaultProtocol = 'https';

    protected bool $shouldOpenInNewTab = true;

    protected bool $shouldAutolink = true;

    /**
     * @param  array<string>  $protocols
     */
    public function protocols(array $protocols): static
    {
        $this->protocols = $protocols;

        return $this;
    }

    public function defaultProtocol(string $protocol): static
    {
        $this->defaultProtocol = $protocol;

        return $this;
    }

    public function openInNewTab(bool $condition = true): static
    {
        $this->shouldOpenInNewTab = $condition;

        return $this;
    }

    public function autolink(bool $condition = true): static
    {
        $this->shouldAutolink = $condition;

        return $this;
    }

    public function getId(): string
    {
        return 'core/link';
    }

    public function getMarks(): array
    {
        $protocols = $this->protocols;
        $htmlAttributes = $this->getHtmlAttributes();

        return [
            MarkSpec::make('link')
                ->priority(1000)
                ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'a'
                    && $element->getAttribute('href') !== ''
                    && MarkSpec::isAllowedUrl($element->getAttribute('href'), $protocols))
                ->urlAttribute('href', $protocols)
                ->attribute('target', default: $htmlAttributes['target'] ?? null)
                ->attribute('rel', default: $htmlAttributes['rel'] ?? null)
                ->attribute('class')
                ->attribute('title')
                ->renderTag('a'),
        ];
    }

    public function getJsExtension(): JsExtension
    {
        return JsExtension::make($this->getId(), [
            'protocols' => $this->protocols,
            'defaultProtocol' => $this->defaultProtocol,
            'autolink' => $this->shouldAutolink,
            'HTMLAttributes' => $this->getHtmlAttributes(),
        ]);
    }

    public function getActions(): array
    {
        return [LinkAction::make($this->shouldOpenInNewTab)];
    }

    public function getTools(): array
    {
        return [
            Tool::make('link')
                ->label(__('rich-editor-plus::tools.link'))
                ->icon('mdi-link')
                ->action('link')
                ->active('link')
                ->inline()
                ->group('format')
                ->order(50),
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function getHtmlAttributes(): array
    {
        if (! $this->shouldOpenInNewTab) {
            return [];
        }

        return [
            'target' => '_blank',
            'rel' => 'noopener noreferrer nofollow',
        ];
    }
}

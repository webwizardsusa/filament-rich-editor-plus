<?php

namespace Webwizardsusa\RichEditorPlus\Plugins\Core;

use DOMElement;
use Webwizardsusa\RichEditorPlus\Actions\LinkAction;
use Webwizardsusa\RichEditorPlus\Content\MarkSpec;
use Webwizardsusa\RichEditorPlus\Plugins\Plugin;
use Webwizardsusa\RichEditorPlus\Support\JsExtension;
use Webwizardsusa\RichEditorPlus\Support\Tool;

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
     * @var array<string>
     */
    protected array $allowedClasses = [];

    /**
     * The only link targets kept; any other target is dropped.
     *
     * @var array<string>
     */
    public const array TARGETS = ['_blank', '_self'];

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

    /**
     * Classes a link may keep. Any other class is dropped when content is parsed or rendered, so stored content can't
     * borrow the site's own utility classes (`fixed inset-0`, for example) to cover the page. None by default.
     *
     * @param  array<string>  $classes
     */
    public function allowedClasses(array $classes): static
    {
        $this->allowedClasses = array_values($classes);

        return $this;
    }

    /**
     * @return array<string>
     */
    public function getAllowedClasses(): array
    {
        return $this->allowedClasses;
    }

    public function getId(): string
    {
        return 'core/link';
    }

    public function getMarks(): array
    {
        $protocols = $this->protocols;
        $allowedClasses = $this->allowedClasses;
        $htmlAttributes = $this->getHtmlAttributes();
        $defaultTarget = $htmlAttributes['target'] ?? null;

        return [
            MarkSpec::make('link')
                ->priority(1000)
                ->parseUsing(static fn (DOMElement $element): bool => strtolower($element->tagName) === 'a'
                    && $element->getAttribute('href') !== ''
                    && MarkSpec::isAllowedUrl($element->getAttribute('href'), $protocols))
                ->urlAttribute('href', $protocols)
                ->attribute(
                    'target',
                    parse: static fn (DOMElement $element): ?string => static::normalizeTarget($element->getAttribute('target')),
                    render: static fn (array $attrs): array => ['target' => static::normalizeTarget($attrs['target'] ?? null)],
                    default: $htmlAttributes['target'] ?? null,
                )
                ->attribute(
                    'rel',
                    render: static fn (array $attrs): array => ['rel' => static::normalizeRel($attrs['rel'] ?? null, static::normalizeTarget($attrs['target'] ?? $defaultTarget))],
                    default: $htmlAttributes['rel'] ?? null,
                )
                ->attribute(
                    'class',
                    parse: static fn (DOMElement $element): ?string => static::filterClasses($element->getAttribute('class'), $allowedClasses),
                    render: static fn (array $attrs): array => ['class' => static::filterClasses($attrs['class'] ?? null, $allowedClasses)],
                )
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
        return [LinkAction::make($this->shouldOpenInNewTab, $this->protocols)];
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

    public static function normalizeTarget(mixed $target): ?string
    {
        return is_string($target) && in_array(strtolower(trim($target)), self::TARGETS, true) ? strtolower(trim($target)) : null;
    }

    /**
     * The link's `rel`, without `opener`, and with `noopener` whenever the link opens in a new tab, so the page it
     * opens can never reach back to this one.
     */
    public static function normalizeRel(mixed $rel, ?string $target): ?string
    {
        $tokens = is_string($rel) ? preg_split('/\s+/', strtolower(trim($rel)), flags: PREG_SPLIT_NO_EMPTY) : [];
        $tokens = array_values(array_filter($tokens ?: [], static fn (string $token): bool => $token !== 'opener'));

        if ($target === '_blank' && ! in_array('noopener', $tokens, true)) {
            array_unshift($tokens, 'noopener');
        }

        return $tokens === [] ? null : implode(' ', array_unique($tokens));
    }

    /**
     * @param  array<string>  $allowed
     */
    public static function filterClasses(mixed $classes, array $allowed): ?string
    {
        if (! is_string($classes) || $allowed === []) {
            return null;
        }

        $kept = array_intersect(preg_split('/\s+/', trim($classes), flags: PREG_SPLIT_NO_EMPTY) ?: [], $allowed);

        return $kept === [] ? null : implode(' ', array_unique($kept));
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

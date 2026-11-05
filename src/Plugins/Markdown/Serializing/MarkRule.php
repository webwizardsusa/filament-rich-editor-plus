<?php

namespace Hollyit\RichEditorPlus\Plugins\Markdown\Serializing;

use Closure;

/**
 * Writes one mark type: delimiters around the marked text (`**`), or, for marks like inline code whose text is written
 * verbatim, a wrapper that receives the text itself. Delimiter closures get the mark and the writer (for helpers such
 * as {@see MarkdownWriter::linkDestination()}).
 */
final class MarkRule
{
    /**
     * @param  Closure(array<string, mixed>, MarkdownWriter): string  $open
     * @param  Closure(array<string, mixed>, MarkdownWriter): string  $close
     * @param  ?Closure(string, array<string, mixed>): string  $wrap
     * @param  ?Closure(array<string, mixed>, MarkdownWriter): bool  $applies
     */
    private function __construct(
        private Closure $open,
        private Closure $close,
        private ?Closure $wrap = null,
        private ?string $fallbackOpen = null,
        private ?string $fallbackClose = null,
        private ?Closure $applies = null,
    ) {}

    /**
     * @param  string | Closure(array<string, mixed>, MarkdownWriter): string  $open
     * @param  string | Closure(array<string, mixed>, MarkdownWriter): string  $close
     */
    public static function using(string|Closure $open, string|Closure $close): self
    {
        return new self(
            is_string($open) ? static fn (): string => $open : $open,
            is_string($close) ? static fn (): string => $close : $close,
        );
    }

    /**
     * @param  Closure(string, array<string, mixed>): string  $wrap
     */
    public static function wrapping(Closure $wrap): self
    {
        return new self(static fn (): string => '', static fn (): string => '', $wrap);
    }

    /**
     * For emphasis-like delimiters, which CommonMark only honours next to the right characters (`x**"a"**y` is plain
     * text). When the delimiters would not work, the mark is written with this HTML instead.
     */
    public function withHtmlFallback(string $open, string $close): self
    {
        return new self($this->open, $this->close, $this->wrap, $open, $close, $this->applies);
    }

    /**
     * Writes the mark only when the callback agrees, such as a link whose URL is safe. Otherwise the text is written
     * without it, in strict and lenient writing alike.
     *
     * @param  Closure(array<string, mixed>, MarkdownWriter): bool  $applies
     */
    public function when(Closure $applies): self
    {
        return new self($this->open, $this->close, $this->wrap, $this->fallbackOpen, $this->fallbackClose, $applies);
    }

    /**
     * @param  array<string, mixed>  $mark
     */
    public function applies(array $mark, MarkdownWriter $writer): bool
    {
        return $this->applies === null || ($this->applies)($mark, $writer);
    }

    public function hasHtmlFallback(): bool
    {
        return $this->fallbackOpen !== null;
    }

    public function fallbackOpen(): string
    {
        return (string) $this->fallbackOpen;
    }

    public function fallbackClose(): string
    {
        return (string) $this->fallbackClose;
    }

    /**
     * @param  array<string, mixed>  $mark
     */
    public function open(array $mark, MarkdownWriter $writer): string
    {
        return ($this->open)($mark, $writer);
    }

    /**
     * @param  array<string, mixed>  $mark
     */
    public function close(array $mark, MarkdownWriter $writer): string
    {
        return ($this->close)($mark, $writer);
    }

    public function wraps(): bool
    {
        return $this->wrap !== null;
    }

    /**
     * @param  array<string, mixed>  $mark
     */
    public function wrap(string $text, array $mark): string
    {
        return ($this->wrap)($text, $mark);
    }
}

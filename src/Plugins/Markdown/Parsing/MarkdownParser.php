<?php

namespace Hollyit\RichEditorPlus\Plugins\Markdown\Parsing;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use DOMXPath;
use Hollyit\RichEditorPlus\Content\ContentSchema;
use Hollyit\RichEditorPlus\Content\ContentSpec;
use Hollyit\RichEditorPlus\Content\HtmlParser;
use Hollyit\RichEditorPlus\Plugins\Core\HeadingPlugin;
use Hollyit\RichEditorPlus\Plugins\Image\ImagePlugin;
use Hollyit\RichEditorPlus\Support\PluginRegistry;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\MarkdownConverter;

/**
 * Markdown (GFM) to a document: CommonMark writes HTML, a few DOM passes shape it the way the plugins parse it, and the
 * field's schema parser builds the document. What the field's schema doesn't know is kept as text.
 */
class MarkdownParser
{
    /**
     * How deep CommonMark nests blocks and inlines before it reads the rest as text, so deep input can't exhaust the
     * stack or produce a document too deep to encode.
     */
    public const int MAX_NESTING_LEVEL = 100;

    /**
     * Elements that hold blocks once the DOM passes are done. Anything else at block level is inline content.
     */
    protected const array BLOCK_TAGS = [
        'ul', 'ol', 'li', 'p', 'pre', 'blockquote', 'table', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
    ];

    /**
     * Block containers from raw HTML that no plugin parses: they are unwrapped into their children, with any inline
     * runs in them made paragraphs, so no text or line break ends up at block level.
     */
    protected const array CONTAINER_TAGS = [
        'address', 'article', 'aside', 'center', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
        'figure', 'footer', 'form', 'header', 'hgroup', 'main', 'nav', 'search', 'section', 'summary',
    ];

    /**
     * Where an image stops being lifted out of its ancestors: the block it ends up in.
     */
    protected const array IMAGE_STOP_TAGS = [
        'body', 'p', 'li', 'td', 'th', 'blockquote', 'pre', 'figure', 'figcaption', 'caption',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    ];

    /**
     * Tags the schema parser skips with their content, so they never start a paragraph of their own.
     */
    protected const array SKIPPED_TAGS = ['script', 'style', 'template', 'head', 'title', 'noscript', 'object'];

    /**
     * @return array<string, mixed>
     */
    public function parse(string $markdown, PluginRegistry $registry): array
    {
        $schema = ContentSchema::fromRegistry($registry);

        return (new HtmlParser($schema))->parse($this->prepareHtml($this->toHtml($markdown), $registry, $schema));
    }

    public function toHtml(string $markdown): string
    {
        $environment = new Environment(['html_input' => 'allow', 'allow_unsafe_links' => false, 'max_nesting_level' => self::MAX_NESTING_LEVEL]);
        $environment->addExtension(new CommonMarkCoreExtension);
        $environment->addExtension(new GithubFlavoredMarkdownExtension);

        return (string) (new MarkdownConverter($environment))->convert($markdown);
    }

    protected function prepareHtml(string $html, PluginRegistry $registry, ContentSchema $schema): string
    {
        if (trim($html) === '') {
            return '';
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $usedInternalErrors = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8" ?><html><body>'.$html.'</body></html>');
        libxml_clear_errors();
        libxml_use_internal_errors($usedInternalErrors);

        $xpath = new DOMXPath($document);
        $hasImages = $schema->node('image') !== null;

        if ($hasImages) {
            $this->unwrapImageFigures($document, $xpath);
        }

        $this->unwrapContainers($document, $xpath, $schema);
        $this->wrapStrayInlines($document, $xpath);
        $this->rewriteTaskLists($xpath);

        if ($hasImages) {
            $this->replaceUnusableImages($document, $xpath);
            $this->hoistImages($xpath);
        }

        $this->wrapCellAndItemInlines($document, $xpath);
        $this->trimCodeBlocks($xpath);
        $this->trimAfterBreaks($xpath);
        $this->clampHeadings($document, $xpath, $registry);

        if ($hasImages) {
            $this->wrapImages($document, $xpath);
        }

        $this->fillEmptyBlocks($document, $xpath);

        $body = $document->getElementsByTagName('body')->item(0);
        $output = '';

        foreach ($body?->childNodes ?? [] as $child) {
            $output .= $document->saveHTML($child);
        }

        return $output;
    }

    /**
     * GFM writes a task item as `<li><input type="checkbox" …> text</li>` (or with the input inside the item's first
     * paragraph when the list is loose). A list becomes a task list only when every item starts with a checkbox.
     */
    protected function rewriteTaskLists(DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//ul')) as $list) {
            $items = [];

            foreach ($list->childNodes as $child) {
                if ($child instanceof DOMElement && strtolower($child->tagName) === 'li') {
                    $items[] = $child;
                }
            }

            $checkboxes = array_map($this->leadingCheckbox(...), $items);

            if ($items === [] || in_array(null, $checkboxes, true)) {
                continue;
            }

            $list->setAttribute('data-type', 'taskList');

            foreach ($items as $index => $item) {
                $checkbox = $checkboxes[$index];
                $item->setAttribute('data-type', 'taskItem');
                $item->setAttribute('data-checked', $checkbox->hasAttribute('checked') ? 'true' : 'false');

                if ($checkbox->nextSibling instanceof DOMText) {
                    $checkbox->nextSibling->data = ltrim($checkbox->nextSibling->data, ' ');
                }

                $checkbox->parentNode?->removeChild($checkbox);
            }
        }
    }

    /**
     * CommonMark leaves a tight list item's text, and every table cell's text, bare, but list items and cells hold
     * blocks: each run of inline content becomes a paragraph, block children stay as they are, and an empty cell gets
     * an empty paragraph.
     */
    protected function wrapCellAndItemInlines(DOMDocument $document, DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//li | //td | //th')) as $item) {
            $this->wrapInlineRuns($document, $item);

            if (! $item->hasChildNodes() && in_array(strtolower($item->tagName), ['td', 'th'], true)) {
                $item->appendChild($document->createElement('p'));
            }
        }
    }

    /**
     * Wraps each run of inline content among `$parent`'s children in a paragraph; block children stay as they are.
     * With `$dropsBareBreaks`, a run of nothing but line breaks is removed instead: at block level it has no
     * paragraph to break.
     */
    protected function wrapInlineRuns(DOMDocument $document, DOMElement $parent, bool $dropsBareBreaks = false): void
    {
        $paragraph = null;
        $paragraphs = [];

        foreach (iterator_to_array($parent->childNodes) as $child) {
            if ($child instanceof DOMElement && in_array(strtolower($child->tagName), self::BLOCK_TAGS, true)) {
                $paragraph = null;

                continue;
            }

            $isSkipped = ! $child instanceof DOMText && ! $child instanceof DOMElement
                || ($child instanceof DOMElement && in_array(strtolower($child->tagName), self::SKIPPED_TAGS, true));

            if (($child instanceof DOMText && trim($child->data) === '') || ($dropsBareBreaks && $isSkipped)) {
                if ($paragraph !== null && $child instanceof DOMText) {
                    // A space between two inline elements (`*a* *b*`) belongs to the run.
                    $paragraph->appendChild($child);
                } elseif ($child instanceof DOMText) {
                    $parent->removeChild($child);
                }

                continue;
            }

            if ($paragraph === null) {
                $paragraph = $document->createElement('p');
                $parent->insertBefore($paragraph, $child);
                $paragraphs[] = $paragraph;
            }

            $paragraph->appendChild($child);
        }

        if ($paragraph?->lastChild instanceof DOMText) {
            $paragraph->lastChild->data = rtrim($paragraph->lastChild->data);
        }

        if (! $dropsBareBreaks) {
            return;
        }

        foreach ($paragraphs as $wrapped) {
            if (trim($wrapped->textContent) === '' && $wrapped->getElementsByTagName('img')->length === 0) {
                $hasOnlyBreaks = true;

                foreach ($wrapped->getElementsByTagName('*') as $element) {
                    if (strtolower($element->tagName) !== 'br') {
                        $hasOnlyBreaks = false;
                    }
                }

                if ($hasOnlyBreaks) {
                    $parent->removeChild($wrapped);
                }
            }
        }
    }

    /**
     * Unknown block containers from raw HTML (`<div>`, `<details>`, `<center>`, a stray `<li>` …) would leave their
     * text at block level, which the editor refuses: each is replaced by its children, its inline runs made
     * paragraphs. Innermost first, so a container's paragraphs are blocks to the one around it. A container inside
     * inline content is left to the schema parser, which unwraps it as text.
     */
    protected function unwrapContainers(DOMDocument $document, DOMXPath $xpath, ContentSchema $schema): void
    {
        $containers = array_filter(
            iterator_to_array($xpath->query('//body//*')),
            fn (DOMNode $element): bool => $element instanceof DOMElement && $this->isUnknownContainer($element, $schema),
        );

        foreach (array_reverse($containers) as $container) {
            $parent = $container->parentNode;

            if (! $parent instanceof DOMElement || ! $this->holdsBlocks($parent, $schema)) {
                continue;
            }

            $this->wrapInlineRuns($document, $container, dropsBareBreaks: true);

            while ($container->firstChild !== null) {
                $parent->insertBefore($container->firstChild, $container);
            }

            $parent->removeChild($container);
        }
    }

    protected function isUnknownContainer(DOMElement $element, ContentSchema $schema): bool
    {
        $tag = strtolower($element->tagName);

        if ($tag === 'li') {
            $parentTag = $element->parentNode instanceof DOMElement ? strtolower($element->parentNode->tagName) : '';

            return ! in_array($parentTag, ['ul', 'ol'], true);
        }

        return in_array($tag, self::CONTAINER_TAGS, true) && $schema->matchNode($element) === null;
    }

    protected function holdsBlocks(DOMElement $element, ContentSchema $schema): bool
    {
        return in_array(strtolower($element->tagName), ['body', 'blockquote', 'li', 'td', 'th'], true)
            || $this->isUnknownContainer($element, $schema);
    }

    /**
     * Inline content directly in the body or a quote (from raw HTML: `<br>` between blocks, a lone `<img>`, text)
     * becomes paragraphs; runs of nothing but line breaks are dropped. List items and cells get the same in
     * {@see wrapCellAndItemInlines()}.
     */
    protected function wrapStrayInlines(DOMDocument $document, DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//body | //blockquote')) as $element) {
            $this->wrapInlineRuns($document, $element, dropsBareBreaks: true);
        }
    }

    protected function leadingCheckbox(DOMElement $item): ?DOMElement
    {
        $first = $item->firstElementChild;

        if ($first !== null && strtolower($first->tagName) === 'p') {
            $first = $first->firstElementChild;
        }

        return $first !== null && strtolower($first->tagName) === 'input' && strtolower($first->getAttribute('type')) === 'checkbox'
            ? $first
            : null;
    }

    /**
     * CommonMark ends fenced code with a newline the editor doesn't keep.
     */
    protected function trimCodeBlocks(DOMXPath $xpath): void
    {
        foreach ($xpath->query('//pre/code') as $code) {
            $last = $code->lastChild;

            if ($last instanceof DOMText && str_ends_with($last->data, "\n")) {
                $last->data = substr($last->data, 0, -1);
            }
        }
    }

    /**
     * CommonMark writes a newline after `<br />`, which would show as a leading space on the next line.
     */
    protected function trimAfterBreaks(DOMXPath $xpath): void
    {
        foreach ($xpath->query('//br') as $break) {
            if ($break->nextSibling instanceof DOMText) {
                $break->nextSibling->data = ltrim($break->nextSibling->data, "\n");
            }
        }
    }

    /**
     * A heading level the field doesn't offer moves to the smallest offered level at or above it, else the largest.
     */
    protected function clampHeadings(DOMDocument $document, DOMXPath $xpath, PluginRegistry $registry): void
    {
        $heading = null;

        foreach ($registry->getPlugins() as $plugin) {
            if ($plugin instanceof HeadingPlugin) {
                $heading = $plugin;
            }
        }

        $levels = $heading?->getLevels() ?? [];
        sort($levels);

        if ($levels === []) {
            return;
        }

        foreach (iterator_to_array($xpath->query('//h1|//h2|//h3|//h4|//h5|//h6')) as $element) {
            $level = (int) substr($element->tagName, 1);

            if (in_array($level, $levels, true)) {
                continue;
            }

            $target = null;

            foreach ($levels as $allowed) {
                if ($allowed >= $level) {
                    $target = $allowed;

                    break;
                }
            }

            $this->rename($document, $element, 'h'.($target ?? end($levels)));
        }
    }

    /**
     * A paragraph holding only one image becomes the image package's figure, with the title as its caption.
     */
    protected function wrapImages(DOMDocument $document, DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//p[img]')) as $paragraph) {
            $replacements = [];
            $piece = null;

            $flush = function () use (&$piece, &$replacements): void {
                if ($piece !== null) {
                    if ($piece->firstChild instanceof DOMText) {
                        $piece->firstChild->data = ltrim($piece->firstChild->data);
                    }

                    if ($piece->lastChild instanceof DOMText) {
                        $piece->lastChild->data = rtrim($piece->lastChild->data);
                    }

                    if ($piece->childNodes->length > 0 && ($piece->firstElementChild !== null || trim($piece->textContent) !== '')) {
                        $replacements[] = $piece;
                    }
                }

                $piece = null;
            };

            foreach (iterator_to_array($paragraph->childNodes) as $child) {
                if ($child instanceof DOMElement && strtolower($child->tagName) === 'img') {
                    $flush();
                    $replacements[] = $this->imageFigure($document, $child);

                    continue;
                }

                $piece ??= $document->createElement('p');
                $piece->appendChild($child);
            }

            $flush();

            foreach ($replacements as $replacement) {
                $paragraph->parentNode?->insertBefore($replacement, $paragraph);
            }

            $paragraph->parentNode?->removeChild($paragraph);
        }
    }

    /**
     * An image figure written as raw HTML becomes a plain `<img>`, so it goes through the same checks as Markdown
     * images. Its disk, path, alignment and width have no Markdown form and are dropped.
     */
    protected function unwrapImageFigures(DOMDocument $document, DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//figure[@data-type="image"]')) as $figure) {
            $source = $figure->getElementsByTagName('img')->item(0);
            $caption = $figure->getElementsByTagName('figcaption')->item(0);

            $image = $document->createElement('img');
            $image->setAttribute('src', $figure->getAttribute('data-url'));
            $image->setAttribute('alt', $source instanceof DOMElement ? $source->getAttribute('alt') : '');

            if ($caption !== null && trim($caption->textContent) !== '') {
                $image->setAttribute('title', trim($caption->textContent));
            }

            $paragraph = $document->createElement('p');
            $paragraph->appendChild($image);
            $figure->parentNode?->replaceChild($paragraph, $figure);
        }
    }

    /**
     * An image without a usable URL (`![a]()`, `![a](javascript:…)`) has nothing the editor can show or Markdown can
     * write back: it becomes its alt text.
     */
    protected function replaceUnusableImages(DOMDocument $document, DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//img')) as $image) {
            if (! ImagePlugin::isAllowedImageUrl($image->getAttribute('src'))) {
                $this->replaceWithAlt($document, $image);
            }
        }
    }

    /**
     * Images are blocks in the editor, so one inside inline markup (`[![badge](u)](link)`, `*a ![x](u) b*`) is lifted
     * out to the nearest block, splitting the markup around it: the text keeps its link or emphasis, the image loses
     * it. An image in a heading or code block, which hold only text, becomes its alt text where it is, so a link
     * around it stays. One that lands in the body or a quote gets a paragraph, so {@see wrapImages()} makes it a
     * figure.
     */
    protected function hoistImages(DOMXPath $xpath): void
    {
        $document = $xpath->document;

        foreach (iterator_to_array($xpath->query('//img')) as $image) {
            $block = $image->parentNode;

            while ($block instanceof DOMElement && ! in_array(strtolower($block->tagName), self::IMAGE_STOP_TAGS, true)) {
                $block = $block->parentNode;
            }

            $blockTag = $block instanceof DOMElement ? strtolower($block->tagName) : '';

            if (! in_array($blockTag, ['body', 'blockquote', 'p', 'li', 'td', 'th'], true)) {
                $this->replaceWithAlt($document, $image);

                continue;
            }

            while ($image->parentNode !== $block && $image->parentNode instanceof DOMElement) {
                $this->splitAround($image->parentNode, $image);
            }

            if (in_array($blockTag, ['body', 'blockquote'], true)) {
                $paragraph = $document->createElement('p');
                $block->replaceChild($paragraph, $image);
                $paragraph->appendChild($image);
            }
        }
    }

    /**
     * Replaces `$element` with up to three siblings: a shallow copy holding the children before `$child`, `$child`
     * itself, and a copy holding the children after it.
     */
    protected function splitAround(DOMElement $element, DOMNode $child): void
    {
        $parent = $element->parentNode;

        if ($parent === null) {
            return;
        }

        $before = $element->cloneNode(false);
        $after = $element->cloneNode(false);

        while ($element->firstChild !== null && $element->firstChild !== $child) {
            $before->appendChild($element->firstChild);
        }

        while ($child->nextSibling !== null) {
            $after->appendChild($child->nextSibling);
        }

        if ($before->hasChildNodes()) {
            $parent->insertBefore($before, $element);
        }

        $parent->insertBefore($child, $element);

        if ($after->hasChildNodes()) {
            $parent->insertBefore($after, $element);
        }

        $parent->removeChild($element);
    }

    protected function replaceWithAlt(DOMDocument $document, DOMElement $image): void
    {
        $alt = $image->getAttribute('alt');

        if ($alt === '') {
            $image->parentNode?->removeChild($image);

            return;
        }

        $image->parentNode?->replaceChild($document->createTextNode($alt), $image);
    }


    /**
     * A list or task item must start with a paragraph and a quote must hold a block, as the editor's schema says. An
     * item that would start with another block (a figure, a code block, a quote) gets an empty paragraph first, and an
     * empty item or quote gets an empty paragraph.
     */
    protected function fillEmptyBlocks(DOMDocument $document, DOMXPath $xpath): void
    {
        foreach (iterator_to_array($xpath->query('//li | //blockquote')) as $element) {
            $first = $element->firstChild;

            while ($first !== null && ! $first instanceof DOMElement && (! $first instanceof DOMText || trim($first->data) === '')) {
                $first = $first->nextSibling;
            }

            $isItem = strtolower($element->tagName) === 'li';

            if ($first === null || ($isItem && (! $first instanceof DOMElement || strtolower($first->tagName) !== 'p'))) {
                $element->insertBefore($document->createElement('p'), $element->firstChild);
            }
        }
    }

    protected function imageFigure(DOMDocument $document, DOMElement $image): DOMElement
    {
        $figure = $document->createElement('figure');
        $figure->setAttribute('data-type', 'image');
        $figure->setAttribute('data-url', $image->getAttribute('src'));

        $img = $document->createElement('img');
        $img->setAttribute('alt', $image->getAttribute('alt'));
        $figure->appendChild($img);

        if (trim($image->getAttribute('title')) !== '') {
            $caption = $document->createElement('figcaption');
            $caption->appendChild($document->createTextNode($image->getAttribute('title')));
            $figure->appendChild($caption);
        }

        return $figure;
    }

    protected function rename(DOMDocument $document, DOMElement $element, string $tag): void
    {
        $replacement = $document->createElement($tag);

        while ($element->firstChild !== null) {
            $replacement->appendChild($element->firstChild);
        }

        $element->parentNode?->replaceChild($replacement, $element);
    }
}

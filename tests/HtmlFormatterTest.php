<?php

use Webwizardsusa\RichEditorPlus\Support\HtmlFormatter;

it('puts each block on its own line and indents nested blocks', function (): void {
    expect(HtmlFormatter::format('<h2>Title</h2><ul><li><p>One</p></li><li><p>Two</p></li></ul>'))
        ->toBe("<h2>Title</h2>\n<ul>\n  <li>\n    <p>One</p>\n  </li>\n  <li>\n    <p>Two</p>\n  </li>\n</ul>");
});

it('keeps inline markup and attributes on the line of its block', function (): void {
    expect(HtmlFormatter::format('<p style="text-align: right">A <strong>bold</strong> <a href="https://example.com?a=1&amp;b=2">link</a><br>next</p>'))
        ->toBe('<p style="text-align: right">A <strong>bold</strong> <a href="https://example.com?a=1&amp;b=2">link</a><br>next</p>');
});

it('leaves the text of a code block as it is', function (): void {
    expect(HtmlFormatter::format("<pre><code>if (a) {\n    b();\n}</code></pre><p>after</p>"))
        ->toBe("<pre><code>if (a) {\n    b();\n}</code></pre>\n<p>after</p>");
});

it('writes void elements without a closing tag', function (): void {
    expect(HtmlFormatter::format('<p>a</p><hr><p>b</p>'))->toBe("<p>a</p>\n<hr>\n<p>b</p>");
});

it('keeps text outside the known blocks escaped', function (): void {
    expect(HtmlFormatter::format('<p>1 &lt; 2 &amp; “quotes”</p>'))->toBe('<p>1 &lt; 2 &amp; “quotes”</p>');
});

it('returns an empty string for empty HTML', function (): void {
    expect(HtmlFormatter::format(''))->toBe('');
});

it('keeps the attributes of a block it spreads over several lines', function (): void {
    expect(HtmlFormatter::format('<blockquote class="note" data-label="Tom &amp; &quot;Jerry&quot;"><p>q</p></blockquote>'))
        ->toBe("<blockquote class=\"note\" data-label=\"Tom &amp; &quot;Jerry&quot;\">\n  <p>q</p>\n</blockquote>");
});

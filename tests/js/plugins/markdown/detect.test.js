import { describe, expect, it } from 'vitest'
import { looksLikeMarkdown } from '../../../../resources/js/plugins/markdown/detect'

describe('looksLikeMarkdown', () => {
    it.each([
        '# Heading',
        '###### Deep',
        '> quoted',
        '- item',
        '* item',
        '+ item',
        '1. first',
        '```js\ncode\n```',
        '- [ ] task',
        '| a | b |\n| --- | --- |\n| 1 | 2 |',
        'see [the docs](https://example.com)',
        'this is **important**',
        'run `npm test` now',
        'Intro line\n\n## Section',
    ])('converts %j', (text) => {
        expect(looksLikeMarkdown(text)).toBe(true)
    })

    it.each([
        '',
        '   ',
        'Just a sentence.',
        'Two lines\nof prose.',
        'C# is a language',
        '#hashtag',
        'Price: 5 * 3 = 15',
        'a | b without a separator row',
        'email me at a@b.com',
        '1.5 million',
    ])('leaves %j alone', (text) => {
        expect(looksLikeMarkdown(text)).toBe(false)
    })
})

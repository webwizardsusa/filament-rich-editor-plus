const OBJECT_REPLACEMENT = '￼'

const WORD_CHARACTER_BEFORE = /[\p{L}\p{N}\p{M}_]$/u
const WORD_CHARACTER_AFTER = /^[\p{L}\p{N}\p{M}_]/u

// Only syntax characters and `/`: under the `u` flag, escaping anything else is an error.
const escapeRegExp = (text) => text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&')

/**
 * The block's text with one character per document position, so an index is an offset. Anything that isn't text becomes
 * a character no query can match, which stops a match crossing it and counts as a word boundary.
 */
function blockText(block) {
    let text = ''

    block.forEach((child) => {
        text += child.isText ? child.text : OBJECT_REPLACEMENT.repeat(child.nodeSize)
    })

    return text
}

// Two code units are enough to hold one character either side.
const isWholeWord = (text, start, end) =>
    !WORD_CHARACTER_BEFORE.test(text.slice(Math.max(0, start - 2), start)) &&
    !WORD_CHARACTER_AFTER.test(text.slice(end, end + 2))

/**
 * Finds a plain-text query in every textblock. A whole word candidate that fails restarts one character on, not after
 * itself, because a later match can begin inside it. That step must not land inside a surrogate pair, where the search
 * would find the same candidate again.
 */
export function findMatches(doc, { query, matchCase, wholeWord }) {
    if (query === '' || query.includes(OBJECT_REPLACEMENT)) {
        return []
    }

    const pattern = new RegExp(escapeRegExp(query), matchCase ? 'gu' : 'giu')
    const matches = []

    doc.descendants((node, position) => {
        if (!node.isTextblock) {
            return true
        }

        const text = blockText(node)

        pattern.lastIndex = 0

        for (let found = pattern.exec(text); found; found = pattern.exec(text)) {
            const start = found.index
            const end = start + found[0].length

            if (!wholeWord || isWholeWord(text, start, end)) {
                matches.push({ from: position + 1 + start, to: position + 1 + end })
            } else {
                pattern.lastIndex = start + (text.codePointAt(start) > 0xffff ? 2 : 1)
            }
        }

        return false
    })

    return matches
}

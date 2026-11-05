const blockPatterns = [
    /^#{1,6}\s+\S/m, // heading
    /^>\s/m, // quote
    /^[-*+]\s+\S/m, // bullet (and task) item
    /^\d+[.)]\s+\S/m, // ordered item
    /^(```|~~~)/m, // code fence
]

// A table row followed by a separator row of dashes, optionally with alignment colons.
const tablePattern = /^\|?[^\n]*\|[^\n]*\n\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/m

const inlinePatterns = [
    /\[[^\]\n]+\]\([^)\s]+\)/, // [text](url)
    /\*\*[^*\n]+\*\*/, // **bold**
    /`[^`\n]+`/, // `code`
]

/**
 * Whether pasted plain text looks like Markdown worth converting. Plain prose stays plain text.
 */
export function looksLikeMarkdown(text) {
    if (typeof text !== 'string' || text.trim() === '') {
        return false
    }

    return [...blockPatterns, tablePattern, ...inlinePatterns].some((pattern) => pattern.test(text))
}

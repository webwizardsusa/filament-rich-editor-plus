import { Extension } from '@tiptap/core'

/**
 * One property's value from raw `style` text, read as `GlobalAttribute::styleValue()` reads it in PHP: split on `;`,
 * then on the first `:`, the property matched without regard to case and the last declaration winning. The browser's
 * `element.style` is not used, because it rewrites values (`#f00` becomes `rgb(255, 0, 0)`).
 */
export function styleValue(style, property) {
    const wanted = property.toLowerCase()
    let found = null

    style.split(';').forEach((declaration) => {
        const colon = declaration.indexOf(':')

        if (colon !== -1 && declaration.slice(0, colon).trim().toLowerCase() === wanted) {
            found = declaration.slice(colon + 1).trim()
        }
    })

    return found
}

/**
 * The value to keep, or null when it isn't valid, by the rules of `GlobalAttribute::normalize()` in PHP.
 */
export function normalize(attribute, value) {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()

    if (trimmed === '' || (attribute.kind === 'style' && trimmed.includes(';'))) {
        return null
    }

    if (attribute.values) {
        return attribute.values.find((allowed) => allowed.toLowerCase() === trimmed.toLowerCase()) ?? null
    }

    return (attribute.regex ?? compilePattern(attribute)).test(trimmed) ? trimmed : null
}

/**
 * The attribute's pattern as the anchored `u` expression PHP runs. It throws when JavaScript can't compile the pattern.
 */
function compilePattern(attribute) {
    return new RegExp(`^(?:${attribute.pattern})$`, 'u')
}

const parse = (attribute) => (element) => {
    if (attribute.kind === 'style') {
        return normalize(attribute, styleValue(element.getAttribute('style') ?? '', attribute.key))
    }

    return element.hasAttribute(attribute.key) ? normalize(attribute, element.getAttribute(attribute.key)) : null
}

const render = (attribute) => (attrs) => {
    const value = normalize(attribute, attrs[attribute.name])

    if (value === null) {
        return {}
    }

    return attribute.kind === 'style' ? { style: `${attribute.key}: ${value}` } : { [attribute.key]: value }
}

/**
 * The browser side of the global attributes one PHP plugin declares (see `GlobalAttribute`). PHP sends one of these
 * per plugin, named after it, with `types` already resolved to node and mark names.
 */
export function globalAttributesExtension({ name, attributes: declared }) {
    const attributes = declared.map((attribute) => (attribute.pattern === null ? attribute : { ...attribute, regex: compilePattern(attribute) }))

    return Extension.create({
        name,

        addGlobalAttributes() {
            return attributes.map((attribute) => ({
                types: attribute.types,
                attributes: {
                    [attribute.name]: {
                        default: null,
                        keepOnSplit: attribute.keepOnSplit,
                        parseHTML: parse(attribute),
                        renderHTML: render(attribute),
                    },
                },
            }))
        },
    })
}

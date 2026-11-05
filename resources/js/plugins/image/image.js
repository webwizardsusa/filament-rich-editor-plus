import { Node } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { createUrlCache } from './url-cache'

export const ALIGNMENTS = ['left', 'center', 'right', 'wide']

// Characters browsers ignore in a URL's scheme, removed before reading it, as PHP's `ContentSpec::isAllowedUrl()` does.
const IGNORED_URL_CHARACTERS = /[\u0000-\u0020\u007F-\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/gu

// The same test as PHP's `ImagePlugin::isAllowedImageUrl()`: http(s) or relative; `javascript:`, `data:` and other
// schemes are refused.
const isAllowedImageUrl = (value) => {
    if (typeof value !== 'string' || value.trim() === '') {
        return false
    }

    const scheme = value.replace(IGNORED_URL_CHARACTERS, '').match(/^([a-z][a-z0-9+.-]*):/i)

    return scheme === null || ['http', 'https'].includes(scheme[1].toLowerCase())
}

const imageUrl = (value) => (isAllowedImageUrl(value) ? value.trim() : null)

const isUpload = ({ disk, path }) => typeof disk === 'string' && typeof path === 'string'

const isImageSelected = (state) => state.selection instanceof NodeSelection && state.selection.node.type.name === 'image'

/**
 * The `image` block (PHP: `ImagePlugin`): a figure with an image, alt text, an optional caption, an alignment and a
 * width. Uploads keep their disk and path; their URL is looked up through the field and never written to the HTML.
 */
export function imageExtension({ widths = [], defaultWidth = '100', defaultAlignment = 'center', altRequired = false, uploads = null, labels = {} }, { callPlugin, runAction } = {}) {
    const cache = createUrlCache(callPlugin, 'hollyit/image')
    const alignment = (value) => (ALIGNMENTS.includes(value) ? value : defaultAlignment)
    const width = (value) => (widths.includes(String(value)) ? String(value) : defaultWidth)
    const text = (value) => (typeof value === 'string' ? value : '')

    /**
     * Keeps only the attributes the node has, each in the shape PHP accepts, so commands cannot store an unsafe URL or
     * an unknown alignment or width.
     */
    const clean = (attrs) => {
        const cleaners = {
            disk: (value) => (typeof value === 'string' && value !== '' ? value : null),
            path: (value) => (typeof value === 'string' && value !== '' ? value : null),
            url: imageUrl,
            alt: text,
            caption: (value) => text(value).trim(),
            align: alignment,
            width,
        }

        return Object.fromEntries(
            Object.entries(attrs ?? {})
                .filter(([key]) => key in cleaners)
                .map(([key, value]) => [key, cleaners[key](value)]),
        )
    }

    return Node.create({
        name: 'image',
        group: 'block',
        atom: true,
        draggable: true,
        selectable: true,
        priority: 60,

        addAttributes() {
            const none = { renderHTML: () => ({}) }

            return {
                disk: { default: null, parseHTML: (element) => element.getAttribute('data-disk') || null, ...none },
                path: { default: null, parseHTML: (element) => element.getAttribute('data-path') || null, ...none },
                url: {
                    default: null,
                    parseHTML: (element) => imageUrl(element.tagName === 'IMG' ? element.getAttribute('src') : element.getAttribute('data-url')),
                    ...none,
                },
                alt: { default: '', parseHTML: (element) => (element.tagName === 'IMG' ? element : element.querySelector('img'))?.getAttribute('alt') ?? '', ...none },
                caption: { default: '', parseHTML: (element) => element.querySelector('figcaption')?.textContent.trim() ?? '', ...none },
                align: { default: defaultAlignment, parseHTML: (element) => alignment(element.getAttribute('data-align')), ...none },
                width: { default: defaultWidth, parseHTML: (element) => width(element.getAttribute('data-width')), ...none },
            }
        },

        parseHTML() {
            return [
                { tag: 'figure[data-type="image"]' },
                { tag: 'img[src]', getAttrs: (element) => (isAllowedImageUrl(element.getAttribute('src')) ? {} : false) },
            ]
        },

        // Mirrors `ImagePlugin::renderFigure()` without a `src`, as `toStorableHtml()` writes it.
        renderHTML({ node }) {
            const { disk, path, alt, caption } = node.attrs
            const url = imageUrl(node.attrs.url)
            const upload = isUpload(node.attrs)
            const figure = { class: 'rep-image', 'data-type': 'image' }

            if (upload) {
                figure['data-disk'] = disk
                figure['data-path'] = path
            } else if (url) {
                figure['data-url'] = url
            }

            figure['data-align'] = alignment(node.attrs.align)
            figure['data-width'] = width(node.attrs.width)

            const img = !upload && url ? { src: url, alt: text(alt) } : { alt: text(alt) }
            const children = [['img', img]]

            if (text(caption).trim() !== '') {
                children.push(['figcaption', {}, text(caption).trim()])
            }

            return ['figure', figure, ...children]
        },

        renderText({ node }) {
            return node.attrs.caption || node.attrs.alt || ''
        },

        addStorage() {
            return {
                uploadRoute: uploads ? { plugin: 'hollyit/image', kind: 'image', accept: uploads.accept ?? [], maxSize: uploads.maxSize ?? 0 } : null,
                urlCache: cache,
            }
        },

        addNodeView() {
            return ({ node: initial, editor, getPos }) => {
                let node = initial
                let renders = 0
                const dom = document.createElement('figure')

                const placeholder = (label) => {
                    const element = document.createElement('div')

                    element.className = 'rep-image-placeholder'
                    element.textContent = label

                    return element
                }

                const render = () => {
                    const { alt, caption } = node.attrs
                    const current = ++renders

                    // `classList` keeps ProseMirror's `ProseMirror-selectednode` when a selected image changes.
                    dom.classList.add('rep-image')
                    dom.dataset.type = 'image'
                    dom.dataset.align = alignment(node.attrs.align)
                    dom.dataset.width = width(node.attrs.width)
                    dom.replaceChildren()

                    const show = (src) => {
                        if (!src) {
                            dom.prepend(placeholder(labels.missing ?? 'Image missing'))

                            return
                        }

                        const img = document.createElement('img')

                        img.src = src
                        img.alt = text(alt)
                        dom.prepend(img)
                    }

                    if (text(caption).trim() !== '') {
                        const figcaption = document.createElement('figcaption')

                        figcaption.textContent = text(caption).trim()
                        dom.append(figcaption)
                    }

                    if (altRequired && editor.isEditable && text(alt).trim() === '') {
                        const badge = document.createElement('button')

                        badge.type = 'button'
                        badge.className = 'rep-image-badge'
                        badge.textContent = labels.needsAlt ?? 'Needs alt text'
                        badge.addEventListener('mousedown', (event) => event.preventDefault())
                        badge.addEventListener('click', (event) => {
                            event.preventDefault()
                            event.stopPropagation()

                            const position = getPos()

                            if (typeof position === 'number') {
                                editor.commands.setNodeSelection(position)
                                runAction?.('image')
                            }
                        })
                        dom.append(badge)
                    }

                    if (!isUpload(node.attrs)) {
                        show(imageUrl(node.attrs.url))

                        return
                    }

                    const loading = placeholder(labels.loading ?? 'Loading image…')

                    dom.prepend(loading)

                    cache.get(node.attrs.path, (src) => {
                        // A later render owns the figure now.
                        if (current !== renders) {
                            return
                        }

                        loading.remove()
                        show(src)
                    })
                }

                render()

                return {
                    dom,
                    update(updated) {
                        if (updated.type.name !== 'image') {
                            return false
                        }

                        const changed = Object.keys(updated.attrs).some((key) => updated.attrs[key] !== node.attrs[key])

                        node = updated

                        if (changed) {
                            render()
                        }

                        return true
                    },
                }
            }
        },

        addCommands() {
            return {
                insertImage:
                    (attrs) =>
                    ({ commands }) =>
                        commands.insertContent({ type: 'image', attrs: clean(attrs) }),

                updateImage:
                    (attrs) =>
                    ({ state, commands }) =>
                        isImageSelected(state) && commands.updateAttributes('image', clean(attrs)),

                setImageAlign:
                    (value) =>
                    ({ state, commands }) =>
                        isImageSelected(state) && ALIGNMENTS.includes(value) && commands.updateAttributes('image', { align: value }),

                setImageWidth:
                    (value) =>
                    ({ state, commands }) =>
                        isImageSelected(state) && widths.includes(value) && commands.updateAttributes('image', { width: value }),
            }
        },
    })
}

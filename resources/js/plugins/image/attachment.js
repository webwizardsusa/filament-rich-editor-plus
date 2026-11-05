import { Node } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { createUrlCache } from './url-cache'

const UNITS = ['KB', 'MB', 'GB']

/**
 * Bytes as `B`, `KB`, `MB` or `GB` (1024-based), one decimal place below 10 and whole numbers from 10, as PHP's
 * `StoresEditorFiles::formatFileSize()` does.
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    let value = bytes / 1024
    let unit = 0

    while (value >= 1024 && unit < UNITS.length - 1) {
        value /= 1024
        unit++
    }

    const rounded = Math.round(value * 10) / 10

    return `${rounded >= 10 ? Math.round(value) : rounded} ${UNITS[unit]}`
}

// The same rules as PHP's `AttachmentPlugin::sanitizeFileName()`, `normalizeSize()` and `normalizeMime()`.
export const cleanName = (value) =>
    Array.from(
        (typeof value === 'string' ? value : '')
            .replace(/[\u0000-\u001F\u007F/\\]/g, '')
            // Only ASCII spaces, as PHP's `trim()` leaves NBSP and other Unicode whitespace alone.
            .replace(/^ +| +$/g, ''),
    )
        .slice(0, 255)
        .join('')

const cleanSize = (value) => {
    if (Number.isInteger(value)) {
        return value >= 0 ? value : null
    }

    return typeof value === 'string' && /^\d{1,15}$/.test(value) ? Number(value) : null
}

const cleanMime = (value) => (typeof value === 'string' && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(value) ? value : null)

const cleanString = (value) => (typeof value === 'string' && value !== '' ? value : null)

const isUpload = ({ disk, path }) => typeof disk === 'string' && typeof path === 'string'

const isAttachmentSelected = (state) => state.selection instanceof NodeSelection && state.selection.node.type.name === 'attachment'

/**
 * The `attachment` block (PHP: `AttachmentPlugin`): a card with the file's name, its size and a download link. The
 * link's URL is looked up through the field and never written to the HTML.
 */
export function attachmentExtension({ uploads = null, labels = {} }, { callPlugin } = {}) {
    const cache = createUrlCache(callPlugin, 'webwizardsusa/attachment')

    const clean = (attrs) => {
        const cleaners = { disk: cleanString, path: cleanString, name: cleanName, size: cleanSize, mime: cleanMime }

        return Object.fromEntries(
            Object.entries(attrs ?? {})
                .filter(([key]) => key in cleaners)
                .map(([key, value]) => [key, cleaners[key](value)]),
        )
    }

    return Node.create({
        name: 'attachment',
        group: 'block',
        atom: true,
        draggable: true,
        selectable: true,
        priority: 55,

        addStorage() {
            return {
                uploadRoute: uploads ? { plugin: 'webwizardsusa/attachment', kind: 'attachment', accept: uploads.accept ?? [], maxSize: uploads.maxSize ?? 0 } : null,
                urlCache: cache,
            }
        },

        addAttributes() {
            const none = { renderHTML: () => ({}) }

            return {
                disk: { default: null, parseHTML: (element) => element.getAttribute('data-disk') || null, ...none },
                path: { default: null, parseHTML: (element) => element.getAttribute('data-path') || null, ...none },
                name: { default: '', parseHTML: (element) => cleanName(element.querySelector('a')?.textContent ?? ''), ...none },
                size: { default: null, parseHTML: (element) => cleanSize(element.getAttribute('data-size')), ...none },
                mime: { default: null, parseHTML: (element) => cleanMime(element.getAttribute('data-mime')), ...none },
            }
        },

        parseHTML() {
            return [{ tag: 'div[data-type="attachment"]' }]
        },

        // Mirrors `AttachmentPlugin::renderCard()` without an `href`, as `toStorableHtml()` writes it.
        renderHTML({ node }) {
            const upload = isUpload(node.attrs)
            const size = cleanSize(node.attrs.size)
            const mime = cleanMime(node.attrs.mime)
            const name = cleanName(node.attrs.name)
            const card = { class: 'rep-attachment', 'data-type': 'attachment' }

            if (upload) {
                card['data-disk'] = node.attrs.disk
                card['data-path'] = node.attrs.path
            }

            if (size !== null) {
                card['data-size'] = String(size)
            }

            if (mime !== null) {
                card['data-mime'] = mime
            }

            const children = [['a', { download: name }, name]]

            if (size !== null) {
                children.push(['span', { class: 'rep-attachment-size' }, formatFileSize(size)])
            }

            return ['div', card, ...children]
        },

        renderText({ node }) {
            return node.attrs.name || ''
        },

        addNodeView() {
            return ({ node: initial }) => {
                let node = initial
                let renders = 0
                const dom = document.createElement('div')

                const render = () => {
                    const current = ++renders
                    const size = cleanSize(node.attrs.size)
                    const mime = cleanMime(node.attrs.mime)

                    // `classList` keeps ProseMirror's `ProseMirror-selectednode` when a selected card changes.
                    dom.classList.add('rep-attachment')
                    dom.dataset.type = 'attachment'

                    if (mime) {
                        dom.dataset.mime = mime
                    } else {
                        delete dom.dataset.mime
                    }

                    dom.replaceChildren()

                    const name = document.createElement('span')
                    name.className = 'rep-attachment-name'
                    name.textContent = cleanName(node.attrs.name)
                    dom.append(name)

                    if (size !== null) {
                        const sizeText = document.createElement('span')
                        sizeText.className = 'rep-attachment-size'
                        sizeText.textContent = formatFileSize(size)
                        dom.append(sizeText)
                    }

                    const status = document.createElement('span')
                    status.className = 'rep-attachment-status'
                    dom.append(status)

                    const show = (url) => {
                        if (!url) {
                            status.textContent = labels.missing ?? 'File missing'

                            return
                        }

                        const link = document.createElement('a')
                        link.className = 'rep-attachment-open'
                        link.href = url
                        link.target = '_blank'
                        link.rel = 'noopener noreferrer'
                        link.textContent = labels.open ?? 'Open'
                        status.replaceWith(link)
                    }

                    if (!isUpload(node.attrs)) {
                        show(null)

                        return
                    }

                    status.textContent = labels.loading ?? 'Loading…'

                    cache.get(node.attrs.path, (url) => {
                        // A later render owns the card now.
                        if (current === renders) {
                            show(url)
                        }
                    })
                }

                render()

                return {
                    dom,
                    update(updated) {
                        if (updated.type.name !== 'attachment') {
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
                insertAttachment:
                    (attrs) =>
                    ({ commands }) =>
                        commands.insertContent({ type: 'attachment', attrs: clean(attrs) }),

                updateAttachment:
                    (attrs) =>
                    ({ state, commands }) =>
                        isAttachmentSelected(state) && commands.updateAttributes('attachment', clean(attrs)),
            }
        },
    })
}

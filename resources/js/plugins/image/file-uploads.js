import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { cleanName, formatFileSize } from './attachment'

export const MAX_FILES = 10

const placeholders = new PluginKey('repUploadPlaceholders')

let nextId = 0

const fill = (template, values) =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`:${name}`, String(value)), template ?? '')

// A Filament notification when the page has Filament's notifications, the console otherwise.
const notify = (title, body) => {
    const Notification = window.FilamentNotification

    if (Notification) {
        new Notification().title(title).body(body).danger().send()

        return
    }

    console.warn(`[rich-editor-plus] ${title}: ${body}`)
}

/**
 * "Uploading name… 42%" widgets where files are going. They are decorations, so they are never part of the document,
 * the undo history or the HTML, and they move with edits made while the file uploads (`side: 1` keeps each after
 * content inserted at its position, so files of one paste land in order).
 */
const placeholderPlugin = () =>
    new Plugin({
        key: placeholders,
        state: {
            init: () => DecorationSet.empty,
            apply(tr, set) {
                let next = set.map(tr.mapping, tr.doc)
                const meta = tr.getMeta(placeholders)

                if (meta?.add) {
                    next = next.add(tr.doc, meta.add.map(({ id, pos, element }) => Decoration.widget(pos, element, { id, side: 1 })))
                }

                if (meta?.remove) {
                    next = next.remove(next.find(undefined, undefined, (spec) => spec.id === meta.remove))
                }

                return next
            },
        },
        props: {
            decorations(state) {
                return placeholders.getState(state)
            },
        },
    })

const reportUnexpected = (error) => console.error('[rich-editor-plus] File upload failed unexpectedly.', error)

const placeholderPosition = (state, id) => placeholders.getState(state).find(undefined, undefined, (spec) => spec.id === id)[0]?.from ?? null

// The routes the field's upload plugins put in their node storage, images before attachments.
const routesOf = (editor) =>
    Object.values(editor.storage)
        .map((storage) => storage?.uploadRoute)
        .filter(Boolean)
        .sort((a, b) => (a.kind === 'image' ? 0 : 1) - (b.kind === 'image' ? 0 : 1))

// Types some browsers and systems report for files the plugins know by another name (Windows reports a ZIP as
// `application/x-zip-compressed`, for one).
const TYPE_ALIASES = {
    'application/x-zip-compressed': 'application/zip',
    'application/x-zip': 'application/zip',
    'text/x-csv': 'text/csv',
    'application/csv': 'text/csv',
    'image/jpg': 'image/jpeg',
    'image/pjpeg': 'image/jpeg',
}

// Types that say nothing about the file: the server, which reads its contents, decides.
const UNKNOWN_TYPES = ['', 'application/octet-stream']

// Types a `type/*` wildcard never matches, as PHP's `StoresEditorFiles::WILDCARD_EXCLUDED_TYPES`: they can run script.
const WILDCARD_EXCLUDED_TYPES = ['image/svg+xml', 'text/html', 'text/xml', 'text/javascript']

// An accepted type matches itself, and `image/*` matches every `image/` type except SVG, as on the server.
const accepts = (accept, type) =>
    type !== '' && accept.some((accepted) => {
        const pattern = String(accepted).toLowerCase()

        return (
            pattern === type ||
            (pattern.endsWith('/*') && type.startsWith(pattern.slice(0, -1)) && !WILDCARD_EXCLUDED_TYPES.includes(type))
        )
    })

/**
 * The route for a file: the first that accepts its type. A file whose type the browser doesn't know
 * goes to the attachment route, when there is one. The server checks the real type either way.
 */
const routeFor = (routes, file) => {
    const type = String(file.type ?? '').toLowerCase()
    const normalized = TYPE_ALIASES[type] ?? type

    return (
        routes.find(({ accept }) => accepts(accept, normalized)) ??
        (UNKNOWN_TYPES.includes(normalized) ? routes.find(({ kind }) => kind === 'attachment') : undefined)
    )
}

const nodeFor = (route, answer) =>
    route.kind === 'image'
        ? { type: 'image', attrs: { disk: answer.disk, path: answer.path, alt: '' } }
        : {
              type: 'attachment',
              attrs: {
                  disk: answer.disk,
                  path: answer.path,
                  name: cleanName(answer.name),
                  size: Number.isInteger(answer.size) && answer.size >= 0 ? answer.size : null,
                  mime: typeof answer.mime === 'string' ? answer.mime : null,
              },
          }

const selectImage = (editor, path) => {
    let found = null

    editor.state.doc.descendants((node, pos) => {
        if (found === null && node.type.name === 'image' && node.attrs.path === path) {
            found = pos
        }

        return found === null
    })

    return found !== null && editor.commands.setNodeSelection(found)
}

/**
 * Uploads files pasted into or dropped onto the editor, through the plugin whose route accepts each file's type, and
 * inserts the result where the file's placeholder is when it is done. The server checks every file again; the checks
 * here only refuse early.
 */
export function fileUploadsExtension({ uploadLabels = {} }, context = {}) {
    const labels = uploadLabels

    const uploadOne = async (editor, { id, file, route, element }) => {
        const remove = (tr) => tr.setMeta(placeholders, { remove: id })
        const fail = (reason) => {
            if (!editor.isDestroyed) {
                editor.view.dispatch(remove(editor.state.tr))
            }

            notify(file.name, reason || labels.upload_failed || 'The upload failed.')

            return null
        }

        let answer

        try {
            const key = await context.upload(file, {
                onProgress: (percent) => {
                    element.textContent = fill(labels.uploading, { name: file.name, percent })
                },
            })

            answer = await context.callPlugin(route.plugin, 'store', { key })
        } catch (error) {
            return fail(null)
        }

        if (editor.isDestroyed) {
            return null
        }

        if (!answer || typeof answer.disk !== 'string' || typeof answer.path !== 'string') {
            return fail(typeof answer?.error === 'string' ? answer.error : null)
        }

        const pos = placeholderPosition(editor.state, id)

        // The file is stored, but there is nowhere left to put it.
        if (pos === null) {
            return fail(labels.place_lost)
        }

        if (route.kind === 'image') {
            editor.storage.image?.urlCache?.set(answer.path, answer.url)
        }

        editor
            .chain()
            .command(({ tr }) => {
                remove(tr)

                return true
            })
            .insertContentAt(pos, nodeFor(route, answer), { updateSelection: false })
            .run()

        return { kind: route.kind, path: answer.path }
    }

    const handleFiles = async (editor, fileList, pos) => {
        const files = [...fileList]
        const routes = routesOf(editor)
        const items = []

        if (files.length > MAX_FILES) {
            notify(files[MAX_FILES].name, fill(labels.too_many_files, { count: MAX_FILES }))
        }

        files.slice(0, MAX_FILES).forEach((file) => {
            const route = routeFor(routes, file)

            if (!route) {
                notify(file.name, fill(labels.not_accepted, { name: file.name }))

                return
            }

            if (file.size > route.maxSize * 1024) {
                notify(file.name, fill(labels.too_large, { name: file.name, size: formatFileSize(route.maxSize * 1024) }))

                return
            }

            const element = document.createElement('div')

            element.className = 'rep-upload-placeholder'
            element.contentEditable = 'false'
            element.textContent = fill(labels.uploading, { name: file.name, percent: 0 })
            items.push({ id: `rep-upload-${++nextId}`, file, route, element, pos })
        })

        if (!items.length) {
            return
        }

        editor.view.dispatch(editor.state.tr.setMeta(placeholders, { add: items }))

        const images = []

        for (const item of items) {
            if (editor.isDestroyed) {
                break
            }

            const inserted = await uploadOne(editor, item)

            if (inserted?.kind === 'image') {
                images.push(inserted.path)
            }
        }

        // One image goes straight to its modal for alt text and a caption; several keep their badges.
        if (images.length === 1 && !editor.isDestroyed && selectImage(editor, images[0])) {
            context.runAction?.('image')
        }
    }

    // The form waits for the whole batch, until every file is stored and in the document, not just uploaded.
    const holdForm = (batch) => (context.processing ? context.processing(batch) : batch)

    return Extension.create({
        name: 'repFileUploads',

        addProseMirrorPlugins() {
            const editor = this.editor

            return [
                placeholderPlugin(),
                new Plugin({
                    key: new PluginKey('repFileUploads'),
                    props: {
                        handlePaste(view, event) {
                            const data = event.clipboardData
                            const types = [...(data?.types ?? [])]

                            if (!editor.isEditable || !context.upload || !data?.files?.length || types.includes('text/html')) {
                                return false
                            }

                            event.preventDefault()
                            holdForm(handleFiles(editor, data.files, view.state.selection.from)).catch(reportUnexpected)

                            return true
                        },

                        handleDrop(view, event, slice, moved) {
                            const files = event.dataTransfer?.files

                            if (moved || !editor.isEditable || !context.upload || !files?.length) {
                                return false
                            }

                            let pos = view.state.selection.from

                            try {
                                pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? pos
                            } catch (error) {
                                // No layout (as in tests): the selection is the best position there is.
                            }

                            event.preventDefault()
                            holdForm(handleFiles(editor, files, pos)).catch(reportUnexpected)

                            return true
                        },
                    },
                }),
            ]
        },
    })
}

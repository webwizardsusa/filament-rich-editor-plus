import { resolveActionArguments } from './registry'

// `crypto.randomUUID()` only exists in secure contexts (https, localhost).
const randomKey = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

/**
 * What extension factories get as their third argument. `callPlugin` asks a plugin on the field (see
 * `AnswersEditorRequests`); `upload` sends a file to the field's Livewire temporary uploads and resolves with the key
 * a plugin's `store` request takes (see `RichEditorPlus::pullTemporaryUpload()`); `processing` keeps the form from
 * saving until a promise settles; `runAction` opens a field action with the arguments registered for it, as a toolbar
 * tool does.
 */
export function createPluginContext({ wire, key, statePath, root, uploadingMessage, getEditor, mountAction }) {
    // The form's own save button waits while any field is processing, as with Filament's rich editor.
    const dispatchFormEvent = (name, detail = null) =>
        root?.closest('form')?.dispatchEvent(new CustomEvent(name, { composed: true, cancelable: true, detail }))

    // Filament's form buttons count started and finished events, so these may nest.
    const processing = (promise) => {
        dispatchFormEvent('form-processing-started', { message: uploadingMessage })

        return Promise.resolve(promise).finally(() => dispatchFormEvent('form-processing-finished'))
    }

    return {
        processing,

        callPlugin: (plugin, request, payload = {}) =>
            wire.callSchemaComponentMethod(key, 'answerPluginRequestForJs', { plugin, request, payload }),

        upload(file, { onProgress } = {}) {
            const uploadKey = randomKey()

            return processing(new Promise((resolve, reject) => {
                wire.upload(
                    `componentFileAttachments.${statePath}.${uploadKey}`,
                    file,
                    () => resolve(uploadKey),
                    () => reject(new Error(`[rich-editor-plus] The upload of [${file.name}] failed.`)),
                    (event) => onProgress?.(event?.detail?.progress ?? 0),
                    () => reject(new Error(`[rich-editor-plus] The upload of [${file.name}] was cancelled.`)),
                )
            }))
        },

        runAction(action) {
            const editor = getEditor()

            if (editor) {
                mountAction(action, resolveActionArguments(action, editor))
            }
        },
    }
}

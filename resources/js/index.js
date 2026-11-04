import '../css/index.css'
import { Placeholder } from '@tiptap/extensions'
import { toBlockTypeList } from './blocks/block-types'
import { createCheckedEditor, setCheckedContent } from './content-check'
import './extensions/core'
import { extendExtension, loadModules, registerActionArguments, registerExtension, resolveExtensions } from './registry'
import { createBlockControls } from './toolbar/block-controls'
import { createPluginContext } from './plugin-context'
import { createMentionLabels } from './mentions/mention-labels'
import { createMentionMenuPlugin } from './mentions/mention-menu'
import { createSlashMenuPlugin, registerSlashMenu } from './slash/slash-menu'
import { registerSuggestion } from './slash/suggestion-list'
import { createBlockDrag } from './toolbar/block-drag'
import { createBlockToolbarPlugin } from './toolbar/block-toolbar'
import { createFixedToolbar, createFixedToolbarKeymap } from './toolbar/fixed-toolbar'
import { bindToolbar, syncToolbar } from './toolbar/tools'
import { createToolbarTooltip } from './toolbar/tooltip'
import { tiptap } from './shared-modules'

const { Selection } = tiptap.pmState

// Shared with third-party plugin JS so every extension uses one ProseMirror instance.
window.RichEditorPlus = window.RichEditorPlus || {}
window.RichEditorPlus.tiptap = tiptap
window.RichEditorPlus.registerExtension = registerExtension
window.RichEditorPlus.extendExtension = extendExtension
window.RichEditorPlus.registerActionArguments = registerActionArguments

export default function richEditorPlusComponent({
    blockTypes,
    contentErrorMessage,
    extensions,
    format,
    isDisabled,
    isLiveDebounced,
    isLiveOnBlur,
    key,
    liveDebounce,
    livewireId,
    loadErrorMessage,
    placeholder,
    state,
    statePath,
    tools,
    uploadingMessage,
}) {
    let editor
    let isDestroyed = false
    let commitTimeout = null
    let blockControls = null
    let blockDrag = null
    let fixedToolbar = null
    let mentionLabels = null
    let toolbarTooltip = null

    const blockTypeList = toBlockTypeList(blockTypes)

    // The state is entangled without `.live` for debounced and on-blur modes, so it is only sent to the server
    // when `$wire.commit()` flushes it: after the debounce delay here, or when the editor loses focus.
    const commit = (component) => {
        if (!isDestroyed) {
            component.$wire.commit()
        }
    }
    let runCommandsHandler = null

    // The state is one string either way. Livewire would turn a JSON object into one update per changed node,
    // with a path that gets deeper as the document does (a marked word in a table cell is ten levels down), and
    // it rejects paths deeper than its `max_nesting_depth`.
    const serialize = (editor) => (format === 'html' ? editor.getHTML() : JSON.stringify(editor.getJSON()))

    const parse = (value) => {
        if (format === 'html' || typeof value !== 'string' || value === '') {
            return value ?? null
        }

        try {
            return JSON.parse(value)
        } catch (error) {
            console.error('[rich-editor-plus] The editor state is not valid JSON.', error)

            return value
        }
    }

    const isCurrentContent = (editor, value) => {
        if (format === 'html') {
            return value === editor.getHTML()
        }

        try {
            return editor.schema.nodeFromJSON(parse(value)).eq(editor.state.doc)
        } catch (error) {
            return false
        }
    }

    return {
        state,

        error: null,

        async init() {
            await loadModules(extensions, window.RichEditorPlus)

            if (isDestroyed) {
                return
            }

            const context = createPluginContext({
                wire: this.$wire,
                key,
                statePath,
                root: this.$el,
                uploadingMessage,
                getEditor: () => editor,
                mountAction: (action, args) => this.mountAction(action, args),
            })

            const resolved = resolveExtensions(extensions, tiptap, context)

            if (resolved.missing.length) {
                // Starting without a plugin's schema would make ProseMirror drop its content, which a save
                // would then persist, so leave the stored value alone and show an error instead.
                this.error = loadErrorMessage.replace(':plugins', resolved.missing.join(', '))

                return
            }

            const created = createCheckedEditor(
                {
                    element: this.$refs.editor,
                    editable: !isDisabled,
                    extensions: [
                        ...resolved.extensions,
                        Placeholder.configure({
                            placeholder: ({ node }) => (node.type.name === 'paragraph' ? placeholder : ''),
                        }),
                    ],
                    content: parse(this.state),
                    onUpdate: ({ editor }) => {
                        this.state = serialize(editor)

                        if (isLiveDebounced) {
                            clearTimeout(commitTimeout)
                            commitTimeout = setTimeout(() => commit(this), liveDebounce ?? 300)
                        }
                    },
                },
                format,
            )

            if (!created.editor) {
                this.error = contentErrorMessage

                return
            }

            editor = created.editor

            if (isLiveOnBlur) {
                editor.on('blur', () => commit(this))
            }

            this.setUpToolbars()
            this.setUpMentions()

            runCommandsHandler = (event) => {
                if (event.detail.livewireId === livewireId && event.detail.key === key) {
                    this.runEditorCommands(event.detail)
                }
            }
            window.addEventListener('run-rich-editor-plus-commands', runCommandsHandler)

            this.$watch('state', (value) => {
                if (isCurrentContent(editor, value)) {
                    return
                }

                if (!setCheckedContent(editor, parse(value) ?? '', format)) {
                    this.error = contentErrorMessage
                }
            })
        },

        /**
         * Opens a Filament action on this field (for example the link modal), passing the current selection so
         * the result can be applied to it once the modal, which takes focus away from the editor, is closed.
         */
        mountAction(action, args = {}) {
            this.$wire.mountAction(
                action,
                { editorSelection: editor.state.selection.toJSON(), ...args },
                { schemaComponent: key },
            )
        },

        /**
         * Applies commands sent from PHP (`RichEditorPlus::runCommands()`), restoring the selection they were
         * meant for first.
         */
        runEditorCommands({ commands, editorSelection }) {
            const chain = editor.chain()

            if (editorSelection) {
                chain.command(({ tr }) => {
                    tr.setSelection(Selection.fromJSON(editor.state.doc, editorSelection))

                    return true
                })
            }

            chain.focus()
            commands.forEach((command) => chain[command.name](...(command.arguments ?? [])))
            chain.run()
        },

        /**
         * Binds whichever toolbars the field rendered: the floating ones, the fixed one, both or neither. The slash
         * menu and block drag work either way. A disabled field has no menus, so nothing is set up.
         */
        setUpToolbars() {
            if (isDisabled) {
                return
            }

            const blockToolbars = new Map(
                [...this.$el.querySelectorAll('[data-rep-block-toolbar]')].map((toolbar) => [
                    toolbar.dataset.repBlockToolbar,
                    toolbar,
                ]),
            )
            const fixedElement = this.$el.querySelector('[data-rep-fixed-toolbar]')
            const mountAction = (action, args) => this.mountAction(action, args)

            if (blockToolbars.size || fixedElement) {
                const toolbars = [...blockToolbars.values()]

                blockControls = createBlockControls({ editor, root: this.$el, blockTypes: blockTypeList, tools })
                toolbarTooltip = createToolbarTooltip({
                    root: this.$el,
                    toolbars: fixedElement ? [fixedElement, ...toolbars] : toolbars,
                })

                if (fixedElement) {
                    fixedToolbar = createFixedToolbar({
                        editor,
                        toolbar: fixedElement,
                        tools,
                        blockControls,
                        mountAction,
                    })
                }

                if (blockToolbars.size) {
                    const sync = () =>
                        toolbars.forEach((toolbar) => {
                            syncToolbar(editor, toolbar, tools)
                            blockControls.sync(toolbar)
                        })

                    toolbars.forEach((toolbar) => {
                        bindToolbar(editor, toolbar, tools, mountAction)
                        blockControls.bind(toolbar)
                    })

                    editor.on('transaction', sync)

                    editor.registerPlugin(
                        createBlockToolbarPlugin({
                            toolbars: blockToolbars,
                            root: this.$el,
                            floatingElements: blockControls.floatingElements,
                            onShow: sync,
                            onHide: () => {
                                toolbarTooltip.hide()
                                blockControls.closeMenus()
                            },
                        }),
                    )

                    sync()
                } else {
                    editor.registerPlugin(createFixedToolbarKeymap(fixedToolbar, this.$el))
                }
            }

            const slashMenu = this.$el.querySelector('[data-rep-slash-menu]')

            if (slashMenu) {
                registerSlashMenu(
                    editor,
                    createSlashMenuPlugin({
                        editor,
                        root: this.$el,
                        element: slashMenu,
                        blockTypes: blockTypeList,
                        mountAction,
                    }),
                )
            }

            blockDrag = createBlockDrag({ editor, root: this.$el })
        },

        /**
         * Search and labels go through exposed methods on the field, so they run with the page's own authorization.
         */
        setUpMentions() {
            const node = editor.extensionManager.extensions.find(({ name }) => name === 'mention')

            if (!node) {
                return
            }

            const callField = (method, args) => this.$wire.callSchemaComponentMethod(key, method, args)

            mentionLabels = createMentionLabels({
                editor,
                fetchLabels: (idsByTrigger) => callField('getMentionLabelsForJs', { idsByTrigger }),
            })

            mentionLabels.refresh()

            const element = this.$el.querySelector('[data-rep-mention-menu]')

            if (!element) {
                return
            }

            node.options.providers.forEach((provider) => {
                registerSuggestion(
                    editor,
                    createMentionMenuPlugin({
                        editor,
                        root: this.$el,
                        element,
                        provider,
                        search: (query, trigger) => callField('getMentionResultsForJs', { query, trigger }),
                    }),
                )
            })
        },

        destroy() {
            isDestroyed = true
            clearTimeout(commitTimeout)

            if (runCommandsHandler) {
                window.removeEventListener('run-rich-editor-plus-commands', runCommandsHandler)
            }

            mentionLabels?.destroy()
            blockDrag?.destroy()
            fixedToolbar?.destroy()
            toolbarTooltip?.destroy()
            blockControls?.destroy()
            editor?.destroy()
            editor = null
        },
    }
}

if (import.meta.hot) {
    import.meta.hot.accept(() => window.location.reload())
}

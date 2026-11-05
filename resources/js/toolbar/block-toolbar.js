import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { posToDOMRect } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state'
import { getActiveBlock } from '../blocks/active-block'
import { focusToolbar } from './tools'

export const blockToolbarKey = new PluginKey('repBlockToolbar')

/**
 * What the toolbar centres over: the selected text, a selected node, which has no caret to anchor to, or the cursor.
 * With `aboveBlockWithCursor`, a cursor anchors to the whole top-level block instead, so a toolbar that stays up while
 * typing, such as a table's, doesn't cover the lines above the cursor or jump about as it moves.
 */
export function getAnchorRect(view, { aboveBlockWithCursor = false } = {}) {
    const { selection } = view.state
    const selected = selection instanceof NodeSelection ? view.nodeDOM(selection.from) : null

    let rect

    if (aboveBlockWithCursor && selection.empty) {
        const block = getActiveBlock(view.state)
        const blockElement = block ? view.nodeDOM(block.pos) : null

        rect = (blockElement instanceof HTMLElement ? blockElement : view.dom).getBoundingClientRect()
    } else if (selected instanceof HTMLElement) {
        rect = selected.getBoundingClientRect()
    } else {
        rect = posToDOMRect(view, selection.from, selection.to)
    }

    const { left, right, top, bottom } = rect

    return { x: left, y: top, left, right, top, bottom, width: right - left, height: bottom - top }
}

class BlockToolbarView {
    constructor(view, { toolbars, root, floatingElements, onShow, onHide, onFit }) {
        this.view = view
        this.toolbars = toolbars
        this.root = root
        this.floatingElements = floatingElements ?? []
        this.onShow = onShow
        this.onHide = onHide
        this.onFit = onFit
        this.current = null
        this.dismissed = false
        this.isDestroyed = false
        this.isForced = false
        this.isPointerDown = false

        // Dragging selected text ends with `dragend`, and no `mouseup`.
        this.handlePointerRelease = () => {
            this.isPointerDown = false
            this.root?.removeAttribute('data-rep-selecting')
        }

        document.addEventListener('mouseup', this.handlePointerRelease)
        document.addEventListener('dragend', this.handlePointerRelease)

        this.scheduleRefresh = () =>
            requestAnimationFrame(() => {
                if (this.isDestroyed) {
                    return
                }

                if (!this.focusElements.some((element) => element.contains(document.activeElement))) {
                    this.isForced = false
                }

                this.refresh()
            })

        view.dom.addEventListener('focusin', this.scheduleRefresh)
        view.dom.addEventListener('focusout', this.scheduleRefresh)

        this.focusElements.forEach((element) => element.addEventListener('focusout', this.scheduleRefresh))
    }

    get focusElements() {
        return [...this.toolbars.values(), ...this.floatingElements]
    }

    update(view, prevState) {
        this.view = view

        if (!prevState.selection.eq(view.state.selection) || !prevState.doc.eq(view.state.doc)) {
            this.dismissed = false
        }

        this.root?.toggleAttribute('data-rep-selecting', this.isPointerDown && !view.state.selection.empty)

        // While focus moves from the editor into a toolbar or menu, nothing has it yet. Hiding the toolbar now would
        // abort that move, so wait until it has landed.
        if (this.hasFocus()) {
            this.refresh()
        } else {
            this.scheduleRefresh()
        }
    }

    hasFocus() {
        return (
            this.view.hasFocus() ||
            this.root?.hasAttribute('data-rep-drag-hold') ||
            this.focusElements.some((element) => element.contains(document.activeElement))
        )
    }

    dismiss() {
        if (!this.current) {
            return false
        }

        this.dismissed = true
        this.refresh()

        return true
    }

    focusToolbar() {
        this.isForced = true
        this.refresh()

        if (!this.current) {
            this.isForced = false

            return false
        }

        focusToolbar(this.current.toolbar)

        return true
    }

    refresh() {
        const block = getActiveBlock(this.view.state)
        const toolbar = block
            ? (this.toolbars.get(block.node.type.name) ?? this.toolbars.get('*'))
            : null
        const blockElement = block ? this.view.nodeDOM(block.pos) : null

        if (
            !toolbar ||
            (this.view.state.selection.empty && !this.isForced && !toolbar.hasAttribute('data-rep-show-with-cursor')) ||
            !(blockElement instanceof HTMLElement) ||
            !this.view.editable ||
            this.dismissed ||
            !this.hasFocus()
        ) {
            return this.hide()
        }

        if (this.current?.toolbar === toolbar && this.current.blockElement === blockElement) {
            return this.current.position({ refit: true })
        }

        this.hide()

        toolbar.hidden = false

        const anchor = {
            getBoundingClientRect: () =>
                getAnchorRect(this.view, { aboveBlockWithCursor: toolbar.hasAttribute('data-rep-show-with-cursor') }),
            contextElement: this.view.dom,
        }

        let fittedWidth = null

        // Refreshes refit, as the toolbar's buttons may have changed. Scrolling repositions far more often, and only
        // needs a refit when the editor's width has changed.
        const position = ({ refit = false } = {}) => {
            const width = this.root?.clientWidth ?? null

            if (width !== null) {
                toolbar.style.maxWidth = `${width}px`
            }

            if (refit || width !== fittedWidth) {
                fittedWidth = width
                this.onFit?.(toolbar)
            }

            computePosition(anchor, toolbar, {
                strategy: 'fixed',
                placement: 'top',
                middleware: [offset(8), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
                Object.assign(toolbar.style, { left: `${x}px`, top: `${y}px` })
            })
        }

        const cleanup = autoUpdate(anchor, toolbar, position)

        this.current = { toolbar, blockElement, cleanup, position }
        this.onShow?.()
    }

    hide() {
        if (!this.current) {
            return
        }

        this.current.cleanup()
        this.current.toolbar.hidden = true
        this.current = null
        this.onHide?.()
    }

    destroy() {
        this.isDestroyed = true
        this.hide()
        this.handlePointerRelease()
        document.removeEventListener('mouseup', this.handlePointerRelease)
        document.removeEventListener('dragend', this.handlePointerRelease)
        this.view.dom.removeEventListener('focusin', this.scheduleRefresh)
        this.view.dom.removeEventListener('focusout', this.scheduleRefresh)
        this.focusElements.forEach((element) => element.removeEventListener('focusout', this.scheduleRefresh))
    }
}

/**
 * A ProseMirror plugin that floats the toolbar for the active top-level block, centred above the selection. It only
 * shows for a selection, and hides while one is being dragged out. A toolbar marked `data-rep-show-with-cursor` also
 * shows with just a cursor in its block. Alt+F10 opens any toolbar without a selection and moves focus into it, and it
 * stays open until focus leaves. Esc dismisses it until the selection or content changes.
 *
 * `toolbars` maps a node type name to its toolbar element; `*` is the fallback. `onFit(toolbar)` runs before the
 * toolbar is placed, to fit it onto one row within the editor's width.
 */
export function createBlockToolbarPlugin({ toolbars, root, floatingElements, onShow, onHide, onFit }) {
    let pluginView = null

    return new Plugin({
        key: blockToolbarKey,

        view: (view) => (pluginView = new BlockToolbarView(view, { toolbars, root, floatingElements, onShow, onHide, onFit })),

        props: {
            handleDOMEvents: {
                mousedown(view, event) {
                    if (pluginView && event.button === 0) {
                        pluginView.isPointerDown = true
                    }

                    return false
                },
            },

            handleKeyDown(view, event) {
                if (event.key === 'Escape' && pluginView?.dismiss()) {
                    return true
                }

                if (event.key === 'F10' && event.altKey) {
                    if (pluginView?.root?.hasAttribute('data-rep-suggesting')) {
                        return true
                    }

                    return Boolean(pluginView?.focusToolbar())
                }

                return false
            },
        },
    })
}

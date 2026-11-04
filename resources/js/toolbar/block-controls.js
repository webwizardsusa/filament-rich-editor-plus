import { NodeSelection } from '@tiptap/pm/state'
import {
    countSelectedParagraphs,
    getActiveBlock,
    getActiveList,
    selectionSpansBlocks,
    selectsNestedBlock,
} from '../blocks/active-block'
import { findBlockType, switchBlock } from '../blocks/block-types'
import { FloatingMenu } from './floating-menu'
import { createToolMenus } from './tool-menus'

const setDisabled = (element, isDisabled) => element?.setAttribute('aria-disabled', isDisabled ? 'true' : 'false')

const isDisabled = (element) => element.getAttribute('aria-disabled') === 'true'

/**
 * Whether the selection can take text formatting. A code block allows no marks and a divider holds no text.
 */
export function allowsFormatting({ selection }) {
    if (selection instanceof NodeSelection) {
        return false
    }

    const { parent } = selection.$from

    if (!parent.inlineContent) {
        return true
    }

    return parent.type.markSet === null || parent.type.markSet.length > 0
}

/**
 * The parts of the block toolbar that act on the whole block: the switcher, move buttons and more menu. One set of
 * menus serves every toolbar in the editor. `sync(toolbar, { hideUnavailable: false })` keeps the list button and
 * formatting in place, disabled, for the fixed toolbar. Menu tools (`Tool::menu()`) open and sync here too, through
 * `createToolMenus`.
 */
export function createBlockControls({ editor, root, blockTypes, tools = {} }) {
    const switcherElement = root.querySelector('[data-rep-switcher-menu]')
    const moreElement = root.querySelector('[data-rep-more-menu]')
    const listElement = root.querySelector('[data-rep-list-menu]')
    const live = root.querySelector('[data-rep-live]')
    const iconSources = root.querySelectorAll('[data-rep-slash-menu] [data-rep-block-type]')

    const switcherMenu = new FloatingMenu(switcherElement, {
        itemSelector: '[data-rep-block-type]',
        onSelect: (item) => {
            editor.view.focus()

            const blockType = blockTypes.find(({ name }) => name === item.dataset.repBlockType)

            if (blockType && editor.isEditable) {
                switchBlock(editor, blockType, blockTypes)
            }
        },
    })

    const moreMenu = new FloatingMenu(moreElement, {
        itemSelector: '[data-rep-more-action]',
        onSelect: (item) => {
            editor.view.focus()

            if (!isDisabled(item) && (editor.isEditable || item.hasAttribute('data-rep-read-only-ok'))) {
                editor.chain().focus()[item.dataset.repMoreAction]().run()
            }
        },
    })

    const listMenu = listElement
        ? new FloatingMenu(listElement, {
              itemSelector: '[data-rep-list-action], [data-rep-list-type]',
              onSelect: (item) => {
                  editor.view.focus()

                  if (isDisabled(item) || !editor.isEditable) {
                      return
                  }

                  if (item.dataset.repListType) {
                      editor.chain().focus().setListType(item.dataset.repListType).run()
                  } else {
                      editor.chain().focus()[item.dataset.repListAction]().run()
                  }
              },
          })
        : null

    const toolMenus = createToolMenus({ editor, root, tools })

    const announce = (message) => {
        if (live) {
            live.textContent = message ?? ''
        }
    }

    const run = {
        moveUp: () => editor.commands.moveBlockUp() && announce(live?.dataset.repMovedUp),
        moveDown: () => editor.commands.moveBlockDown() && announce(live?.dataset.repMovedDown),
        switcher: (button) => switcherMenu.open(button),
        more: (button) => moreMenu.open(button),
        list: (button) => listMenu?.open(button),
    }

    let listIconHtml = null

    const syncListMenu = (toolbar, spans, hideUnavailable) => {
        const group = toolbar.querySelector('[data-rep-list-tools]')

        if (!group || !listElement) {
            return
        }

        const list = getActiveList(editor.state.selection)
        const button = group.querySelector('[data-rep-control="list"]')

        group.hidden = hideUnavailable && !list

        const icon = button.querySelector('[data-rep-list-icon]')

        listIconHtml ??= icon.innerHTML

        if (!list) {
            setDisabled(button, true)

            if (!hideUnavailable && button.dataset.repCurrent) {
                button.setAttribute('aria-label', button.dataset.repGenericLabel)
                icon.innerHTML = listIconHtml
                delete button.dataset.repCurrent
            }

            return
        }
        const name = list.type.name
        const type = listElement.querySelector(`[data-rep-list-type="${name}"]`)

        setDisabled(button, spans || !editor.isEditable)

        listElement.querySelectorAll('[data-rep-list-type]').forEach((item) => {
            item.setAttribute('aria-checked', item.dataset.repListType === name ? 'true' : 'false')
        })

        listElement.querySelectorAll('[data-rep-list-action]').forEach((item) => {
            setDisabled(item, !editor.can()[item.dataset.repListAction]())
        })

        if (type && button.dataset.repCurrent !== name) {
            const label = button.dataset.repLabel.replace(':type', type.querySelector('.rep-menu-item-label').textContent)

            icon.replaceChildren(type.querySelector('svg').cloneNode(true))
            button.setAttribute('aria-label', label)
            button.dataset.repCurrent = name
        }
    }

    const canSwitchSeveralBlocks = blockTypes.some(({ multiBlock }) => multiBlock)

    const syncSwitcher = (toolbar, current, paragraphs) => {
        const button = toolbar.querySelector('[data-rep-control="switcher"]')

        if (!button) {
            return
        }

        const name = current?.name ?? ''

        if (button.dataset.repCurrent !== name) {
            const source = [...iconSources].find((item) => item.dataset.repBlockType === name)
            const icon = button.querySelector('[data-rep-switcher-icon]')

            icon.replaceChildren(...(source?.querySelector('svg') ? [source.querySelector('svg').cloneNode(true)] : []))
            button.querySelector('[data-rep-switcher-label]').textContent =
                current?.label ?? button.dataset.repGenericLabel
            button.dataset.repCurrent = name
        }

        switcherElement.querySelectorAll('[data-rep-block-type]').forEach((item) => {
            const { repBlockType } = item.dataset

            item.setAttribute('aria-checked', repBlockType === name ? 'true' : 'false')
            item.hidden = paragraphs > 0 && !blockTypes.find((blockType) => blockType.name === repBlockType)?.multiBlock
        })
    }

    const handleControlClick = (event) => {
        const menuButton = event.target.closest('[data-rep-tool][aria-haspopup="menu"]')

        if (menuButton) {
            if (!isDisabled(menuButton)) {
                toolMenus.open(menuButton.dataset.repTool, menuButton)
            }

            return
        }

        const button = event.target.closest('[data-rep-control]')

        if (button && !isDisabled(button)) {
            run[button.dataset.repControl]?.(button)
        }
    }

    const boundToolbars = new Set()

    return {
        floatingElements: [switcherElement, moreElement, listElement, ...toolMenus.floatingElements].filter(Boolean),

        bind(toolbar) {
            toolbar.addEventListener('click', handleControlClick)
            boundToolbars.add(toolbar)
        },

        sync(toolbar, { hideUnavailable = true } = {}) {
            const { state } = editor
            const block = getActiveBlock(state)

            if (!block) {
                return
            }

            const spans = selectionSpansBlocks(state)
            const readOnly = !editor.isEditable
            const locked = spans || selectsNestedBlock(state) || readOnly
            const paragraphs = countSelectedParagraphs(state)
            const switcher = toolbar.querySelector('[data-rep-control="switcher"]')

            const current = paragraphs
                ? {
                      name: `blocks:${paragraphs}`,
                      label: switcher?.dataset.repMultipleLabel.replace(':count', paragraphs),
                      switchable: canSwitchSeveralBlocks,
                  }
                : findBlockType(blockTypes, block.node)

            syncSwitcher(toolbar, current, paragraphs)
            syncListMenu(toolbar, spans, hideUnavailable)

            setDisabled(switcher, (locked && !paragraphs) || readOnly || !current?.switchable)
            setDisabled(toolbar.querySelector('[data-rep-control="moveUp"]'), locked || !editor.can().moveBlockUp())
            setDisabled(toolbar.querySelector('[data-rep-control="moveDown"]'), locked || !editor.can().moveBlockDown())
            setDisabled(toolbar.querySelector('[data-rep-drag-handle]'), locked)

            const moreItems = [...moreElement.querySelectorAll('[data-rep-more-action]')]

            moreItems.forEach((item) => setDisabled(item, (readOnly && !item.hasAttribute('data-rep-read-only-ok')) || !editor.can()[item.dataset.repMoreAction]?.()))
            setDisabled(toolbar.querySelector('[data-rep-control="more"]'), moreItems.every(isDisabled))
            toolMenus.sync(toolbar)

            if (hideUnavailable) {
                toolbar.querySelectorAll('[data-rep-inline-tools]').forEach((formatting) => {
                    formatting.hidden = !allowsFormatting(state)
                })
            }
        },

        closeMenus() {
            switcherMenu.close({ restoreFocus: false })
            moreMenu.close({ restoreFocus: false })
            listMenu?.close({ restoreFocus: false })
            toolMenus.closeMenus()
        },

        destroy() {
            boundToolbars.forEach((toolbar) => toolbar.removeEventListener('click', handleControlClick))
            switcherMenu.destroy()
            moreMenu.destroy()
            listMenu?.destroy()
            toolMenus.destroy()
        },
    }
}

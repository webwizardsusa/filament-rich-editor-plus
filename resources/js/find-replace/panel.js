import { autoUpdate, computePosition, offset, shift } from '@floating-ui/dom'

const TYPING_DEBOUNCE = 100
const NARROW_EDITOR_WIDTH = 480

const MATCH_ACTIONS = ['findPrevious', 'findNext', 'replaceCurrent', 'replaceAll']

const isDisabled = (element) => element.getAttribute('aria-disabled') === 'true'

/**
 * Binds the server-rendered panel to the plugin's state. Plugin views are rebuilt whenever a plugin is registered, so
 * everything set up here must come off again in `destroy()`, and a rebuilt panel must not take focus.
 */
export function createFindPanel({ editor, root, view, getState }) {
    const panel = root?.querySelector('[data-rep-find]')

    if (!panel) {
        return {}
    }

    const queryInput = panel.querySelector('[data-rep-find-query]')
    const replacementInput = panel.querySelector('[data-rep-find-replacement]')
    const count = panel.querySelector('[data-rep-find-count]')
    const toggles = [...panel.querySelectorAll('[data-rep-find-option]')]
    const matchButtons = MATCH_ACTIONS.map((name) => panel.querySelector(`[data-rep-find-action="${name}"]`))

    let debounce = null
    let notice = null
    let stopPositioning = null
    let seenOpenCount = getState(view.state).openCount

    const position = () => {
        panel.style.width = root.clientWidth < NARROW_EDITOR_WIDTH ? `${root.clientWidth}px` : ''

        computePosition(root, panel, {
            strategy: 'fixed',
            placement: 'top-end',
            middleware: [offset(({ rects }) => -rects.floating.height - 8), shift({ padding: 8, crossAxis: true })],
        }).then(({ x, y }) => {
            Object.assign(panel.style, { left: `${x}px`, top: `${y}px` })
        })
    }

    const countText = ({ query, matches, currentIndex }) => {
        if (notice) {
            return notice
        }

        if (query === '') {
            return ''
        }

        return matches.length
            ? panel.dataset.repFindCountLabel.replace(':current', currentIndex + 1).replace(':total', matches.length)
            : panel.dataset.repFindNoResults
    }

    const sync = (currentView) => {
        const state = getState(currentView.state)

        // Commands refuse while the editor isn't editable, so a panel left showing could not be closed.
        const isVisible = state.isOpen && currentView.editable

        panel.hidden = !isVisible

        if (!isVisible) {
            stopPositioning?.()
            stopPositioning = null

            return
        }

        stopPositioning ??= autoUpdate(root, panel, position)

        if (state.openCount !== seenOpenCount) {
            seenOpenCount = state.openCount
            queryInput.value = state.query
            replacementInput.value = state.replacement

            // After the frame TipTap's own `focus()` waits for, so that it can't take focus back.
            requestAnimationFrame(() => {
                if (!panel.hidden) {
                    queryInput.focus()
                    queryInput.select()
                }
            })
        }

        toggles.forEach((toggle) => {
            toggle.setAttribute('aria-pressed', state[toggle.dataset.repFindOption] ? 'true' : 'false')
        })

        matchButtons.forEach((button) => button.setAttribute('aria-disabled', state.matches.length ? 'false' : 'true'))

        const text = countText(state)

        if (count.textContent !== text) {
            count.textContent = text
        }
    }

    const flushQuery = () => {
        clearTimeout(debounce)
        debounce = null

        if (queryInput.value !== getState(editor.state).query) {
            editor.commands.setFindOptions({ query: queryInput.value })
        }
    }

    const run = (command, button = null) => {
        flushQuery()

        if (button && isDisabled(button)) {
            return
        }

        notice = null

        const total = getState(editor.state).matches.length

        if (editor.commands[command]() && command === 'replaceAll') {
            notice = panel.dataset.repFindReplaced.replace(':count', total)
            sync(editor.view)
        }
    }

    const onInput = ({ target }) => {
        notice = null

        if (target === replacementInput) {
            editor.commands.setFindOptions({ replacement: replacementInput.value })

            return
        }

        clearTimeout(debounce)
        debounce = setTimeout(flushQuery, TYPING_DEBOUNCE)
    }

    const onClick = ({ target }) => {
        const button = target.closest('[data-rep-find-action]')

        if (button) {
            run(button.dataset.repFindAction, button)

            return
        }

        const toggle = target.closest('[data-rep-find-option]')

        if (toggle) {
            const name = toggle.dataset.repFindOption

            flushQuery()
            notice = null
            editor.commands.setFindOptions({ [name]: !getState(editor.state)[name] })
        }
    }

    const onKeydown = (event) => {
        if (event.isComposing) {
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            run('closeFindReplace')

            return
        }

        if (event.key !== 'Enter' || !(event.target === queryInput || event.target === replacementInput)) {
            return
        }

        event.preventDefault()

        if (event.target === replacementInput) {
            run('replaceCurrent')
        } else {
            run(event.shiftKey ? 'findPrevious' : 'findNext')
        }
    }

    panel.addEventListener('input', onInput)
    panel.addEventListener('click', onClick)
    panel.addEventListener('keydown', onKeydown)

    sync(view)

    return {
        update(currentView, prevState) {
            if (prevState.doc !== currentView.state.doc) {
                notice = null
            }

            sync(currentView)
        },

        destroy() {
            clearTimeout(debounce)
            stopPositioning?.()
            stopPositioning = null
            panel.removeEventListener('input', onInput)
            panel.removeEventListener('click', onClick)
            panel.removeEventListener('keydown', onKeydown)
        },
    }
}

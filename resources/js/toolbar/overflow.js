/**
 * Keeps a toolbar on one row. Buttons that don't fit move into its more menu, from the end of the toolbar backwards,
 * and come back when there is room. A moved button stays in the DOM, marked `data-rep-overflowed`, so the toolbar's
 * own code keeps its state current and the more menu can mirror it.
 */
export const OVERFLOWED = 'data-rep-overflowed'

const BUTTONS = '[data-rep-tool], [data-rep-control], [data-rep-drag-handle]'

/** The block's handle and type stay in place, and so does the more button that holds what moved. */
const PINNED = '[data-rep-drag-handle], [data-rep-control="switcher"], [data-rep-control="more"]'

const DIVIDER = '.rep-toolbar-divider'

/**
 * Whether an element shows in the toolbar: neither it nor a group around it is hidden or moved.
 */
export function isShownWithin(toolbar, element) {
    return !isHiddenWithin(toolbar, element) && !element.hasAttribute(OVERFLOWED)
}

/**
 * Whether the element or a group around it is hidden. Only buttons and dividers ever move, never their groups.
 */
function isHiddenWithin(toolbar, element) {
    for (let current = element; current && current !== toolbar; current = current.parentElement) {
        if (current.hidden) {
            return true
        }
    }

    return false
}

const fitsWidth = (toolbar) => toolbar.scrollWidth <= toolbar.clientWidth + 1

/**
 * Hides each divider that would start the toolbar, end it, or sit next to another once buttons have moved.
 */
function tidyDividers(toolbar) {
    const dividers = toolbar.querySelectorAll(DIVIDER)

    dividers.forEach((divider) => divider.removeAttribute(OVERFLOWED))

    let last = null

    toolbar.querySelectorAll(`${BUTTONS}, ${DIVIDER}`).forEach((element) => {
        if (!isShownWithin(toolbar, element)) {
            return
        }

        if (!element.matches(DIVIDER)) {
            last = element

            return
        }

        if (last === null || last.matches(DIVIDER)) {
            element.setAttribute(OVERFLOWED, '')

            return
        }

        last = element
    })

    if (last?.matches(DIVIDER)) {
        last.setAttribute(OVERFLOWED, '')
    }
}

/**
 * The buttons that have moved into the more menu and would otherwise show, in toolbar order.
 */
export function overflowedButtons(toolbar) {
    return [...toolbar.querySelectorAll(`:is(${BUTTONS})[${OVERFLOWED}]`)].filter((button) => !isHiddenWithin(toolbar, button))
}

/**
 * Fits the toolbar onto one row. `fits` says whether it does as it stands; by default, whether its content is no
 * wider than the toolbar. A more button marked `data-rep-overflow-only`, added for a layout without one, shows only
 * while something has moved.
 */
export function fitToolbar(toolbar, { fits = fitsWidth } = {}) {
    toolbar.setAttribute('data-rep-fitted', '')
    toolbar.querySelectorAll(`[${OVERFLOWED}]`).forEach((element) => element.removeAttribute(OVERFLOWED))

    const overflowOnlyMore = toolbar.querySelector('[data-rep-control="more"][data-rep-overflow-only]')

    if (overflowOnlyMore) {
        overflowOnlyMore.hidden = true
    }

    tidyDividers(toolbar)

    if (fits(toolbar)) {
        return
    }

    const candidates = [...toolbar.querySelectorAll(BUTTONS)]
        .filter((button) => !button.matches(PINNED) && isShownWithin(toolbar, button))
        .reverse()

    if (candidates.length === 0) {
        return
    }

    if (overflowOnlyMore) {
        overflowOnlyMore.hidden = false
    }

    for (const button of candidates) {
        button.setAttribute(OVERFLOWED, '')
        tidyDividers(toolbar)

        if (fits(toolbar)) {
            return
        }
    }
}

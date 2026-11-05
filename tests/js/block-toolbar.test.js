import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { blockToolbarKey, createBlockToolbarPlugin, getAnchorRect } from '../../resources/js/toolbar/block-toolbar'
import { doc, makeEditor, p } from './support/make-editor'

let editor
let root
let toolbar

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const focusAt = async (position) => {
    editor.commands.focus(position)

    await vi.waitFor(() => expect(editor.view.hasFocus()).toBe(true))
    await nextFrame()
}

const pressAltF10 = () => {
    const event = new KeyboardEvent('keydown', { key: 'F10', altKey: true })

    return editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, event))
}

beforeEach(() => {
    root = document.createElement('div')
    document.body.append(root)

    toolbar = document.createElement('div')
    toolbar.hidden = true
    toolbar.innerHTML = '<button data-rep-control="switcher" tabindex="-1"></button>'
    root.append(toolbar)

    editor = makeEditor(doc(p('abc'), p('def')))
    editor.registerPlugin(createBlockToolbarPlugin({ toolbars: new Map([['*', toolbar]]), root }))
})

afterEach(() => {
    if (!editor.isDestroyed) {
        editor.destroy()
    }

    document.body.innerHTML = ''
})

it('stays hidden with only a cursor', async () => {
    await focusAt(1)

    expect(toolbar.hidden).toBe(true)
})

it('shows for a text selection', async () => {
    await focusAt(1)

    editor.commands.setTextSelection({ from: 1, to: 3 })

    expect(toolbar.hidden).toBe(false)
})

it('shows for a selected node', async () => {
    editor.commands.setContent(doc({ type: 'horizontalRule' }, p('after')))
    await focusAt(1)

    editor.commands.setNodeSelection(0)

    expect(toolbar.hidden).toBe(false)
})

it('hides again when the selection collapses', async () => {
    await focusAt(1)
    editor.commands.setTextSelection({ from: 1, to: 3 })

    editor.commands.setTextSelection(2)

    expect(toolbar.hidden).toBe(true)
})

it('hides when typing replaces the selection', async () => {
    await focusAt(1)
    editor.commands.setTextSelection({ from: 1, to: 3 })

    editor.commands.insertContent('x')

    expect(toolbar.hidden).toBe(true)
})

it('opens at the cursor with Alt+F10, for keyboard users', async () => {
    await focusAt(1)

    expect(pressAltF10()).toBe(true)
    expect(toolbar.hidden).toBe(false)
    expect(document.activeElement).toBe(toolbar.querySelector('button'))
})

it('stays open after Alt+F10 while focus is in the toolbar', async () => {
    await focusAt(1)
    pressAltF10()

    editor.commands.setTextSelection(2)
    await nextFrame()
    await nextFrame()

    expect(toolbar.hidden).toBe(false)
})

it('hides after Alt+F10 once focus returns to the editor', async () => {
    await focusAt(1)
    pressAltF10()

    editor.view.focus()

    await vi.waitFor(() => expect(toolbar.hidden).toBe(true))
})

it('does not stay open for the next cursor move after Alt+F10', async () => {
    await focusAt(1)
    pressAltF10()
    editor.view.focus()
    await vi.waitFor(() => expect(toolbar.hidden).toBe(true))

    editor.commands.setTextSelection(3)

    expect(toolbar.hidden).toBe(true)
})

it('stays dismissed with Alt+F10 until the selection changes', async () => {
    await focusAt(1)
    editor.commands.setTextSelection({ from: 1, to: 3 })
    editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, new KeyboardEvent('keydown', { key: 'Escape' })))

    expect(toolbar.hidden).toBe(true)
    expect(pressAltF10()).toBeFalsy()
})

const mouseDown = (button = 0) =>
    editor.view.someProp('handleDOMEvents', (handlers) =>
        handlers.mousedown?.(editor.view, new MouseEvent('mousedown', { button })),
    )

const isSelecting = () => root.hasAttribute('data-rep-selecting')

it('stays hidden while a selection is dragged out, until the mouse is released', () => {
    mouseDown()
    editor.commands.setTextSelection({ from: 1, to: 3 })

    expect(isSelecting()).toBe(true)

    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(isSelecting()).toBe(false)
})

it('does not hide for a plain click', () => {
    mouseDown()
    editor.commands.setTextSelection(2)

    expect(isSelecting()).toBe(false)
})

it('shows again when dragging selected text ends, which fires no mouseup', () => {
    mouseDown()
    editor.commands.setTextSelection({ from: 1, to: 3 })

    document.dispatchEvent(new Event('dragend'))

    expect(isSelecting()).toBe(false)
})

it('does not treat the right button as dragging a selection', () => {
    mouseDown(2)
    editor.commands.setTextSelection({ from: 1, to: 3 })

    expect(isSelecting()).toBe(false)
})

const tableWithToolbar = async (attribute) => {
    const tableToolbar = document.createElement('div')
    tableToolbar.hidden = true
    tableToolbar.toggleAttribute(attribute, true)
    tableToolbar.innerHTML = '<button tabindex="-1"></button>'
    root.append(tableToolbar)

    const cell = (text) => ({ type: 'tableCell', content: [p(text)] })

    editor.unregisterPlugin(blockToolbarKey)
    editor.registerPlugin(createBlockToolbarPlugin({ toolbars: new Map([['table', tableToolbar]]), root }))
    editor.commands.setContent(doc(p('before'), { type: 'table', content: [{ type: 'tableRow', content: [cell('a'), cell('b')] }] }))

    return tableToolbar
}

const positionInCell = (text) => {
    let position = null

    editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text === text) {
            position = pos + 1
        }
    })

    return position
}

it('shows with only a cursor for a toolbar marked to show with one', async () => {
    const tableToolbar = await tableWithToolbar('data-rep-show-with-cursor')

    await focusAt(positionInCell('a'))

    expect(tableToolbar.hidden).toBe(false)
})

it('keeps a toolbar marked to show with a cursor open while the cursor moves between cells', async () => {
    const tableToolbar = await tableWithToolbar('data-rep-show-with-cursor')

    await focusAt(positionInCell('a'))
    editor.commands.setTextSelection(positionInCell('b'))

    expect(tableToolbar.hidden).toBe(false)
})

it('hides a toolbar marked to show with a cursor when the cursor leaves its block', async () => {
    const tableToolbar = await tableWithToolbar('data-rep-show-with-cursor')

    await focusAt(positionInCell('a'))
    editor.commands.setTextSelection(2)

    expect(tableToolbar.hidden).toBe(true)
})

it('hides a toolbar marked to show with a cursor once focus leaves the editor', async () => {
    const tableToolbar = await tableWithToolbar('data-rep-show-with-cursor')

    await focusAt(positionInCell('a'))
    editor.view.dom.blur()

    await vi.waitFor(() => expect(tableToolbar.hidden).toBe(true))
})

it('keeps a toolbar marked to show with a cursor dismissed with Esc until the cursor moves', async () => {
    const tableToolbar = await tableWithToolbar('data-rep-show-with-cursor')

    await focusAt(positionInCell('a'))
    editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, new KeyboardEvent('keydown', { key: 'Escape' })))

    expect(tableToolbar.hidden).toBe(true)

    editor.commands.setTextSelection(positionInCell('b'))

    expect(tableToolbar.hidden).toBe(false)
})

it('leaves other node toolbars hidden with only a cursor', async () => {
    const tableToolbar = await tableWithToolbar('data-rep-other')

    await focusAt(positionInCell('a'))

    expect(tableToolbar.hidden).toBe(true)
})

it('leaves nothing behind once destroyed', () => {
    mouseDown()
    editor.commands.setTextSelection({ from: 1, to: 3 })

    editor.destroy()

    expect(isSelecting()).toBe(false)
})

const stubCoordinates = () =>
    vi.spyOn(editor.view, 'coordsAtPos').mockImplementation((position) => ({
        left: position * 10,
        right: position * 10,
        top: 100 + position,
        bottom: 120 + position,
    }))

const stubBlockRect = (position, rect) =>
    vi.spyOn(editor.view.nodeDOM(position), 'getBoundingClientRect').mockReturnValue(rect)

it('anchors to the cursor, so the toolbar centres over it', () => {
    stubCoordinates()
    stubBlockRect(0, { left: 12, right: 212, top: 0, bottom: 0 })
    editor.commands.setTextSelection(3)

    expect(getAnchorRect(editor.view)).toMatchObject({ left: 30, right: 30, width: 0, top: 103, height: 20 })
})

it('spans a selection, so the toolbar centres over it', () => {
    stubCoordinates()
    stubBlockRect(0, { left: 12, right: 212, top: 0, bottom: 0 })
    editor.commands.setTextSelection({ from: 2, to: 3 })

    expect(getAnchorRect(editor.view)).toMatchObject({ left: 20, right: 30, width: 10, top: 102 })
})

it('spans the whole block with only a cursor, for a toolbar that shows with one', () => {
    stubCoordinates()
    stubBlockRect(0, { left: 12, right: 212, top: 50, bottom: 90 })
    editor.commands.setTextSelection(3)

    expect(getAnchorRect(editor.view, { aboveBlockWithCursor: true })).toMatchObject({
        left: 12,
        right: 212,
        width: 200,
        top: 50,
        height: 40,
    })
})

it('still spans a selection for a toolbar that shows with a cursor', () => {
    stubCoordinates()
    stubBlockRect(0, { left: 12, right: 212, top: 50, bottom: 90 })
    editor.commands.setTextSelection({ from: 2, to: 3 })

    expect(getAnchorRect(editor.view, { aboveBlockWithCursor: true })).toMatchObject({ left: 20, right: 30, top: 102 })
})

it('spans a selected node, which has no caret', () => {
    editor.commands.setContent(doc({ type: 'horizontalRule' }, p('after')))
    editor.commands.setNodeSelection(0)

    stubBlockRect(0, { left: 5, right: 45, top: 6, bottom: 7 })

    expect(getAnchorRect(editor.view)).toMatchObject({ left: 5, right: 45, width: 40, top: 6, height: 1 })
})

it('still hides the toolbar once focus has really left', async () => {
    await focusAt(1)
    editor.commands.setTextSelection({ from: 1, to: 3 })

    await vi.waitFor(() => expect(toolbar.hidden).toBe(false))

    editor.view.dom.blur()

    await vi.waitFor(() => expect(toolbar.hidden).toBe(true))
})

it('ignores Alt+F10 while the slash menu is open, because the toolbar is hidden then', async () => {
    await focusAt(1)

    root.setAttribute('data-rep-suggesting', '')

    pressAltF10()

    expect(document.activeElement).toBe(editor.view.dom)
})

it('fits the toolbar onto one row before placing it, each time it shows', async () => {
    editor.destroy()
    editor = makeEditor(doc(p('abc'), p('def')))

    const onFit = vi.fn()

    editor.registerPlugin(createBlockToolbarPlugin({ toolbars: new Map([['*', toolbar]]), root, onFit }))
    await focusAt(1)

    editor.commands.setTextSelection({ from: 1, to: 3 })

    expect(onFit).toHaveBeenCalledWith(toolbar)

    onFit.mockClear()
    editor.commands.setTextSelection({ from: 1, to: 2 })

    expect(onFit).toHaveBeenCalledWith(toolbar)
})

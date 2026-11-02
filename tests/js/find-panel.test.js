import { Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { afterEach, expect, it, vi } from 'vitest'
import { findReplaceKey } from '../../resources/js/find-replace/plugin'
import { findPanelMarkup } from './support/find-panel-markup'
import { doc, editorOptions, p } from './support/make-editor'

let editor
let root

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const panel = () => root.querySelector('[data-rep-find]')
const queryInput = () => root.querySelector('[data-rep-find-query]')
const replacementInput = () => root.querySelector('[data-rep-find-replacement]')
const count = () => root.querySelector('[data-rep-find-count]').textContent
const action = (name) => root.querySelector(`[data-rep-find-action="${name}"]`)
const option = (name) => root.querySelector(`[data-rep-find-option="${name}"]`)
const findState = () => findReplaceKey.getState(editor.state)

function setUp(content, wrapper = document.body) {
    root = document.createElement('div')
    root.className = 'rep-editor'
    root.innerHTML = `<div data-editor></div>${findPanelMarkup}`
    wrapper.append(root)

    editor = new Editor({ ...editorOptions(content), element: root.querySelector('[data-editor]') })
}

const type = (input, value) => {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
}

const press = (element, key, options = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })

    element.dispatchEvent(event)

    return event
}

const open = async (content, query) => {
    setUp(content)
    editor.commands.setTextSelection(1)
    editor.commands.openFindReplace()
    await wait(30)

    if (query) {
        type(queryInput(), query)
        await wait(130)
    }
}

afterEach(() => {
    if (!editor.isDestroyed) {
        editor.destroy()
    }

    document.body.innerHTML = ''
})

it('shows on open and hides on close', async () => {
    await open(doc(p('a')))
    expect(panel().hidden).toBe(false)

    action('closeFindReplace').click()

    expect(panel().hidden).toBe(true)
})

it('focuses Find with its text selected, and takes focus again when opened twice', async () => {
    setUp(doc(p('one two')))
    editor.commands.setTextSelection({ from: 5, to: 8 })

    editor.commands.openFindReplace()
    await wait(30)

    expect(queryInput().value).toBe('two')
    expect(document.activeElement).toBe(queryInput())
    expect([queryInput().selectionStart, queryInput().selectionEnd]).toEqual([0, 3])

    action('findNext').focus()
    editor.commands.openFindReplace()
    await wait(30)

    expect(document.activeElement).toBe(queryInput())
})

it('returns focus to the editor on close', async () => {
    await open(doc(p('a')))

    action('closeFindReplace').click()
    await wait(30)

    expect(editor.view.hasFocus()).toBe(true)
})

it('debounces typing in Find', async () => {
    await open(doc(p('abc')))

    type(queryInput(), 'a')
    type(queryInput(), 'ab')

    expect(findState().query).toBe('')

    await wait(130)

    expect(findState().query).toBe('ab')
})

it('does not overwrite Find while someone is typing', async () => {
    await open(doc(p('abc')), 'a')

    queryInput().value = 'ab'
    editor.commands.insertContentAt(1, 'z')

    expect(queryInput().value).toBe('ab')
})

it('keeps focus in the panel while matches are selected', async () => {
    await open(doc(p('a a')), 'a')

    press(queryInput(), 'Enter')

    expect(document.activeElement).toBe(queryInput())
    expect(editor.state.selection.empty).toBe(false)
})

it('uses Enter and Shift+Enter in Find, without submitting a surrounding form', async () => {
    await open(doc(p('a a a')), 'a')

    const event = press(queryInput(), 'Enter')
    expect(event.defaultPrevented).toBe(true)
    expect(findState().currentIndex).toBe(1)

    press(queryInput(), 'Enter', { shiftKey: true })
    expect(findState().currentIndex).toBe(0)
})

it('acts on the text in Find when Enter beats the debounce', async () => {
    await open(doc(p('cat dog')))

    type(queryInput(), 'dog')
    press(queryInput(), 'Enter')

    expect(findState().query).toBe('dog')
    expect(count()).toBe('1 of 1')
})

it('ignores Enter while an input method is composing', async () => {
    await open(doc(p('a a')), 'a')

    const event = press(queryInput(), 'Enter', { isComposing: true })

    expect(event.defaultPrevented).toBe(false)
    expect(findState().currentIndex).toBe(0)
})

it('replaces the current match with Enter in Replace', async () => {
    await open(doc(p('a b')), 'a')

    type(replacementInput(), 'x')
    const event = press(replacementInput(), 'Enter')

    expect(event.defaultPrevented).toBe(true)
    expect(editor.getText()).toBe('x b')
})

it('closes with Escape anywhere in the panel, without reaching a surrounding modal', async () => {
    const onKeydown = vi.fn()
    document.body.addEventListener('keydown', onKeydown)
    await open(doc(p('a')))

    press(replacementInput(), 'Escape')

    expect(panel().hidden).toBe(true)
    expect(onKeydown).not.toHaveBeenCalled()
    document.body.removeEventListener('keydown', onKeydown)
})

it('toggles options at once', async () => {
    await open(doc(p('Cat cat')), 'cat')
    expect(findState().matches).toHaveLength(2)

    option('matchCase').click()

    expect(option('matchCase').getAttribute('aria-pressed')).toBe('true')
    expect(findState().matches).toHaveLength(1)
})

it('shows the count, no results, or nothing', async () => {
    await open(doc(p('a a')))
    expect(count()).toBe('')

    type(queryInput(), 'a')
    await wait(130)
    expect(count()).toBe('1 of 2')

    action('findNext').click()
    expect(count()).toBe('2 of 2')

    type(queryInput(), 'z')
    await wait(130)
    expect(count()).toBe('No results')
})

it('disables match buttons with no matches, and they do nothing', async () => {
    await open(doc(p('a')), 'z')

    for (const name of ['findPrevious', 'findNext', 'replaceCurrent', 'replaceAll']) {
        expect(action(name).getAttribute('aria-disabled')).toBe('true')
    }

    expect(action('closeFindReplace').getAttribute('aria-disabled')).toBeNull()

    action('replaceAll').click()

    expect(count()).toBe('No results')
})

it('announces how many were replaced, and a focused button keeps focus', async () => {
    await open(doc(p('a a')), 'a')

    action('replaceAll').focus()
    action('replaceAll').click()

    expect(count()).toBe('2 replaced')
    expect(action('replaceAll').getAttribute('aria-disabled')).toBe('true')
    expect(action('replaceAll').hasAttribute('disabled')).toBe(false)
    expect(document.activeElement).toBe(action('replaceAll'))
})

it('drops the replaced message on the next edit', async () => {
    await open(doc(p('a a')), 'a')
    action('replaceAll').click()

    editor.commands.insertContentAt(1, 'a')

    expect(count()).toBe('1 of 1')
})

it('hides while the editor is not editable, and comes back with it', async () => {
    await open(doc(p('a')))

    editor.setEditable(false, false)
    expect(panel().hidden).toBe(true)

    editor.setEditable(true, false)
    expect(panel().hidden).toBe(false)
})

it('runs each click once after the plugin views are rebuilt', async () => {
    await open(doc(p('a a a')), 'a')

    editor.registerPlugin(new Plugin({ key: new PluginKey('other'), view: () => ({}) }))
    action('findNext').click()

    expect(findState().currentIndex).toBe(1)
    expect(panel().hidden).toBe(false)
})

it('does not take focus when plugin views are rebuilt', async () => {
    await open(doc(p('a')))
    action('findNext').focus()

    editor.registerPlugin(new Plugin({ key: new PluginKey('other'), view: () => ({}) }))
    await wait(30)

    expect(document.activeElement).toBe(action('findNext'))
})

it('stops once destroyed', async () => {
    await open(doc(p('a')))
    type(queryInput(), 'a')

    editor.destroy()
    await wait(130)

    action('findNext').click()

    expect(editor.isDestroyed).toBe(true)
})

it('works without a panel, as on a field with no toolbars', () => {
    root = document.createElement('div')
    document.body.append(root)
    editor = new Editor({ ...editorOptions(doc(p('a'))), element: root })

    expect(editor.commands.openFindReplace()).toBe(true)
})

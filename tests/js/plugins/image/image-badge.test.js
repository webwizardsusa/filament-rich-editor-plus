import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerActionArguments, registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, doc, makeEditor, p } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/image/index'

install({ registerExtension, registerActionArguments })

let editor

const options = (extra = {}) => ({
    widths: ['25', '50', '75', '100'],
    defaultWidth: '100',
    defaultAlignment: 'center',
    altRequired: true,
    uploads: { accept: ['image/png'], maxSize: 5120 },
    labels: { loading: 'Loading image…', missing: 'Image missing', needsAlt: 'Needs alt text' },
    ...extra,
})

const context = () => ({ callPlugin: vi.fn(() => Promise.resolve({ urls: {} })), runAction: vi.fn() })

const image = (alt) => ({ type: 'image', attrs: { disk: null, path: null, url: 'https://example.test/a.png', alt, caption: '', align: 'center', width: '100' } })

const make = (content, extra, ctx = context()) => {
    editor = makeEditor(content, [...defaultPluginIds, { id: 'hollyit/image', options: options(extra) }], ctx)

    return ctx
}

afterEach(() => editor?.destroy())

describe('the needs alt text badge', () => {
    it('shows on an image with empty alt when alt text is required', () => {
        make(doc(p('a'), image(''), image('A cat')))

        const badges = editor.view.dom.querySelectorAll('.rep-image-badge')

        expect(badges).toHaveLength(1)
        expect(badges[0].textContent).toBe('Needs alt text')
    })

    it('does not show when alt text is optional', () => {
        make(doc(image('')), { altRequired: false })

        expect(editor.view.dom.querySelector('.rep-image-badge')).toBeNull()
    })

    it('selects the image and opens its modal when clicked', () => {
        const ctx = make(doc(p('a'), image('')))

        editor.view.dom.querySelector('.rep-image-badge').click()

        expect(editor.state.selection.node?.type.name).toBe('image')
        expect(ctx.runAction).toHaveBeenCalledWith('image')
    })

    it('goes away once the image has alt text, and is never in the HTML', () => {
        make(doc(p('a'), image('')))

        expect(editor.getHTML()).not.toContain('Needs alt text')

        editor.commands.setNodeSelection(3)
        editor.commands.updateImage({ alt: 'A cat' })

        expect(editor.view.dom.querySelector('.rep-image-badge')).toBeNull()
    })
})

describe('the image upload route', () => {
    it('is in the editor storage with the plugin, kind, types and size', () => {
        make(doc(p('a')))

        expect(editor.storage.image.uploadRoute).toEqual({ plugin: 'hollyit/image', kind: 'image', accept: ['image/png'], maxSize: 5120 })
    })

    it('is null without upload options', () => {
        make(doc(p('a')), { uploads: undefined })

        expect(editor.storage.image.uploadRoute).toBeNull()
    })

    it('shows a URL put in the cache without asking the field', async () => {
        const ctx = make(doc(p('a')))
        editor.storage.image.urlCache.set('editor-images/new.png', 'https://files.test/new.png')

        editor.commands.setTextSelection(2)
        editor.commands.insertImage({ disk: 'media', path: 'editor-images/new.png', alt: '' })
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(ctx.callPlugin).not.toHaveBeenCalled()
        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://files.test/new.png')
    })
})

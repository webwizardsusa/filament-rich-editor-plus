import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerActionArguments, registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, doc, makeEditor, p } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/image/index'

let editor
const calls = []
let answer = { urls: {} }

const context = {
    callPlugin: vi.fn((plugin, request, payload) => {
        calls.push({ plugin, request, payload })

        return Promise.resolve(answer)
    }),
}

install({ registerExtension, registerActionArguments })

const base = { widths: ['50', '100'], defaultWidth: '100', defaultAlignment: 'center', labels: { loading: 'Loading image…', missing: 'Image missing' } }

// What `ImagePlugin::make()->imageCache(['banner', 'thumb'])->getJsExtension()` sends.
const withImageCache = { ...base, imageCache: { styles: ['banner', 'thumb'], defaultStyle: 'banner' } }

const make = (content, options = withImageCache) => makeEditor(content, [...defaultPluginIds, { id: 'webwizardsusa/image', options }], context)

const ULID = '01m7qqgsen7gt2hh7rkj6n40zs'

const placement = `<figure class="rep-image" data-type="image" data-image="${ULID}" data-style="thumb" data-align="center" data-width="100"><img alt="A cat"><figcaption>Our cat</figcaption></figure>`

const image = () => editor.getJSON().content.find((node) => node.type === 'image')

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
    editor?.destroy()
    calls.length = 0
    answer = { urls: {} }
})

describe('Placements', () => {
    it('parses a Placement and writes it back without a src', () => {
        editor = make(placement)

        expect(image().attrs).toMatchObject({ image: ULID, style: 'thumb', disk: null, path: null, url: null, alt: 'A cat' })
        expect(editor.getHTML()).toBe(placement)
    })

    it('reads an uppercase ULID in lowercase, and an unknown style as the default', () => {
        editor = make(placement.replace(ULID, ULID.toUpperCase()).replace('data-style="thumb"', 'data-style="huge"'))

        expect(image().attrs).toMatchObject({ image: ULID, style: 'banner' })
    })

    it('ignores data-image when the field does not use Image Cache', () => {
        editor = make(placement, base)

        expect(image().attrs).not.toHaveProperty('image')
        expect(editor.getHTML()).not.toContain('data-image')
    })

    it('keeps images stored by disk and path as they are', () => {
        const upload = '<figure class="rep-image" data-type="image" data-disk="media" data-path="editor-images/a.jpg" data-align="center" data-width="100"><img alt="Old"></figure>'

        editor = make(upload)

        expect(image().attrs).toMatchObject({ image: null, style: null, path: 'editor-images/a.jpg' })
        expect(editor.getHTML()).toBe(upload)
    })

    it('inserts and updates a Placement, dropping any disk, path or URL', () => {
        editor = make(doc(p('a')))
        editor.commands.setTextSelection(2)

        editor.commands.insertImage({ image: ULID.toUpperCase(), style: 'thumb', disk: 'media', path: 'x.jpg', url: 'https://example.test/x.png', alt: 'A cat' })
        expect(image().attrs).toMatchObject({ image: ULID, style: 'thumb', disk: null, path: null, url: null })

        editor.commands.setNodeSelection(3)
        editor.commands.updateImage({ image: ULID, style: 'nonsense' })
        expect(image().attrs).toMatchObject({ image: ULID, style: 'banner' })
    })

    it('never stores an id that is not a ULID', () => {
        editor = make(doc(p('a')))
        editor.commands.setTextSelection(2)
        editor.commands.insertImage({ image: '../../etc/passwd', style: 'thumb', url: 'https://example.test/x.png' })

        expect(image().attrs).toMatchObject({ image: null, style: null, url: 'https://example.test/x.png' })
    })

    it('asks the field for the Placement\'s URL by its ULID and style, and shows it', async () => {
        answer = { urls: { [`${ULID}:thumb`]: 'https://files.test/thumb.jpg' } }
        editor = make(placement)

        await flush()

        expect(calls).toEqual([{ plugin: 'webwizardsusa/image', request: 'urls', payload: { paths: [`${ULID}:thumb`] } }])
        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://files.test/thumb.jpg')
    })

    it('gives the Placement\'s img the size the field answers with', async () => {
        answer = { urls: { [`${ULID}:thumb`]: 'https://files.test/thumb.jpg' }, dimensions: { [`${ULID}:thumb`]: { width: 150, height: 150 } } }
        editor = make(placement)

        await flush()

        const img = editor.view.dom.querySelector('figure img')
        expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['150', '150'])
    })

    it('leaves the size off when the field gives none, or one that is not whole pixels', async () => {
        answer = { urls: { [`${ULID}:thumb`]: 'https://files.test/thumb.jpg' }, dimensions: { [`${ULID}:thumb`]: { width: '150', height: 1.5 } } }
        editor = make(placement)

        await flush()

        expect(editor.view.dom.querySelector('figure img').hasAttribute('width')).toBe(false)
    })

    it('keeps the size the upload answered with for a pasted image', async () => {
        editor = make(doc(p('a')))
        editor.storage.image.urlCache.set(`${ULID}:thumb`, 'https://files.test/thumb.jpg', { width: 150, height: 150 })
        editor.commands.setTextSelection(2)
        editor.commands.insertImage({ image: ULID, style: 'thumb', alt: 'A cat' })

        await flush()

        expect(calls).toEqual([])
        expect(editor.view.dom.querySelector('figure img').getAttribute('width')).toBe('150')
    })
})

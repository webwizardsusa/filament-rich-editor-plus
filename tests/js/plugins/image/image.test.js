import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerActionArguments, registerExtension, resolveActionArguments } from '../../../../resources/js/registry'
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

const options = { widths: ['25', '50', '75', '100'], defaultWidth: '100', defaultAlignment: 'center', labels: { loading: 'Loading image…', missing: 'Image missing' } }
const pluginIds = [...defaultPluginIds, { id: 'webwizardsusa/image', options }]

const make = (content) => makeEditor(content, pluginIds, context)

const upload = (attrs = {}) => ({ type: 'image', attrs: { disk: 'media', path: 'editor-images/a.jpg', url: null, alt: 'A cat', caption: '', align: 'center', width: '100', ...attrs } })

afterEach(() => {
    editor?.destroy()
    calls.length = 0
    answer = { urls: {} }
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the image node', () => {
    it('writes HTML without src for uploads, and with src for external images', () => {
        editor = make(doc(upload({ caption: 'Our cat' }), { type: 'image', attrs: { ...upload().attrs, disk: null, path: null, url: 'https://example.test/b.png', alt: '' } }))

        expect(editor.getHTML()).toBe(
            '<figure class="rep-image" data-type="image" data-disk="media" data-path="editor-images/a.jpg" data-align="center" data-width="100"><img alt="A cat"><figcaption>Our cat</figcaption></figure>'
            + '<figure class="rep-image" data-type="image" data-url="https://example.test/b.png" data-align="center" data-width="100"><img src="https://example.test/b.png" alt=""></figure>',
        )
    })

    it('turns a plain img into an external image and refuses unsafe URLs', () => {
        editor = make('<p>x</p><img src="https://example.test/c.gif" alt="C"><img src="javascript:alert(1)" alt="bad">')

        const images = editor.getJSON().content.filter((node) => node.type === 'image')

        expect(images).toHaveLength(1)
        expect(images[0].attrs).toMatchObject({ url: 'https://example.test/c.gif', alt: 'C' })
        expect(editor.getHTML()).not.toContain('javascript')
    })

    it.each(['/img/a.png', 'img/a.png', './a.png', '../a.png', '//cdn.example.test/a.png'])('keeps the relative URL %s', (url) => {
        editor = make(`<p>x</p><img src="${url}" alt="A">`)

        const image = editor.getJSON().content.find((node) => node.type === 'image')
        expect(image.attrs.url).toBe(url)
        expect(editor.getHTML()).toContain(`data-url="${url}"`)
    })

    it.each(['JaVaScript:alert(1)', 'java\tscript:alert(1)', ' javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///etc/passwd'])(
        'refuses the URL %j',
        (url) => {
            editor = make(doc(p('a')))
            editor.commands.setTextSelection(2)
            editor.commands.insertImage({ ...upload().attrs, disk: null, path: null, url })

            expect(editor.getJSON().content.find((node) => node.type === 'image').attrs.url).toBeNull()
        },
    )

    it('inserts, updates, aligns and sizes images', () => {
        editor = make(doc(p('a')))
        editor.commands.setTextSelection(2)

        expect(editor.commands.insertImage(upload().attrs)).toBe(true)
        editor.commands.setNodeSelection(3)

        expect(editor.commands.setImageAlign('right')).toBe(true)
        expect(editor.commands.setImageWidth('50')).toBe(true)
        expect(editor.commands.setImageAlign('middle')).toBe(false)
        expect(editor.commands.setImageWidth('33')).toBe(false)
        expect(editor.commands.updateImage({ alt: 'Changed' })).toBe(true)

        const image = editor.getJSON().content.find((node) => node.type === 'image')
        expect(image.attrs).toMatchObject({ align: 'right', width: '50', alt: 'Changed', path: 'editor-images/a.jpg' })
    })

    it('never stores an unsafe URL, alignment or width from a command', () => {
        editor = make(doc(p('a')))
        editor.commands.setTextSelection(2)
        editor.commands.insertImage({ ...upload().attrs, disk: null, path: null, url: 'javascript:alert(1)', align: 'middle', width: '33' })

        const image = editor.getJSON().content.find((node) => node.type === 'image')
        expect(image.attrs).toMatchObject({ url: null, align: 'center', width: '100' })
    })
})

describe('the node view', () => {
    it('asks the field for upload URLs and shows the image', async () => {
        answer = { urls: { 'editor-images/a.jpg': 'https://files.test/a.jpg' } }
        editor = make(doc(upload()))

        await flush()

        expect(calls).toEqual([{ plugin: 'webwizardsusa/image', request: 'urls', payload: { paths: ['editor-images/a.jpg'] } }])
        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://files.test/a.jpg')
    })

    it('shows the missing placeholder when the field has no URL', async () => {
        editor = make(doc(upload()))

        await flush()

        expect(editor.view.dom.querySelector('figure').textContent).toContain('Image missing')
        expect(editor.view.dom.querySelector('figure img')).toBeNull()
    })

    it('shows a failed lookup as missing, and asks again next time', async () => {
        context.callPlugin.mockImplementationOnce(() => Promise.reject(new Error('offline')))
        editor = make(doc(p('a'), upload()))

        await flush()

        expect(editor.view.dom.querySelector('figure').textContent).toContain('Image missing')

        answer = { urls: { 'editor-images/a.jpg': 'https://files.test/a.jpg' } }
        editor.commands.setNodeSelection(3)
        editor.commands.setImageAlign('right')

        await flush()

        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://files.test/a.jpg')
    })

    it('asks for at most 100 paths per request, and shows every image', async () => {
        const paths = Array.from({ length: 101 }, (_, index) => `editor-images/${index}.jpg`)
        answer = { urls: Object.fromEntries(paths.map((path) => [path, `https://files.test/${path}`])) }
        editor = make(doc(...paths.map((path) => upload({ path }))))

        await flush()

        expect(calls.map(({ payload }) => payload.paths.length)).toEqual([100, 1])
        expect(editor.view.dom.querySelectorAll('figure img')).toHaveLength(101)
    })

    it('asks once for a path while its answer is on the way', async () => {
        editor = make(doc(p('a'), upload()))
        await Promise.resolve()
        editor.commands.setNodeSelection(3)
        editor.commands.setImageAlign('right')

        await flush()

        expect(calls).toHaveLength(1)
    })

    it('asks again for a path the answer left out', async () => {
        editor = make(doc(p('a'), upload()))

        await flush()

        answer = { urls: { 'editor-images/a.jpg': 'https://files.test/a.jpg' } }
        editor.commands.setNodeSelection(3)
        editor.commands.setImageAlign('right')

        await flush()

        expect(calls).toHaveLength(2)
        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://files.test/a.jpg')
    })

    it('shows one image when the image changes before its URL arrives', async () => {
        answer = { urls: { 'editor-images/a.jpg': 'https://files.test/a.jpg' } }
        editor = make(doc(p('a'), upload()))
        editor.commands.setNodeSelection(3)
        editor.commands.setImageAlign('right')

        await flush()

        expect(editor.view.dom.querySelectorAll('figure img')).toHaveLength(1)
        expect(editor.view.dom.querySelector('figure').classList).toContain('ProseMirror-selectednode')
    })

    it('shows external images without asking', async () => {
        editor = make(doc({ type: 'image', attrs: { ...upload().attrs, disk: null, path: null, url: 'https://example.test/b.png' } }))

        await flush()

        expect(calls).toEqual([])
        expect(editor.view.dom.querySelector('figure img').getAttribute('src')).toBe('https://example.test/b.png')
    })
})

describe('the image action', () => {
    it('passes the selected image to the modal for editing', () => {
        editor = make(doc(p('a'), upload({ caption: 'Cap' })))
        editor.commands.setNodeSelection(3)

        expect(resolveActionArguments('image', editor)).toMatchObject({ editing: true, disk: 'media', path: 'editor-images/a.jpg', alt: 'A cat', caption: 'Cap' })

        editor.commands.setTextSelection(1)
        expect(resolveActionArguments('image', editor)).toEqual({})
    })
})

it('deletes a selected image with Backspace', () => {
    editor = make(doc(p('a'), upload()))
    editor.commands.setNodeSelection(3)

    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }))

    expect(editor.getJSON().content.some((node) => node.type === 'image')).toBe(false)
})

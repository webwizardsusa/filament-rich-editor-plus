import { Extension } from '@tiptap/core'
import { expect, it } from 'vitest'
import { loadModules, registerExtension, resolveExtensions } from '../../resources/js/registry'

it('dedupes extensions that two plugins share', () => {
    const shared = Extension.create({ name: 'shared' })

    registerExtension('test/one', () => [shared])
    registerExtension('test/two', () => [shared])

    const { extensions } = resolveExtensions([{ id: 'test/one' }, { id: 'test/two' }], {})

    expect(extensions.map(({ name }) => name)).toEqual(['shared'])
})

it('passes the editor context to factories', () => {
    const seen = []
    registerExtension('test/context', (options, tiptap, context) => {
        seen.push(context)

        return []
    })

    const context = { callPlugin: () => Promise.resolve({}) }
    resolveExtensions([{ id: 'test/context', options: {} }], {}, context)

    expect(seen).toEqual([context])
})

it('gives factories an empty context by default', () => {
    let received
    registerExtension('test/no-context', (options, tiptap, context) => {
        received = context

        return []
    })

    resolveExtensions([{ id: 'test/no-context', options: {} }], {})

    expect(received).toEqual({})
})

it('registers the HTML source plugin, which needs no editor extension of its own', async () => {
    await import('../../resources/js/extensions/core')

    const { extensions, missing } = resolveExtensions([{ id: 'core/html-source' }], {})

    expect(missing).toEqual([])
    expect(extensions).toEqual([])
})

it('needs no factory for a descriptor that only carries modules', () => {
    const { extensions, missing } = resolveExtensions([{ modules: ['https://cdn.test/extend.js'] }], {})

    expect(missing).toEqual([])
    expect(extensions).toEqual([])
})

it('still reports an id whose module loaded but registered no factory for it', async () => {
    // The module registers a different id, which shows it was loaded.
    const source = "export default function ({ registerExtension }) { registerExtension('test/typo', () => []) }"
    const url = `data:text/javascript,${encodeURIComponent(source)}`
    const descriptors = [{ id: 'test/forgot-to-register', options: {}, modules: [url] }]

    await loadModules(descriptors, { registerExtension })

    expect(resolveExtensions(descriptors, {}).missing).toEqual(['test/forgot-to-register'])
    expect(resolveExtensions([{ id: 'test/typo' }], {}).missing).toEqual([])
})

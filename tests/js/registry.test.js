import { Extension } from '@tiptap/core'
import { expect, it } from 'vitest'
import { registerExtension, resolveExtensions } from '../../resources/js/registry'

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

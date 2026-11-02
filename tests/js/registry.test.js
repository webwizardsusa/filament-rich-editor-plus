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

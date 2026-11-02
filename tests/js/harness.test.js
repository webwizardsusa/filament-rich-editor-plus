import { expect, it } from 'vitest'
import { blockSummary, doc, makeEditor, p } from './support/make-editor'

it('builds a headless editor from the real plugin registry', () => {
    const editor = makeEditor(doc(p('one'), p('two')))

    expect(blockSummary(editor)).toEqual(['paragraph:one', 'paragraph:two'])

    editor.destroy()
})

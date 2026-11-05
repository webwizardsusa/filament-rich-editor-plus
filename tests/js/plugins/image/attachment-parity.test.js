import { describe, expect, it } from 'vitest'
import { registerActionArguments, registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, makeEditor } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/image/index'
import cases from '../../../Plugins/Image/fixtures/attachment-parity.json'

install({ registerExtension, registerActionArguments })

const imageOptions = { widths: ['25', '50', '75', '100'], defaultWidth: '100', defaultAlignment: 'center', labels: {} }
const pluginIds = [...defaultPluginIds, { id: 'hollyit/image', options: imageOptions }, { id: 'hollyit/attachment', options: { labels: {} } }]

describe('attachment parity with the PHP engine', () => {
    it.each(cases)('renders $name to the same HTML', ({ document, html }) => {
        expect(makeEditor(document, pluginIds).getHTML()).toBe(html)
    })

    it.each(cases)('parses $name into the same document', ({ document, html }) => {
        expect(makeEditor(html, pluginIds).getJSON()).toEqual(document)
    })
})

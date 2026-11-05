import { describe, expect, it } from 'vitest'
import { registerActionArguments, registerExtension } from '../../../../resources/js/registry'
import { defaultPluginIds, makeEditor } from '../../support/make-editor'
import install from '../../../../resources/js/plugins/image/index'
import cases from '../../../Plugins/Image/fixtures/image-parity.json'

install({ registerExtension, registerActionArguments })

// What `ImagePlugin::make()->disk('media')->getJsExtension()` sends.
const options = { widths: ['25', '50', '75', '100'], defaultWidth: '100', defaultAlignment: 'center', labels: { loading: 'Loading image…', missing: 'Image missing' } }
const pluginIds = [...defaultPluginIds, { id: 'webwizardsusa/image', options }]

describe('image parity with the PHP engine', () => {
    it.each(cases)('renders $name to the same HTML', ({ document, html }) => {
        expect(makeEditor(document, pluginIds).getHTML()).toBe(html)
    })

    it.each(cases)('parses $name into the same document', ({ document, html }) => {
        expect(makeEditor(html, pluginIds).getJSON()).toEqual(document)
    })
})

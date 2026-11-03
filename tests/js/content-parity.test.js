import { describe, expect, it } from 'vitest'
import cases from '../fixtures/content-parity.json'
import { colourPluginIds } from './support/colour-plugins'
import { defaultPluginIds, makeEditor } from './support/make-editor'

const pluginIds = [...defaultPluginIds, 'core/italic', 'core/underline', 'core/strikethrough', 'core/link', 'core/code', 'core/subscript', 'core/superscript', 'core/task-list', ...colourPluginIds]

// A case's `globalAttributes` are what PHP would send for a plugin declaring them.
const idsFor = ({ globalAttributes }) =>
    globalAttributes
        ? [...pluginIds, { id: 'core/global-attributes', options: { name: 'globalAttributes:test', attributes: globalAttributes } }]
        : pluginIds

describe('content parity with the PHP engine', () => {
    // `browserHtml` is what the browser writes when it differs from PHP, such as a table's `colgroup`.
    it.each(cases)('renders $name to the same HTML', (item) => {
        const { document, html, browserHtml } = item

        expect(makeEditor(document, idsFor(item)).getHTML()).toBe(browserHtml ?? html)
    })

    it.each(cases)('parses $name into the same document', (item) => {
        const { document, html } = item

        expect(makeEditor(html, idsFor(item)).getJSON()).toEqual(document)
    })

    it.each(cases.filter((item) => item.browserHtml))('parses the HTML the browser writes for $name', (item) => {
        const { document, browserHtml } = item

        expect(makeEditor(browserHtml, idsFor(item)).getJSON()).toEqual(document)
    })
})

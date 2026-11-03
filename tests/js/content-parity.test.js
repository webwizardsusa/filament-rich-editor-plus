import { describe, expect, it } from 'vitest'
import cases from '../fixtures/content-parity.json'
import { defaultPluginIds, makeEditor } from './support/make-editor'

const pluginIds = [...defaultPluginIds, 'core/italic', 'core/underline', 'core/strikethrough', 'core/link', 'core/code', 'core/subscript', 'core/superscript']

describe('content parity with the PHP engine', () => {
    // `browserHtml` is what the browser writes when it differs from PHP, such as a table's `colgroup`.
    it.each(cases)('renders $name to the same HTML', ({ document, html, browserHtml }) => {
        expect(makeEditor(document, pluginIds).getHTML()).toBe(browserHtml ?? html)
    })

    it.each(cases)('parses $name into the same document', ({ document, html }) => {
        expect(makeEditor(html, pluginIds).getJSON()).toEqual(document)
    })

    it.each(cases.filter((item) => item.browserHtml))('parses the HTML the browser writes for $name', ({ document, browserHtml }) => {
        expect(makeEditor(browserHtml, pluginIds).getJSON()).toEqual(document)
    })
})

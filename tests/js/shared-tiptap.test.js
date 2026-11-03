import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as pmState from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tiptap } from '../../resources/js/shared-modules.js'
import { sharedSpecifiers, sharedTiptap } from '../../vite/shared-tiptap.js'

// Inside the project, so Vite will load the generated modules.
const cache = resolve('../../node_modules/.cache')
mkdirSync(cache, { recursive: true })
const directory = mkdtempSync(join(cache, 'shared-tiptap-'))
let loaded = 0

/**
 * Runs the plugin the way Vite would for one import, and evaluates the module it generates in the browser.
 */
async function importShared(specifier) {
    const plugin = sharedTiptap()
    const id = plugin.resolveId(specifier, join(directory, 'plugin.js'))
    const code = await plugin.load.call({ resolve: async () => null }, id)
    const file = join(directory, `shared-${loaded++}.mjs`)

    writeFileSync(file, code)

    return import(/* @vite-ignore */ file)
}

afterEach(() => {
    delete window.RichEditorPlus
    vi.restoreAllMocks()
})

describe('sharedTiptap()', () => {
    it('maps every specifier to a module the editor shares, and shares nothing unmapped', () => {
        expect(new Set(Object.values(sharedSpecifiers))).toEqual(new Set(Object.keys(tiptap)))
    })

    it('rewrites every ProseMirror module and suggestion, but not extension packages', () => {
        const plugin = sharedTiptap()

        for (const specifier of ['@tiptap/pm/inputrules', 'prosemirror-history', '@tiptap/pm/schema-list', '@tiptap/suggestion']) {
            expect(plugin.resolveId(specifier, '/app/plugin.js')).toBe(`\0rich-editor-plus-shared:${specifier}`)
        }

        expect(plugin.resolveId('@tiptap/extension-table', '/app/plugin.js')).toBeNull()
    })

    it('reads the editor’s own instances', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        window.RichEditorPlus = { tiptap: { pmState } }

        const shared = await importShared('@tiptap/pm/state')

        expect(shared.PluginKey).toBe(pmState.PluginKey)
        expect(shared.default).toBe(pmState)
        expect(warn).not.toHaveBeenCalled()
    })

    it('warns once about exports the editor does not provide', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { PluginKey, ...older } = pmState
        window.RichEditorPlus = { tiptap: { pmState: older } }

        const shared = await importShared('@tiptap/pm/state')

        expect(shared.PluginKey).toBeUndefined()
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toContain('@tiptap/pm/state')
        expect(warn.mock.calls[0][0]).toContain('PluginKey')
    })

    it('throws a clear error when the editor has not shared the module', async () => {
        window.RichEditorPlus = { tiptap: {} }

        await expect(importShared('@tiptap/pm/history')).rejects.toThrow('@tiptap/pm/history')
    })

    it('throws a clear error when the editor has not loaded', async () => {
        await expect(importShared('@tiptap/core')).rejects.toThrow('Rich Editor Plus')
    })

    it('keeps shared modules and the given packages out of dependency pre-bundling', () => {
        const { optimizeDeps } = sharedTiptap({ exclude: ['@tiptap/extension-table'] }).config()

        expect(optimizeDeps.exclude).toEqual(expect.arrayContaining(['@tiptap/core', 'prosemirror-state', '@tiptap/extension-table']))
    })
})

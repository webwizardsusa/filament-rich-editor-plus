import * as core from '@tiptap/core'
import * as pmCommands from '@tiptap/pm/commands'
import * as pmDropcursor from '@tiptap/pm/dropcursor'
import * as pmGapcursor from '@tiptap/pm/gapcursor'
import * as pmHistory from '@tiptap/pm/history'
import * as pmInputrules from '@tiptap/pm/inputrules'
import * as pmKeymap from '@tiptap/pm/keymap'
import * as pmModel from '@tiptap/pm/model'
import * as pmSchemaList from '@tiptap/pm/schema-list'
import * as pmState from '@tiptap/pm/state'
import * as pmTables from '@tiptap/pm/tables'
import * as pmTransform from '@tiptap/pm/transform'
import * as pmView from '@tiptap/pm/view'
import * as suggestion from '@tiptap/suggestion'

/**
 * The TipTap and ProseMirror modules the editor shares on `window.RichEditorPlus.tiptap`, so plugin JS runs on the
 * same instances instead of bundling its own copy. `vite/shared-tiptap.js` maps import specifiers to these keys; a
 * test keeps the two in step.
 */
export const tiptap = {
    core,
    suggestion,
    pmState,
    pmView,
    pmModel,
    pmTransform,
    pmCommands,
    pmKeymap,
    pmTables,
    pmInputrules,
    pmHistory,
    pmDropcursor,
    pmGapcursor,
    pmSchemaList,
}

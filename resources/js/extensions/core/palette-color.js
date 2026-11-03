import { Extension } from '@tiptap/core'

/**
 * The commands for one palette colour plugin (PHP: `PaletteColorPlugin`): set a palette name on the `textStyle` mark, or
 * clear it and drop the span once nothing is left on it. Both report false where the mark can't go, such as code.
 */
export function paletteColorExtension({ name, attribute, setCommand, unsetCommand, colors }) {
    return Extension.create({
        name,

        addCommands() {
            return {
                [setCommand]:
                    (colour) =>
                    ({ chain }) =>
                        colors.includes(colour) && chain().setMark('textStyle', { [attribute]: colour }).run(),

                [unsetCommand]:
                    () =>
                    ({ chain }) =>
                        chain().setMark('textStyle', { [attribute]: null }).removeEmptyTextStyle().run(),
            }
        },
    })
}

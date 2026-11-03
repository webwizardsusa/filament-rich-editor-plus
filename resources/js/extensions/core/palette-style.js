import { Extension } from '@tiptap/core'

/**
 * The commands for one palette style plugin (PHP: `PaletteStylePlugin`): set a palette name on the `textStyle` mark, or
 * clear it and drop the span once nothing is left on it. Both report false where the mark can't go, such as code.
 */
export function paletteStyleExtension({ name, attribute, setCommand, unsetCommand, values }) {
    return Extension.create({
        name,

        addCommands() {
            return {
                [setCommand]:
                    (value) =>
                    ({ chain }) =>
                        values.includes(value) && chain().setMark('textStyle', { [attribute]: value }).run(),

                [unsetCommand]:
                    () =>
                    ({ chain }) =>
                        chain().setMark('textStyle', { [attribute]: null }).removeEmptyTextStyle().run(),
            }
        },
    })
}

import { Fragment } from '@tiptap/pm/model'

/**
 * The item node a list holds, such as `listItem` for a bullet list or `taskItem` for a task list.
 */
export const itemTypeOf = (listType) => listType.contentMatch.defaultType

/**
 * Rebuilds a list as another list type whose items are a different node, such as a bullet list as a task list. Lists
 * of the same type nested inside it are converted too; other content is kept as it is. Item attributes don't carry
 * over (a task item's `checked` has nowhere to go), so new items get their defaults. The result is the same size as
 * the list, so positions in it stay valid.
 */
export function convertList(list, targetType) {
    const sourceType = list.type
    const targetItemType = itemTypeOf(targetType)

    const convertChildren = (fragment) =>
        Fragment.fromArray(
            fragment.content.map((child) => (child.type === sourceType ? convert(child) : child)),
        )

    const convert = (node) =>
        targetType.create(
            null,
            Fragment.fromArray(node.content.content.map((item) => targetItemType.create(null, convertChildren(item.content), item.marks))),
        )

    return convert(list)
}

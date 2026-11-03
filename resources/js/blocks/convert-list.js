import { Fragment } from '@tiptap/pm/model'

/**
 * The item node a list holds, such as `listItem` for a bullet list or `taskItem` for a task list.
 */
export const itemTypeOf = (listType) => listType.contentMatch.defaultType

/**
 * The attributes in `attrs` that `type` also defines, such as a global `textAlign`, so a node rebuilt as another type
 * keeps them.
 */
export const sharedAttrs = (type, attrs) => Object.fromEntries(Object.entries(attrs).filter(([name]) => name in type.attrs))

/**
 * Rebuilds a list as another list type whose items are a different node, such as a bullet list as a task list. Lists
 * of the same type nested inside it are converted too; other content is kept as it is. Lists and items keep the
 * attributes their new type also defines, such as a global attribute; the rest (a task item's `checked`) are dropped,
 * and new ones get their defaults. The result is the same size as
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
            sharedAttrs(targetType, node.attrs),
            Fragment.fromArray(
                node.content.content.map((item) =>
                    targetItemType.create(sharedAttrs(targetItemType, item.attrs), convertChildren(item.content), item.marks),
                ),
            ),
        )

    return convert(list)
}

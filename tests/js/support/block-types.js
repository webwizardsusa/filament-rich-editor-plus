import { toBlockTypeList } from '../../../resources/js/blocks/block-types'

const type = (nodeName, command, args = [], attributes = {}, extra = {}) => ({
    label: nodeName,
    keywords: [],
    node: { name: nodeName, attributes },
    command,
    arguments: args,
    action: null,
    switchable: true,
    multiBlock: false,
    ...extra,
})

export const blockTypes = toBlockTypeList({
    paragraph: type('paragraph', 'setParagraph'),
    heading2: type('heading', 'setHeading', [{ level: 2 }], { level: 2 }, { label: 'Heading 2', keywords: ['title', 'h2'] }),
    heading3: type('heading', 'setHeading', [{ level: 3 }], { level: 3 }, { label: 'Heading 3', keywords: ['title', 'h3'] }),
    bulletList: type('bulletList', 'toggleBulletList', [], {}, { multiBlock: true }),
    orderedList: type('orderedList', 'toggleOrderedList', [], {}, { multiBlock: true }),
    blockquote: type('blockquote', 'setBlockquote', [], {}, { multiBlock: true }),
    codeBlock: type('codeBlock', 'setCodeBlock'),
    divider: type('horizontalRule', 'setHorizontalRule', [], {}, { label: 'Divider', switchable: false }),
    table: type('table', null, [], {}, { label: 'Table', action: 'insertTable', switchable: false }),
})

export const named = (name) => blockTypes.find((blockType) => blockType.name === name)

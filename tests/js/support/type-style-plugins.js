const classAttribute = (name, names, suffix) => ({
    name,
    kind: 'class',
    key: 'class',
    types: ['textStyle'],
    values: names,
    pattern: null,
    keepOnSplit: true,
    classes: Object.fromEntries(names.map((value) => [value, `has-${value}-${suffix}`])),
})

const plugin = (id, attribute, names, suffix) => [
    { id, options: { values: names } },
    { id: 'core/global-attributes', options: { name: `globalAttributes:${id}`, attributes: [classAttribute(attribute, names, suffix)] } },
]

export const fontNames = ['sans', 'serif', 'mono']
export const sizeNames = ['small', 'large', 'x-large', 'xx-large']
export const heightNames = ['tight', 'relaxed', 'loose']

// What PHP sends for FontFamilyPlugin::make(), FontSizePlugin::make() and LineHeightPlugin::make().
export const typeStylePluginIds = [
    ...plugin('core/font-family', 'fontFamily', fontNames, 'font-family'),
    ...plugin('core/font-size', 'fontSize', sizeNames, 'font-size'),
    ...plugin('core/line-height', 'lineHeight', heightNames, 'line-height'),
]

export const colourNames = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']

const classAttribute = (name, suffix) => ({
    name,
    kind: 'class',
    key: 'class',
    types: ['textStyle'],
    values: colourNames,
    pattern: null,
    keepOnSplit: true,
    classes: Object.fromEntries(colourNames.map((colour) => [colour, `has-${colour}-${suffix}`])),
})

// What PHP sends for TextColorPlugin::make() and BackgroundColorPlugin::make().
export const colourPluginIds = [
    { id: 'core/text-color', options: { colors: colourNames } },
    { id: 'core/global-attributes', options: { name: 'globalAttributes:core/text-color', attributes: [classAttribute('color', 'color')] } },
    { id: 'core/background-color', options: { colors: colourNames } },
    { id: 'core/global-attributes', options: { name: 'globalAttributes:core/background-color', attributes: [classAttribute('backgroundColor', 'background-color')] } },
]

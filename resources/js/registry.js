const factories = new Map()

/**
 * Registers the factory that builds the TipTap extension(s) for a plugin's JS extension id (the id a PHP
 * plugin returns from `getJsExtension()`). A factory receives the options from PHP, the shared TipTap modules,
 * and the editor's context (`{ callPlugin }`), and returns one extension or an array of them.
 */
export function registerExtension(id, factory) {
    factories.set(id, factory)
}

const decorators = new Map()

/**
 * Changes an extension another plugin registered, for example `extendExtension('core/link', (extension) =>
 * extension.extend({ ... }))`. The decorator runs on every extension that plugin's factory produces, receives
 * `{ options, tiptap }` as its second argument, and returns the extension to use (or nothing to keep it). Load it
 * from a module attached with `PluginExtension::addModule()`.
 */
export function extendExtension(id, decorator) {
    decorators.set(id, [...(decorators.get(id) ?? []), decorator])
}

/**
 * Builds the TipTap extensions for the descriptors PHP sent. `missing` lists the ids that have no registered
 * factory; the caller must not start an editor when any are missing, because ProseMirror would silently drop
 * whatever content it has no schema for. Extensions with the same name are only used once. Factories get the
 * options from PHP, the shared TipTap modules, and the editor's context: `{ callPlugin }`.
 */
export function resolveExtensions(descriptors, tiptap, context = {}) {
    const extensions = []
    const missing = []

    descriptors.forEach(({ id, options }) => {
        const factory = factories.get(id)

        if (!factory) {
            console.error(`[rich-editor-plus] No JS extension is registered for [${id}].`)
            missing.push(id)

            return
        }

        const decorate = (extension) =>
            (decorators.get(id) ?? []).reduce(
                (decorated, decorator) => decorator(decorated, { options: options ?? {}, tiptap }) ?? decorated,
                extension,
            )

        extensions.push(...[].concat(factory(options ?? {}, tiptap, context)).map(decorate))
    })

    // Plugins can share an extension, such as `listItem`, and TipTap warns about duplicates.
    const unique = [...new Map(extensions.map((extension) => [extension.name, extension])).values()]

    return { extensions: unique, missing }
}

const modules = new Map()

/**
 * Imports the ES modules that plugins ship (see `JsExtension::module()` and `PluginExtension::addModule()`), once per URL per page. A module
 * that fails to load is logged and left to `resolveExtensions()` to report as missing.
 */
export function loadModules(descriptors, api) {
    const urls = [...new Set(descriptors.flatMap(({ modules }) => modules ?? []))]

    return Promise.all(
        urls.map((url) => {
            if (!modules.has(url)) {
                modules.set(
                    url,
                    import(/* @vite-ignore */ url)
                        .then((loaded) => {
                            if (typeof loaded.default === 'function') {
                                loaded.default(api)
                            }
                        })
                        .catch((error) => {
                            modules.delete(url)
                            console.error(`[rich-editor-plus] Could not load the plugin module [${url}].`, error)
                        }),
                )
            }

            return modules.get(url)
        }),
    )
}

const actionArguments = new Map()

/**
 * Registers a function that reads the editor's current state into the arguments a Filament action is mounted
 * with, for example the URL of the link the selection is in. It is the JS counterpart of a PHP plugin's action.
 */
export function registerActionArguments(action, resolver) {
    actionArguments.set(action, resolver)
}

export function resolveActionArguments(action, editor) {
    return actionArguments.get(action)?.(editor) ?? {}
}

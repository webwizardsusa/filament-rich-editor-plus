// StoresEditorFiles::MAX_URL_REQUESTS: the server answers at most this many paths per request.
const URLS_PER_REQUEST = 100

/**
 * Batches the URL lookups of every upload the editor shows into `urls` requests of up to 100 paths per tick, and
 * remembers the answers (a URL, or null for missing) for the life of the editor. A path already asked for waits for
 * that answer instead of asking again. A path the answer leaves out, or a failed request, shows as missing but is not
 * remembered, so the next render asks again.
 */
export function createUrlCache(callPlugin, pluginId) {
    const urls = new Map()
    const waiting = new Map()
    const requested = new Set()
    let queued = null

    const request = (paths) => {
        paths.forEach((path) => requested.add(path))

        new Promise((resolve) => resolve(callPlugin ? callPlugin(pluginId, 'urls', { paths }) : {}))
            .catch(() => ({}))
            .then((result) => {
                const answered = result?.urls && typeof result.urls === 'object' ? result.urls : {}

                paths.forEach((path) => {
                    // The server's own answer, so a relative URL (such as a local disk's `/storage/...`) is kept.
                    const value = answered[path]
                    const url = typeof value === 'string' && value !== '' ? value : null

                    if (Object.hasOwn(answered, path)) {
                        urls.set(path, url)
                    }

                    const callbacks = waiting.get(path) ?? []

                    waiting.delete(path)
                    requested.delete(path)
                    callbacks.forEach((callback) => callback(url))
                })
            })
    }

    const flush = () => {
        queued = null

        const paths = [...waiting.keys()].filter((path) => !requested.has(path))

        for (let start = 0; start < paths.length; start += URLS_PER_REQUEST) {
            request(paths.slice(start, start + URLS_PER_REQUEST))
        }
    }

    return {
        // A URL the server already gave (a `store` answer), so the next render shows it without asking.
        set(path, url) {
            if (typeof url === 'string' && url !== '') {
                urls.set(path, url)
            }
        },

        get(path, callback) {
            if (urls.has(path)) {
                callback(urls.get(path))

                return
            }

            waiting.set(path, [...(waiting.get(path) ?? []), callback])

            if (!requested.has(path)) {
                queued ??= Promise.resolve().then(flush)
            }
        },
    }
}

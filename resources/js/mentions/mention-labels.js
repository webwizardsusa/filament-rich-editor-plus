import { formatMention, mentionKey } from './mention-node'

const BATCH_SIZE = 100

/**
 * Keeps tokens showing current labels, which are looked up on the server and only ever drawn on screen. Each id is
 * looked up once per page, so a failed lookup is not retried and tokens keep their stored labels.
 */
export function createMentionLabels({ editor, fetchLabels }) {
    const { labels } = editor.storage.mention
    const requested = new Set()

    let isDestroyed = false

    const unseenIdsByTrigger = () => {
        const idsByTrigger = {}

        editor.state.doc.descendants((node) => {
            if (node.type.name !== 'mention' || !node.attrs.id || !node.attrs.char) {
                return
            }

            const key = mentionKey(node.attrs.char, node.attrs.id)

            if (!requested.has(key)) {
                requested.add(key)
                ;(idsByTrigger[node.attrs.char] ??= []).push(node.attrs.id)
            }
        })

        return idsByTrigger
    }

    const batches = (idsByTrigger) => {
        const result = []

        for (let start = 0; ; start += BATCH_SIZE) {
            const batch = Object.fromEntries(
                Object.entries(idsByTrigger)
                    .map(([trigger, ids]) => [trigger, ids.slice(start, start + BATCH_SIZE)])
                    .filter(([, ids]) => ids.length),
            )

            if (!Object.keys(batch).length) {
                return result
            }

            result.push(batch)
        }
    }

    const draw = () => {
        editor.view.dom.querySelectorAll('[data-rep-mention-key]').forEach((token) => {
            const label = labels.get(token.dataset.repMentionKey)

            if (label !== undefined) {
                token.textContent = formatMention(token.dataset.repMentionFormat, label)
            }
        })
    }

    const refresh = async () => {
        for (const batch of batches(unseenIdsByTrigger())) {
            let found

            try {
                found = await fetchLabels(batch)
            } catch (error) {
                console.warn('[rich-editor-plus] Could not look up mention labels.', error)

                return
            }

            if (isDestroyed) {
                return
            }

            Object.entries(found ?? {}).forEach(([trigger, labelsById]) => {
                Object.entries(labelsById ?? {}).forEach(([id, label]) => labels.set(mentionKey(trigger, id), label))
            })

            draw()
        }
    }

    const onTransaction = ({ transaction }) => {
        if (transaction.docChanged) {
            refresh()
        }
    }

    editor.on('transaction', onTransaction)

    return {
        refresh,

        destroy() {
            isDestroyed = true
            editor.off('transaction', onTransaction)
        },
    }
}

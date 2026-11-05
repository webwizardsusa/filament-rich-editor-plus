/**
 * A Filament notification when the page has Filament's notifications, the console otherwise.
 */
export function notify(title, body = '') {
    const Notification = window.FilamentNotification

    if (Notification) {
        new Notification().title(title).body(body).danger().send()

        return
    }

    console.warn(`[rich-editor-plus] ${title}${body ? `: ${body}` : ''}`)
}

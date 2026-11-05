/**
 * Reads `message` out through the field's polite live region (`[data-rep-live]`). Screen readers skip a live region
 * whose text didn't change, so a message repeated straight after itself gets a trailing no-break space.
 */
export function announce(region, message) {
    if (!region || !message) {
        return
    }

    region.textContent = region.textContent === message ? `${message} ` : message
}

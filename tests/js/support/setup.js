// jsdom has no layout, so give ProseMirror and Floating UI the few APIs they call.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }

Range.prototype.getClientRects = () => []
Range.prototype.getBoundingClientRect = () => emptyRect
Element.prototype.scrollIntoView = () => {}
document.elementFromPoint = () => null

globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

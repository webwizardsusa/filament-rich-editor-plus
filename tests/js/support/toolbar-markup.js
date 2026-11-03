export function makeToolbarRoot() {
    const root = document.createElement('div')

    root.innerHTML = `
        <div data-rep-block-toolbar="*" hidden>
            <button data-rep-drag-handle draggable="true"></button>
            <button data-rep-control="switcher" data-rep-generic-label="Block" data-rep-multiple-label=":count blocks">
                <span data-rep-switcher-icon></span><span data-rep-switcher-label></span>
            </button>
            <button data-rep-control="moveUp"></button>
            <button data-rep-control="moveDown"></button>
            <span data-rep-inline-tools><button data-rep-tool="bold"></button></span>
            <span data-rep-list-tools hidden>
                <button data-rep-control="list" data-rep-label="List options: :type"><span data-rep-list-icon></span></button>
            </span>
            <span data-rep-block-tools><button data-rep-tool="levelUp"></button></span>
            <button data-rep-control="more"></button>
        </div>
        <div data-rep-slash-menu hidden>
            <button data-rep-block-type="paragraph" id="s-paragraph" role="option"><svg></svg></button>
            <button data-rep-block-type="heading2" id="s-heading2" role="option"><svg></svg></button>
            <button data-rep-block-type="heading3" id="s-heading3" role="option"><svg></svg></button>
            <button data-rep-block-type="bulletList" id="s-bulletList" role="option"><svg></svg></button>
            <button data-rep-block-type="orderedList" id="s-orderedList" role="option"><svg></svg></button>
            <button data-rep-block-type="blockquote" id="s-blockquote" role="option"><svg></svg></button>
            <button data-rep-block-type="codeBlock" id="s-codeBlock" role="option"><svg></svg></button>
            <button data-rep-block-type="divider" id="s-divider" role="option"><svg></svg></button>
            <button data-rep-block-type="table" id="s-table" role="option"><svg></svg></button>
        </div>
        <div data-rep-switcher-menu hidden>
            <button data-rep-block-type="paragraph" role="menuitemradio" aria-checked="false"></button>
            <button data-rep-block-type="heading2" role="menuitemradio" aria-checked="false"></button>
            <button data-rep-block-type="bulletList" role="menuitemradio" aria-checked="false"></button>
            <button data-rep-block-type="orderedList" role="menuitemradio" aria-checked="false"></button>
            <button data-rep-block-type="blockquote" role="menuitemradio" aria-checked="false"></button>
        </div>
        <div data-rep-more-menu hidden>
            <button data-rep-more-action="selectParentBlock"></button>
            <button data-rep-more-action="duplicateBlock"></button>
            <button data-rep-more-action="deleteBlock"></button>
            <button data-rep-more-action="openFindReplace"></button>
        </div>
        <div data-rep-list-menu hidden>
            <button data-rep-list-action="decreaseBlockLevel"></button>
            <button data-rep-list-action="increaseBlockLevel"></button>
            <span data-rep-list-separator></span>
            <button data-rep-list-type="bulletList" role="menuitemradio" aria-checked="false"><svg data-icon="bullet"></svg><span class="rep-menu-item-label">Bulleted list</span></button>
            <button data-rep-list-type="orderedList" role="menuitemradio" aria-checked="false"><svg data-icon="ordered"></svg><span class="rep-menu-item-label">Numbered list</span></button>
        </div>
        <span data-rep-live data-rep-moved-up="Moved up" data-rep-moved-down="Moved down"></span>
    `

    document.body.append(root)

    return root
}

/**
 * A fixed toolbar as `ToolbarRenderer::renderFixedToolbar()` writes it, with a table group and a list group.
 */
export const fixedToolbarMarkup = `
    <div data-rep-fixed-toolbar>
        <button data-rep-control="switcher" data-rep-generic-label="Block" data-rep-multiple-label=":count blocks" tabindex="-1">
            <span data-rep-switcher-icon></span><span data-rep-switcher-label></span>
        </button>
        <span data-rep-inline-tools><button data-rep-tool="bold" tabindex="-1"></button></span>
        <span data-rep-list-tools>
            <button data-rep-control="list" data-rep-label="List options: :type" aria-disabled="true" tabindex="-1"><span data-rep-list-icon><svg></svg></span></button>
        </span>
        <span data-rep-block-tools>
            <span data-rep-block-tools-for="*"></span>
            <span data-rep-block-tools-for="table" hidden><button data-rep-tool="addRowAfter" tabindex="-1"></button></span>
            <span data-rep-block-tools-for="bulletList" hidden><button data-rep-tool="levelUp" tabindex="-1"></button></span>
        </span>
        <button data-rep-control="more" tabindex="-1"></button>
    </div>
`

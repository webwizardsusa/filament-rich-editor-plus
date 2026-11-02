export const findPanelMarkup = `
    <div data-rep-find data-rep-find-count-label=":current of :total" data-rep-find-no-results="No results" data-rep-find-replaced=":count replaced" hidden>
        <input data-rep-find-query />
        <button type="button" data-rep-find-option="matchCase" aria-pressed="false"></button>
        <button type="button" data-rep-find-option="wholeWord" aria-pressed="false"></button>
        <span data-rep-find-count aria-live="polite"></span>
        <button type="button" data-rep-find-action="findPrevious"></button>
        <button type="button" data-rep-find-action="findNext"></button>
        <button type="button" data-rep-find-action="closeFindReplace"></button>
        <input data-rep-find-replacement />
        <button type="button" data-rep-find-action="replaceCurrent"></button>
        <button type="button" data-rep-find-action="replaceAll"></button>
    </div>
`

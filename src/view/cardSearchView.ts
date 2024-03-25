import { ItemView, WorkspaceLeaf } from "obsidian";
import Search from './components/Search.svelte'

export const VIEW_TYPE_CARDNOTESEARCH = "card-note-search-view"
export class CardSearchView extends ItemView {
    component?: Search;
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }
    getViewType(): string {
        return VIEW_TYPE_CARDNOTESEARCH
    }
    getDisplayText(): string {
        return "Notes"
    }
    protected async onOpen(): Promise<void> {
        this.component = new Search({
            target: this.containerEl.children[1],
        })
    }
}
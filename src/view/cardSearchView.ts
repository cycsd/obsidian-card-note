import { ItemView, WorkspaceLeaf } from "obsidian";
import Search from "./components/Search.svelte"
import type CardNote from "main";


export const VIEW_TYPE_CARDNOTESEARCH = "card-notes-view"
export class CardSearchView extends ItemView {
    plugin: CardNote;
    component?: Search;
    constructor(leaf: WorkspaceLeaf, plugin: CardNote) {
        super(leaf);
        this.plugin = plugin;
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
            props: {
                view: this,
            },
        })
    }
}
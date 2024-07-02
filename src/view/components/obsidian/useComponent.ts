import { ButtonComponent, SearchComponent, TextComponent, ToggleComponent } from "obsidian";
import type { Action } from "svelte/action";

export type useSearch = (comp: SearchComponent) => void;

export const obsidianSearch: Action<HTMLDivElement, useSearch> = (ele, use) => {
    use(new SearchComponent(ele))
}

export type useButton = (comp: ButtonComponent) => void
export const obsidianButton: Action<HTMLDivElement, useButton> = (ele, use) => {
    use(new ButtonComponent(ele))
}
export type useToggleButton = {
    buttonSetting: useButton,
    toggle: () => boolean,
}
export const obsdianToggleButton: Action<HTMLDivElement, useToggleButton> = (ele, use) => {
    const button = new ButtonComponent(ele);
    use.toggle() && button.setCta();
    ele.onClickEvent(() => {
        if (use.toggle()) {
            button.setCta();
        }
        else {
            button.removeCta();
        }
    })
    use.buttonSetting(button)
}
export type useToggle = (comp: ToggleComponent) => void
export const obsidianToggle: Action<HTMLDivElement, useToggle> = (ele, use) => {
    use(new ToggleComponent(ele))
}

export type useText = (comp: TextComponent) => void
export const obsidianText: Action<HTMLDivElement, useText> = (ele, use) => {
    use(new TextComponent(ele))
}
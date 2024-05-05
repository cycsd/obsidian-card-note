import type CardNote from "main";
import { Modal, Setting } from "obsidian";

export class LinkSettingModel extends Modal {
    plugin: CardNote;
    label?: string;
    onSubmit: (value?: string) => void;
    constructor(plugin: CardNote, onSubmit: (value?: string) => void) {
        super(plugin.app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }
    onOpen(): void {
        const { contentEl } = this;
        const setting = new Setting(contentEl)
            .setName('Set your label')
            .setDesc('Enter empty could disable adding a label on the link edge automatically')
            .addText(text => {
                text.setValue(this.plugin.settings.defaultLinkLabel ?? '')
                text.onChange(value => {
                    this.label = value.length !== 0 ? value : undefined;
                })
            })
            .addButton(btn => {
                btn.setIcon('check')
                    .onClick(() => {
                        this.onSubmit(this.label)
                        this.close();
                    })
                    .setCta();
            })
    }
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

}
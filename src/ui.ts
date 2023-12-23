import { App, Modal, Setting } from "obsidian";

export class FileNameCheckModal extends Modal {

    result: string | undefined;
    onSubmit: (result: string | undefined) => void;
    constructor(app: App, onSubmit: (result: string | undefined) => void, defaultValue?: string) {
        super(app);
        this.result = defaultValue
        this.onSubmit = onSubmit;
    }
    onOpen(): void {
        const { contentEl } = this;
        //contentEl.createEl("h1", { text: "File Name" });
        new Setting(contentEl)
            .setName("File Name")
            .addText(text => {
                text.setValue(this.result ?? "");
                text.onChange(value => {
                    this.result = value;
                });
            });
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(this.result ?? "");
                        this.close();
                    })
            });
        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText("Cancel")
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(undefined);
                        this.close();
                    })
            })
    }
    onClose(): void {
        let { contentEl } = this;
        contentEl.empty();
    }



}
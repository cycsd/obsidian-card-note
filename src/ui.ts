import { App, Modal, Setting } from "obsidian";

type Cancel = undefined;
export class FileNameCheckModal extends Modal {
    result:string;
	onSubmit: (result: string | Cancel) => void;
	errorMessage?: string
	constructor(
		app: App,
		onSubmit: (result: string | Cancel) => void, defaultValue = "",
		errorMessage?: string,
	) {
        super(app);
        this.result = defaultValue
		this.onSubmit = onSubmit;
		this.errorMessage = errorMessage;
    }
    onOpen(): void {
		const { contentEl } = this;
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
                btn.setButtonText("Create")
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(this.result);
                        this.close();
                    })
            }).addButton(btn => {
                btn.setButtonText("Cancel")
                    .setCta()
                    .onClick(() => {
						this.onSubmit(undefined);
                        this.close();
                    })
			})
		if (this.errorMessage) {
			new Setting(contentEl)
				.setDesc(this.errorMessage!)
		}
    }
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }



}

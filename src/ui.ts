import { App, BlockCache, Modal, Setting, debounce } from "obsidian";
import { BaseReferenceSection, Section } from "dragUpdate"
import { FileInfo } from "utility";


export type CreateFile = {
	type: 'createFile',
	file?: FileInfo,
}

export type LinkToReference = {
	type: 'linkToReference',
	section: BaseReferenceSection,
}
type Cut = {
	type: 'cut'
}
export type BaseAction = CreateFile | LinkToReference | Cut
export type UserAction = BaseAction & { newName: Promise<string> } | Type<'cancel'>
type Type<T extends string> = {
	type: T,
}

type Cancel = undefined;

export type FileNameModelConfig = {
	app: App,
	name: string,
	section: Section,
	// onCreateFile: (newFileName: string) => void,
	// onLinkToReference: (newSectionName: string, section: Section) => void,
	// onCut: () => void,
	onSubmit: (action: UserAction) => void,
	errorMessage?: string,

}
export class FileNameCheckModal extends Modal {
	defaultName: string;
	newName: Promise<string>;
	section: Section;
	// onCreateFile: (newFileName: string) => void;
	// onLinkToReference: (newSectionName: string, section: Section) => void;
	// onCut: () => void;
	onSubmit: (action: UserAction) => void;
	errorMessage?: string
	test: string;

	constructor(
		config: FileNameModelConfig
	) {
		super(config.app);
		this.defaultName = config.name;
		this.newName = Promise.resolve(config.name);
		this.section = config.section;
		// this.onCreateFile = config.onCreateFile;
		// this.onLinkToReference = config.onLinkToReference;
		// this.onCut = config.onCut;
		this.onSubmit = config.onSubmit;
		this.errorMessage = config.errorMessage;
    }
	onOpen(): void {
		// const handleTextChange = async (value: string, setting: Setting) => {
		// 	this.newName = Promise.resolve(value);
		// 	setting.setDesc(getNameDesc(await this.newName));
		// }
		const handleTextChange = this.debounce((value: string, setting: Setting) => {
			//regex value
			this.trySetDescription(setting, this.getNameDesc(value));
			return value
		}, 0.3)
		// const deb = debounce((value: string, setting: Setting) => {

		// })
		const { contentEl } = this;
		const nameSetting = new Setting(contentEl)
			//.setName("New Name")
			.setDesc(this.getNameDesc(this.defaultName))
            .addText(text => {
				text.setValue(this.defaultName ?? "");
				text.onChange(value => {
					this.newName = handleTextChange(value, nameSetting);
					// this.newName = Promise.resolve(value);
					// this.test = value;
					// nameSetting.setDesc(this.test);
                });
			});
		const actions = new Setting(contentEl)
			.addButton(btn => {
				btn.setIcon('file-plus-2')
					.setTooltip('Create file')
					.setCta()
					.onClick(() => {
						this.onSubmit({ type: 'createFile', newName: this.newName });
						this.close();
					})
			})
		if (this.section.type === 'reference') {
			const section = this.section;
			actions.addButton(btn => {
				btn.setIcon('link')
					.setTooltip('Link to reference')
					.setCta()
					.onClick(() => {
						this.onSubmit({
							type: 'linkToReference',
							section,
							newName: this.newName,
						});
						this.close();
					})
			})
		}
		actions.addButton(btn => {
			btn.setIcon('scissors')
				.setTooltip('Cut')
				.setCta()
				.onClick(() => {
					this.onSubmit({ type: 'cut', newName: this.newName });
					this.close();
				})
		}).addButton(btn => {
			btn.setIcon('x')
				.setTooltip(`Cancel`)
				//.setButtonText("Cancel")
				.setCta()
				.onClick(() => {
					this.onSubmit({ type: 'cancel' });
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
	getNameDesc = (name: string): DocumentFragment => {
		const frag = document.createDocumentFragment()
		frag.createDiv().innerText = `Create file ${name}`;
		frag.createDiv().innerText = `or`;
		frag.createDiv().innerText = `Link to block ${name}`;
		return frag
	}
	trySetDescription(setting: Setting, desc: string | DocumentFragment): void {
		try {
			setting?.setDesc(desc); debounce
		} catch (e) {
			console.log("expect set description before closing Modal", e);
		}
	}
	debounce<T extends unknown[], R>(fn: (...arg: [...T]) => R, sec: number) {
		let timer: NodeJS.Timeout;
		return (...arg: [...T]) => {
			clearTimeout(timer);
			return new Promise<R>(resolve => {
				timer = setTimeout(() => {
					const res = fn(...arg);
					resolve(res)
				}, sec * 1000);
			})
		}
	}
}

import { App, Modal, Setting } from "obsidian";
import { BaseReferenceSection, Section, isHeadingBlock } from "src/dragUpdate"
import { BLOCKIDREPLACE, FileInfo, FILENAMEREPLACE } from "src/utility";


export type CreateFile = {
	type: 'createFile',
	file?: FileInfo,
}

export type LinkToReference = {
	type: 'linkToReference',
	section: BaseReferenceSection,
}
type Cut = {
	type: 'cut',
}
export type BaseAction = (CreateFile | LinkToReference) & { newName: string } | Cut
export type UserAction = BaseAction | { type: 'cancel' }

export type FileNameModelConfig = {
	app: App,
	name: string,
	section: Section,
	onSubmit: (action: UserAction) => void,
	errorMessage?: string,

}
export class FileNameCheckModal extends Modal {
	//newName: Promise<string>;
	section: Section;
	onSubmit: (action: UserAction) => void;
	errorMessage?: string
	userInput: string;

	constructor(
		config: FileNameModelConfig
	) {
		super(config.app);
		this.userInput = config.name;
		//this.newName = Promise.resolve(config.name);
		this.section = config.section;
		this.onSubmit = config.onSubmit;
		this.errorMessage = config.errorMessage;
    }
	onOpen(): void {

		const linkReferenceDescription = this.section.type === 'reference'
			? isHeadingBlock(this.section.block)
				? ' or link to heading' : ' or link to block'
			: '';

		const { contentEl } = this;
		const nameSetting = new Setting(contentEl)
			//.setName("New Name")
			.setDesc(`Create file${linkReferenceDescription}`)
			.addText(text => {
				text.setValue(this.userInput ?? "");
				text.onChange(value => {
					this.userInput = value;
                });
			});
		const actions = new Setting(contentEl)
			.addButton(btn => {
				btn.setIcon('file-plus-2')
					.setTooltip('Create file')
					.setCta()
					.onClick(() => {
						this.onSubmit({ type: 'createFile', newName: this.userInput.trimEnd() });
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
							newName: this.userInput.trimEnd()
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
					this.onSubmit({ type: 'cut' });
					this.close();
				})
		}).addButton(btn => {
			btn.setIcon('x')
				.setTooltip(`Cancel`)
				.setCta()
				.onClick(() => {
					this.onSubmit({ type: 'cancel' });
					this.close();
				})
			})
		if (this.errorMessage) {
			actions.setDesc(this.errorMessage)
		}
    }
    onClose(): void {
        const { contentEl } = this;
		contentEl.empty();
	}
	getNameDesc = (fileName: string, blockName?: string): DocumentFragment => {
		const frag = document.createDocumentFragment()
		frag.createDiv().innerText = `Create file ${fileName}`;
		if (blockName) {
			frag.createDiv().innerText = `or`;
			frag.createDiv().innerText = `Link to block ${fileName}`;
		}
		return frag
	}
	trySetDescription(setting: Setting, desc: string | DocumentFragment): void {
		try {
			setting?.setDesc(desc);
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
	parseToValidFile(text: string) {
		return text.replace(FILENAMEREPLACE(), '')
	}
	parseToValidBlockName(text: string) {
		if (this.section.type === 'reference') {
			const block = this.section.block;
			return isHeadingBlock(block)
				? text
				: text.replace(BLOCKIDREPLACE(), '')
		}
	}
}

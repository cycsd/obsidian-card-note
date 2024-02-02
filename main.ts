import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TextFileView,
	normalizePath,
} from "obsidian";
import { dragExtension } from "dragUpdate";
import { isObsidianCanvasView } from "src/adapters/obsidian";
import { FileInfo, createFullPath, isBreak } from "utility";


type ChangeInfo = {
	change: string,//new link text in editor(sourcePath)
	reference: string,//link info,
	sourcePath: string,//filepath 這個link存在於哪個檔案內
}
type Change = {
	data: Record<string, ChangeInfo[]>;
}


// Remember to rename these classes and interfaces!
interface CardNoteSettings {
	dragSymbol: string,
	dragSymbolSize?: number,
	defaultFolder: string,
}

const DEFAULT_SETTINGS: CardNoteSettings = {
	dragSymbol: "💔",
	dragSymbolSize: 18,
	defaultFolder: "",
};
export default class CardNote extends Plugin {
	settings: CardNoteSettings;

	async onload() {
		await this.loadSettings();
		this.registerEditorExtension(dragExtension(this));
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CardNoteTab(this.app, this));
	}
	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	createLink(file: TFile, subpath?: string, displayText?: string) {
		const fileLinkPath = this.app.metadataCache.fileToLinktext(
			file,
			file.path,
			file.extension === "md"
		);
		const sub = subpath ? `#${subpath}` : '';
		const link = `${fileLinkPath}${sub}`
		const useMarkdownLink = this.app.vault.getConfig("useMarkdownLinks");
		const markdownLink = () => {
			const display = displayText ?? link;
			return `[${display}](${link})`;
		}
		const wikiLink = () => {
			const display = displayText ? `|${displayText}` : '';
			return `[[${link}${display}]]`;
		}
		return useMarkdownLink ? markdownLink() : wikiLink();
	}
	getActiveEditorFile() {
		const activeEditor = this.app.workspace.activeEditor;
		const view = this.app.workspace.getActiveViewOfType(TextFileView);
		console.log("detect editor in fn", activeEditor);
		console.log("detect view", view);

		if (view) {
			if (isObsidianCanvasView(view)) {
				const [selectNode] = view.canvas.selection;
				// property type='file'|'text'|'group'... is missing, but in the unknownData property
				// not correspond to typescript api
				const file = selectNode?.file as TFile | undefined;
				return file
			}

		}
		return activeEditor?.file
	}

	async checkFileName(file: FileInfo) {
		if (file.fileName.length === 0) {
			return new Error("File Name can not be empty!");
		}
		if (file.fileName.endsWith(" ")) {
			return new Error("File Name can not end with white space!");
		}
		const filePathUncheck = createFullPath(file)
		const normalFilePath = normalizePath(filePathUncheck);
		this.app.vault.checkPath(normalFilePath)
		if (await this.app.vault.adapter.exists(normalFilePath)) {
			return new Error("File Exist!");
		}
		return file;
	}
	// updateFileLink() {
	// 	const ap = this.app;
	// 	const cache = ap.metadataCache;
	// 	this.app.metadataCache.getFirstLinkpathDest("link path: fileName in link", "file name with extension ex:md")//equal to sourcefile;
	// 	this.app.fileManager.iterateAllRefs((fileName, link) => {
	// 		//sourcePath = 來源檔名
	// 		//linkPath = link target (file Name)
	// 		//getfirstlinkpathdest: 得到來源檔名中此link path連結到哪個file
	// 		cache.getFirstLinkpathDest(, fileName) === sourcfile
	// 	})
	// 	//get change
	// 	//似乎不更新自己
	// 	ap.fileManager.updateInternalLinks
	// 	ap.canvas.renamesubpath

	// }
}

class CardNoteTab extends PluginSettingTab {
	plugin: CardNote;

	constructor(app: App, plugin: CardNote) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("Drag Symbol")
			.setDesc("You can set your prefer drag symbol here")
			.addText((text) =>
				text
					.setPlaceholder("Enter your drag symbol here")
					.setValue(this.plugin.settings.dragSymbol)
					.onChange(async (value) => {
						this.plugin.settings.dragSymbol = value;
						await this.plugin.saveSettings();
					})
		);
		this.addSizeSetting();
		new Setting(containerEl)
			.setName("Default Folder")
			.setDesc("Default loction for new note. if empty, new note will be created in the Vault root.")
			.addText((text) =>
				text
					.setPlaceholder("folder in the vault/sub folder name")
					.setValue(this.plugin.settings.defaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolder = value;
						await this.plugin.saveSettings();
					})
		);

	}
	addSizeSetting() {
		const desc = (value?: number) => {
			return `Change your symbol size.Current size is ${value ?? this.plugin.settings.dragSymbolSize}.(min=1 max=100)`;
		}
		const sizeSetting = new Setting(this.containerEl)
			.setName("Symbol Size (px)")
			.setDesc(desc())
			.addSlider(slider => {
				slider
					.setLimits(1, 100, 1)
					.setValue(this.plugin.settings.dragSymbolSize ?? 18)
					.onChange(async (value) => {
						sizeSetting.setDesc(desc(value));
						this.plugin.settings.dragSymbolSize = value;
						await this.plugin.saveSettings();
					})
					.setDynamicTooltip()
			}
			);
	}
	// addInternalLinkSetting() {
	// 	const sp = document.createSpan();
	// 	sp.appendText("Default link is Wikilink, open this setting will ch").
	// 	new Setting(this.containerEl)
	// 		.setName("Link Style")
	// 		.setDesc(document.createDocumentFragment())
	// }
}

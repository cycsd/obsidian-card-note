import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { dragExtension } from "dragUpdate";

// Remember to rename these classes and interfaces!
interface CardNoteSettings {
	dragSymbol: string,
	defaultFolder: string,
}

const DEFAULT_SETTINGS: CardNoteSettings = {
	dragSymbol: "💔",
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
	addCommandToObsidian() {
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
			},
		});
	}

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
			.setDesc("you can set your prefer drag symbol here")
			.addText((text) =>
				text
					.setPlaceholder("Enter your drag symbol here")
					.setValue(this.plugin.settings.dragSymbol)
					.onChange(async (value) => {
						this.plugin.settings.dragSymbol = value;
						await this.plugin.saveSettings();
					})
			);
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
}

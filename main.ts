import {
	App,
	Editor,
	MarkdownPostProcessorContext,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TextFileView,
	debounce,
} from "obsidian";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
// Remember to rename these classes and interfaces!
const debounceMousemove = debounce(
	(event: MouseEvent, view: EditorView) => {
		const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
		console.log("mouse moving moving", pos);
	},
	1000 * 1,
	true
);
function throttle<T extends unknown[], V>(
	cb: (...args: [...T]) => V,
	timeout?: number,
	resetTimer?: boolean
) {
	let timer = false;
	let result: V;
	return (...args: [...T]) => {
		if (!timer) {
			timer = true;
			setTimeout(() => {
				timer = false;
			}, timeout);
			result = cb(...args);
		}
		return result;
	};
}
function addSymbolWhenMouseMove(event: MouseEvent, view: EditorView) {
	const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
	console.log("mouse moving moving", pos);
	const breakpoints = view.state.field(breakpointStateSet);
	if (pos) {
		const line = view.lineBlockAt(pos);
		console.log("before? from field: ", breakpoints);
		console.log("now? from posAtCoords:  ", line.from);
		if (!breakpoints || breakpoints?.pos !== line.from) {
			console.log("dipatch", { pos: line.from, on: true });
			view.dispatch({
				effects: breakpointEffect.of({ pos: line.from, on: true }),
			});
		}
	}
	return pos;
}
const throttleMousemovve = throttle(addSymbolWhenMouseMove, 1000 * 0.5);
const mouseMoveWatch = EditorView.domEventHandlers({
	mousemove: (event: MouseEvent, view) => {
		//debounceMousemove(event, view);
		throttleMousemovve(event, view);
	},
});
const emptyMarker = new (class extends GutterMarker {
	toDOM() {
		return document.createTextNode("ø");
		// const div = document.createElement("div");
		// div.draggable = true;
		// div.innerText = "::";
		// return div;
	}
})();

const emptyLineGutter = gutter({
	lineMarker(view, line) {
		//return line.from == line.to ? emptyMarker : null;
		return emptyMarker;
	},
	initialSpacer: () => emptyMarker,
});
const breakpointMarker = new (class extends GutterMarker {
	toDOM() {
		return document.createTextNode("💔");
	}
})();
const breakpointEffect = StateEffect.define<{ pos: number; on: boolean }>({
	map: (val, mapping) => ({ pos: mapping.mapPos(val.pos), on: val.on }),
});
type nullableeffect = { pos: number; on: boolean } | undefined;
const breakpointStateSet = StateField.define<nullableeffect>({
	create() {
		return undefined;
	},
	update(set, transaction) {
		for (const e of transaction.effects) {
			if (e.is(breakpointEffect)) {
				console.log("recieve", e.value);
				set = e.map(transaction.changes)?.value;
				console.log("after map", set);
			}
		}
		console.log("after map", set);
		return set;
	},
});
// function toggleBreakpoint(view: EditorView, pos: number, on: boolean) {
// 	const breakpoints = view.state.field(breakpointStateSet);
// 	let hasBreakpoint = false;
// 	breakpoints.between(pos, pos, () => {
// 		hasBreakpoint = true;
// 	});
// 	console.log("leave or in?", on);
// 	console.log("position is ?", pos);
// 	if (!hasBreakpoint || !on) {
// 		view.dispatch({
// 			effects: breakpointEffect.of({ pos, on: on }),
// 		});
// 	}
// }

const breakpointGutter = gutter({
	class: "cm-breakpoint-gutter",
	//markers: (v) => v.state.field(breakpointStateSet),
	lineMarker(view, line) {
		const toggleLine = view.state.field(breakpointStateSet);
		return line.from === toggleLine?.pos ? breakpointMarker : null;
	},
	initialSpacer: () => breakpointMarker,
	// domEventHandlers: {
	// 	pointerover(view, line, event) {
	// 		toggleBreakpoint(view, line.from, true);
	// 		return true;
	// 	},
	// 	pointerleave(view, line, event) {
	// 		toggleBreakpoint(view, line.from, false);
	// 		return true;
	// 	},
	// },
});
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.loadEditerExtension();
		this.addRibbonToLeftBar();
	}
	loadEditerExtension() {
		this.registerEditorExtension([
			breakpointStateSet,
			breakpointGutter,
			emptyLineGutter,
			mouseMoveWatch,
			// EditorView.updateListener.of((v) => {
			// 	console.log("will update listener listen mouse event?", v);
			// 	if (v.docChanged) {
			// 		// if (timer) clearTimeout(timer);
			// 		// timer = setTimeout(() => {
			// 		// 	console.log("DO SOMETHING WITH THE NEW CODE");
			// 		// }, 500);
			// 	}
			// }),
		]);
	}
	onunload() {}

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

	processMarkdownPreviewModeView() {
		this.registerMarkdownPostProcessor((el, ctx) => {
			addDragIcon(el, ctx, this);
		});
	}
	registerVaultEvent() {
		this.app.workspace.onLayoutReady(() => {
			this.app.vault.on("create", (file) => {
				const edit = this.app.workspace.activeEditor;
				edit?.editor?.somethingSelected;
				const exalidrawExtendsTextFileView =
					this.app.workspace.getActiveViewOfType(TextFileView) as any;
				const actleaf =
					exalidrawExtendsTextFileView.getActiveEmbeddable().leaf;
				//actleaf.view.setMode("source");
				console.log("excalidarw active", exalidrawExtendsTextFileView);
				console.log(
					"active: ",
					exalidrawExtendsTextFileView.getActiveEmbeddable()
				);
				console.log("leaf? ", actleaf);
				console.log("edit:", edit); //可以抓到正確的edit file
				console.log("note create:", file);
			});
		});
	}
	registerWorkspaceEvent() {
		//當在obsidian內切換分頁時觸發
		//但偵測不到excalidraw內部切換eidtor，
		//因為workspace會覺得依然還是在excalidraw當下的分頁，並沒有分頁被切換
		this.app.workspace.on("active-leaf-change", async () => {
			const file = this.app.workspace.getActiveFile();
			console.log("on leaf change");
			console.log(file?.name);
		});
		// editor-change event觸發時機點為 editor content被使用者更改的時候
		// 並不是在切換editor的時候觸發
		this.app.workspace.on("editor-change", (ed) => {
			const edit = this.app.workspace.activeEditor;
			const file = this.app.workspace.getActiveFile();
			console.log("edit change info:", edit);
			console.log("active File:", file);
			console.log("edit File:", edit?.file);
			console.log("edit", edit?.editor);
		});
		//file-open
		//不管點擊左側的explore 或是上方的tab分頁都會觸發此方法
		//推測應該可以在這邊決定leaf view 但 excalidraw 使用 mokey patch的方法在 setViewState
		//故還需再測試是否有甚麼問題，造成excalidraw的作者不使用file open event
		this.app.workspace.on("file-open", (file) => {
			console.log("file open", file);
		});
		this.app.workspace.on("active-leaf-change", (leaf) => {
			const edit = this.app.workspace.activeEditor;
			const file = this.app.workspace.getActiveFile();
			console.log("in leaf change:", leaf);
			console.log("edit", edit);
			console.log(file);
		});
	}
	registerDomEventAndRemoveEventWhenUnload() {
		//在obsidian內註冊dom event盡量使用此方法，
		//會自動幫你管理當plugin disable的時候將方法註銷
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "mouseup", (event: MouseEvent) => {
			const editor = this.app.workspace.activeEditor?.editor;
			const select = editor?.getSelection();
			console.log(select);
		});

		this.registerDomEvent(document, "click", (e) => {
			const file = this.app.workspace.getActiveFile();
			console.log("inclick file:", file);
		});
	}
	reigesterIntervalAndRemoveWhenUnload() {
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => {
				this.app.workspace.getLeavesOfType("");

				// 	console.log("setInterval");
				// const file = this.app.workspace.getActiveFile();
				// 	const editor = this.app.workspace.activeEditor;

				// const textfile_view = this.app.workspace.getActiveViewOfType(
				// 	MarkdownView
				// );
				// console.log("interval file veiw: ",textfile_view);
				// console.log("active editor(MarkdownfileInfo): ",editor?.file);
				// console.log("active file: ",file);
			}, 30 * 1000)
		);
	}
	addCommandToObsidian() {
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});
	}
	addRibbonToLeftBar() {
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("This is a notice!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
function addDragIcon(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: MyPlugin
) {
	const dragIcon = createDiv();
	dragIcon.innerText = "::::";
	el.insertBefore(dragIcon, el.firstChild);
}

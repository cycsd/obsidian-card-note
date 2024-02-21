import {
	App,
	BlockCache,
	CacheItem,
	HeadingCache,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TextFileView,
	normalizePath,
} from "obsidian";
import { LinkFilePath, LinkPath, dragExtension } from "src/dragUpdate";
import { isCanvasFileNode, isObsidianCanvasView } from "src/adapters/obsidian";
import { FileInfo, LinkInfo, LinkToChanges, RequiredProperties, createFullPath, isBreak } from "src/utility";
import { CanvasData, CanvasFileData } from "obsidian/canvas";
import { isExcalidrawView } from "src/adapters/obsidian-excalidraw-plugin";


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
		this.app.metadataCache.on("changed", (file, data, cach) => {
			console.log("file", file, 'data', data, 'cache', cach);
		})
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
	createPath(file: TFile, subpath?: string, displayText?: string) {
		return this.app.metadataCache.fileToLinktext(
			file,
			file.path,
			file.extension === 'md'
		)
	}
	createLinkText(file: TFile, subpath?: string, displayText?: string): RequiredProperties<LinkPath, 'file' | 'text'> {
		const fileLinkPath = this.createPath(file);
		const sub = subpath ?? '';
		const fullLinkPath = `${fileLinkPath}${sub}`
		const useMarkdownLink = this.app.vault.getConfig("useMarkdownLinks");
		const markdownLink = () => {
			const display = displayText ?? file;
			return `[${display}](${fullLinkPath})`;
		}
		const wikiLink = () => {
			const display = displayText ? `|${displayText}` : '';
			return `[[${fullLinkPath}${display}]]`;
		}
		const linkText = useMarkdownLink ? markdownLink() : wikiLink();
		return {
			path: fileLinkPath,
			subpath,
			file,
			text: linkText,
			displayText,
		}
	}
	getActiveEditorFile() {
		const activeEditor = this.app.workspace.activeEditor;
		const view = this.app.workspace.getActiveViewOfType(TextFileView);
		console.log("detect editor in fn", activeEditor);
		console.log("detect view", view);

		if (view) {
			//return canvas node because excalidraw also use canvas node and need to get narrow to block offset
			if (isObsidianCanvasView(view)) {
				const [selectNode] = view.canvas.selection;
				// selection is canvas node not the json canvas node data,
				// so property type = 'file' | 'text' | 'group' is in the unknownData property
				//const file = selectNode?.file as TFile | undefined;
				return selectNode && isCanvasFileNode(selectNode) ? selectNode : undefined
			}
			if (isExcalidrawView(view)) {
				// 	this.app.workspace.activeEditor
				const embeddable = view.getActiveEmbeddable()
				return embeddable?.node && isCanvasFileNode(embeddable.node) ? embeddable.node : undefined
			//embeddable?.node?.file ?? (embeddable?.leaf.view instanceof MarkdownView ? embeddable.leaf.view.file : undefined)
			// 	return
			}

		}
		return activeEditor
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
			return new Error("File exist!");
		}
		return file;
	}
	// updateBlockLink(file: TFile, from: number, to: number, newPath: (link: LinkText) => string) {
	// 	const [blocks, headings] = this.findLinkBlocks(file, from, to);

	// 	const subpath = [...blocks.map(block => `#^${block.id}`), ...headings.map(heading => `#${heading}`)];
	// 	//split self reference and update self editor text
	// 	const [selfLinks,outer] = this.findLinks(file, subpath);

	// 	const changes = LinkToChanges(outer, newPath);
	// 	this.app.fileManager.updateInternalLinks(changes);

	// }
	updateInternalLinks(linkMap: Map<string, LinkInfo[]>, newPath: (link: LinkInfo) => string) {
		const changes = LinkToChanges(linkMap, newPath);
		//觀察是否不更新自己以及canvas
		this.app.fileManager.updateInternalLinks(changes);
	}
	renameCanvasSubpath(origin: LinkFilePath, newFile: LinkFilePath) {
		const canvasUpdater = this.app.fileManager.linkUpdaters.canvas;
		if (origin.file.path === newFile.file.path && origin.subpath !== newFile.subpath) {
			canvasUpdater.renameSubpath(origin.file, origin.subpath ?? "", newFile.subpath ?? "");
		}
	}
	getCanvas(filter?: (canvasPath: string, embed: { file?: string, subpath?: string }) => boolean) {
		const canvasUpdater = this.app.fileManager.linkUpdaters.canvas;
		const canvases = canvasUpdater.canvas.index.getAll();
		const queue: string[] = [];
		for (const canvasFilePath in canvases) {
			const canvasCache = canvases[canvasFilePath];
			const find = canvasCache.embeds.find(embed => filter?.(canvasFilePath, embed) ?? true);
			if (find) {
				queue.push(canvasFilePath);
			}
		}
		return queue
	}
	updateCanvasNodes(canvasPath: string, newNode: (node: CanvasFileData) => CanvasFileData) {
		const canvasFile = this.app.vault.getAbstractFileByPath(canvasPath);
			if (canvasFile instanceof TFile && canvasFile.extension === 'canvas') {
				return this.app.vault.process(canvasFile, data => {
					const canvasData = JSON.parse(data) as CanvasData;
					const nodeUpdate = canvasData.nodes.map(newNode)
					const newData: CanvasData = {
						edges: canvasData.edges,
						nodes: nodeUpdate,
					}
					return JSON.stringify(newData);
				})
			}
	}
	updateCanvasLinks(
		canvasPathSet: string[],
		map: (node: CanvasFileData) => CanvasFileData) {
		const result = canvasPathSet.map(canvasPath => this.updateCanvasNodes(canvasPath, node => {
			if (node.type === 'file') {
				return map(node)
			}
			return node
		}))
		return Promise.all(result)
	// return this.updateCanvasNodes(queue, node => {
	// 	if (node.type === 'file' && findNode(node)) {
	// 		return map(node)
	// 	}
	// 	return node
	// })
	}
	findLinkBlocks(file: TFile, from: number, to: number): [BlockCache[], HeadingCache[]] {
		const cache = this.app.metadataCache.getFileCache(file);
		const blocks = cache?.blocks;
		const inRange = (item: CacheItem) => {
			const start = item.position.start;
			const end = item.position.end;
			return from <= start.offset && end.offset <= to
		}
		const blocksInRange: BlockCache[] = [];
		for (const blockName in blocks) {
			const blockInfo = blocks[blockName];
			if (inRange(blockInfo)) {
				blocksInRange.push(blockInfo)
			}
		}
		const headingInRange: HeadingCache[] = cache?.headings?.filter(inRange) ?? [];
		return [blocksInRange, headingInRange]
	}
	findLinks(targetFile: TFile, subpath: string[], match: (link: LinkPath) => boolean): [LinkInfo[] | undefined, Map<string, LinkInfo[]>] {
		const cache = this.app.metadataCache;
		const fileManger = this.app.fileManager;
		const linkMap = new Map<string, LinkInfo[]>();
		fileManger.iterateAllRefs((fileName, linkInfo) => {
			fileName.normalize()
			//sourcePath = 來源檔名
			//linkPath = link target (file Name)
			const normalizeLink = linkInfo.link.replace(/\u00A0/, '').normalize();
			const path = normalizeLink.split('#')[0];
			const linkSubpath = normalizeLink.substring(path.length);
			//getfirstlinkpathdest: 得到來源檔名中此link path連結到哪個file
			if (match({ path, subpath: linkSubpath, file: cache.getFirstLinkpathDest(path, fileName) ?? undefined })) {
				const links = linkMap.get(fileName);
				const linkText: LinkInfo = { path, subpath: linkSubpath, link: linkInfo };
				if (links) {
					links.push(linkText);
				}
				else {
					linkMap.set(fileName, [linkText]);
				}
			}
		})
		// basename沒有 extension
		// name = path 且帶有 .md extension
		console.log("check file basename,path,name", targetFile);
		const selfLink = linkMap.get(targetFile.path);
		linkMap.delete(targetFile.path);
		return [selfLink, linkMap];
	}
	// updateInternalHeadingLink(originFile: TFile, oldHeading: HeadingCache, newFile: TFile, newHeadingName: string) {
	// 	const cache = this.app.metadataCache;
	// 	const fileManger = this.app.fileManager;
	// 	fileManger.iterateAllRefs((fileName, link) => {

	// 	})
	// }
}
// heading regex?
// var Vx = /[!"#$%&()*+,.:;<=>?@^`{|}~\/\[\]\\\r\n]/g
// 	, zx = /([:#|^\\\r\n]|%%|\[\[|]])/g;

// match link regex
// /^(!?\[\[)(.*?)(\|(.*))?(]])$/
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
			.setName("Drag symbol")
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
			.setName("Default folder")
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
			return `Change your symbol size. Current size is ${value ?? this.plugin.settings.dragSymbolSize}.(min=1 max=100)`;
		}
		const sizeSetting = new Setting(this.containerEl)
			.setName("Symbol size (px)")
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
}

//metadataCache.getLinkpathDest(a,e)
//vault.getAbstractFileByPath(e) filepath with extension(CanvasName.canvas)
//const canveses = canvas.index.getAll()
// canvases[canvas name].caches ... ('cache13kj2;3:{},embeds:{file:,subpath}[])
//updateRelatedLinks
//vault.process(file,f)

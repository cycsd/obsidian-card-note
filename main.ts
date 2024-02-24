import {
	App,
	BlockCache,
	CacheItem,
	HeadingCache,
	LinkCache,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TextFileView,
	normalizePath,
} from "obsidian";
import { LinkFilePath, LinkPath, dragExtension } from "src/dragUpdate";
import { isCanvasFileNode, isObsidianCanvasView } from "src/adapters/obsidian";
import { FILENAMEREPLACE, FileInfo, HEADINGREPLACE, LinkInfo, LinkToChanges, RequiredProperties, createFullPath } from "src/utility";
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
			const display = displayText ?? fullLinkPath;
			return `[${display}](${fullLinkPath.replace(' ', '%20')})`;
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
				return selectNode && isCanvasFileNode(selectNode)
					? { fileEditor: selectNode, offset: selectNode.child.before.length }
					: undefined
			}
			if (isExcalidrawView(view)) {
				// 	this.app.workspace.activeEditor
				const embeddable = view.getActiveEmbeddable(),
					before = embeddable?.node?.child.before as string ?? '';

				return embeddable?.node && isCanvasFileNode(embeddable.node)
					? { fileEditor: embeddable.node, offset: before.length } : undefined
			//embeddable?.node?.file ?? (embeddable?.leaf.view instanceof MarkdownView ? embeddable.leaf.view.file : undefined)
			// 	return
			}

		}
		return { fileEditor: activeEditor, offset: 0 }
	}

	async checkFileName(file: FileInfo): Promise<FileInfo | Error> {
		const fileName = file.fileName;
		if (fileName.length === 0) {
			return new Error("File Name can not be empty!");
		}
		else if (fileName.endsWith(" ")) {
			return new Error("File Name can not end with white space!");
		}
		else {
			const matchInvalidSymbol = FILENAMEREPLACE().exec(fileName);
			if (matchInvalidSymbol) {
				return new Error(`File Name can not contains symbols [!"#$%&()*+,.:;<=>?@^\`{|}~/[]\r\n]`);
			}
		}
		const filePathUncheck = createFullPath(file)
		const normalFilePath = normalizePath(filePathUncheck);
		this.app.vault.checkPath(normalFilePath)
		if (await this.app.vault.adapter.exists(normalFilePath)) {
			return new Error("File exist!");
		}
		return { ...file, fileName: normalFilePath };
	}
	updateInternalLinks(linkMap: Map<string, LinkInfo[]>, newPath: (link: LinkInfo) => string) {
		const changes = LinkToChanges(linkMap, newPath);
		//不更新canvas
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
		map: (node: CanvasFileData) => CanvasFileData
	) {
		const result = canvasPathSet.map(canvasPath => this.updateCanvasNodes(canvasPath, node => {
			if (node.type === 'file') {
				return map(node)
			}
			return node
		}))
		return Promise.all(result)
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
	createLinkInfo(cache: LinkCache): LinkInfo {
		const normalizeLink = cache.link.replace(/\u00A0/, '').normalize();
		const path = normalizeLink.split('#')[0];
		const subpath = normalizeLink.substring(path.length);
		return {
			path,
			subpath,
			link: cache,
		}
	}
	findLinks(targetFile: TFile, match: (link: LinkPath) => boolean): [LinkInfo[] | undefined, Map<string, LinkInfo[]>] {
		const cache = this.app.metadataCache;
		const fileManger = this.app.fileManager;
		const linkMap = new Map<string, LinkInfo[]>();
		fileManger.iterateAllRefs((fileName, linkCache) => {
			fileName.normalize()
			//sourcePath = 來源檔名
			//linkPath = link target (file Name)
			const linkInfo = this.createLinkInfo(linkCache);
			const { path, subpath } = linkInfo;
			//getFirstLinkpathDest: 得到來源檔名中此link path連結到哪個file
			if (match({ path, subpath, file: cache.getFirstLinkpathDest(path, fileName) ?? undefined })) {
				const links = linkMap.get(fileName);
				if (links) {
					links.push(linkInfo);
				}
				else {
					linkMap.set(fileName, [linkInfo]);
				}
			}
		})
		const selfLink = linkMap.get(targetFile.path);
		linkMap.delete(targetFile.path);
		return [selfLink, linkMap];
	}
	normalizeHeadingToLinkText(heading: string) {
		//const useMarkdownLink = this.app.vault.getConfig("useMarkdownLinks"),
		const path = heading.replace(HEADINGREPLACE(), ' ').replace(/\s+/g, ' ');

		return path
	}
	replaceSpaceInLinkText(link: string) {
		const useMarkdownLink = this.app.vault.getConfig("useMarkdownLinks");
		return useMarkdownLink
			? link.replace(' ', '%20')
			: link
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


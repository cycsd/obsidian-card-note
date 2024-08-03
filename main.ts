import type { BlockCache, CacheItem, HeadingCache, LinkCache, OpenViewState, WorkspaceLeaf, } from "obsidian"
import {
	App,
	MarkdownRenderer,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TextFileView,
	WorkspaceSplit,
	normalizePath,
} from "obsidian";
import type { LinkFilePath, LinkPath } from "src/dragUpdate";
import { dragExtension } from "src/dragUpdate";
import { getOffset, isCanvasFileNode, isCanvasEditorNode, isObsidianCanvasView } from "src/adapters/obsidian";
import type { FileInfo, LinkInfo, RequiredProperties, } from "src/utility";
import { FILENAMEREPLACE, HEADINGREPLACE, LinkToChanges, createFullPath } from "src/utility";
import type { CanvasData, CanvasFileData, AllCanvasNodeData } from "obsidian/canvas";
import { isExcalidrawView } from "src/adapters/obsidian-excalidraw-plugin";
import { CardSearchView, VIEW_TYPE_CARDNOTESEARCH } from "src/view/cardSearchView";
import { LinkSettingModel } from "src/ui/linkSettings";



interface CardNoteSettings {
	dragSymbol: string,
	dragSymbolSize?: number,
	defaultFolder: string,
	columnWidth: number,
	rowHeight: number,
	autoLink: boolean,
	arrowTo: 'from' | 'end' | 'both' | 'none',
	defaultLinkLabel?: string,
	query: string,
	useRegex: boolean,
	matchCase: boolean,
	showSearchDetail: boolean,
	include: string,
	exclude: string,
}

const DEFAULT_SETTINGS: CardNoteSettings = {
	dragSymbol: "💔",
	dragSymbolSize: 18,
	defaultFolder: "",
	columnWidth: 250,
	rowHeight: 250,
	autoLink: false,
	arrowTo: 'end',
	query: "string",
	useRegex: false,
	matchCase: false,
	showSearchDetail: false,
	include: "",
	exclude: "",
};
export default class CardNote extends Plugin {
	settings: CardNoteSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		this.registerEditorExtension(dragExtension(this));
		this.registerView(
			VIEW_TYPE_CARDNOTESEARCH,
			(leaf) => new CardSearchView(leaf, this)
		);
		this.addRibbonIcon("scan-search",
			"Search Notes",
			() => this.activateView());
		this.addCommands();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CardNoteTab(this.app, this));
	}
	addCommands() {
		this.addCommand({
			id: 'set-label',
			name: 'Set Default Label',
			callback: () => {
				new LinkSettingModel(this, (value) => {
					this.settings.defaultLinkLabel = value;
					this.saveSettings();
				}).open()
			}
		})
		this.addCommand({
			id: 'auto-link',
			name: 'Enable Auto Link',
			checkCallback: this.changeAutoLinkSettings(
				() => !this.settings.autoLink,
				() => {
					this.settings.autoLink = true
				}
			)
		})
		this.addCommand({
			id: 'cancel-auto-link',
			name: 'Disable Auto Link',
			checkCallback: this.changeAutoLinkSettings(
				() => this.settings.autoLink,
				() => {
					this.settings.autoLink = false
				})
		})
		this.addCommand({
			id: 'arrow-to-from',
			name: 'Arrow to From',
			checkCallback: this.changeAutoLinkSettings(
				() => this.settings.arrowTo !== 'from',
				() => {
					this.settings.arrowTo = 'from'
				})
		})
		this.addCommand({
			id: 'arrow-to-end',
			name: 'Arrow to End',
			checkCallback: this.changeAutoLinkSettings(
				() => this.settings.arrowTo !== 'end',
				() => {
					this.settings.arrowTo = 'end'
				})
		})
		this.addCommand({
			id: 'arrow-to-both',
			name: 'Arrow to Both',
			checkCallback: this.changeAutoLinkSettings(
				() => this.settings.arrowTo !== 'both',
				() => {
					this.settings.arrowTo = 'both'
				})
		})
		this.addCommand({
			id: 'arrow-to-none',
			name: 'Arrow to None',
			checkCallback: this.changeAutoLinkSettings(
				() => this.settings.arrowTo !== 'none',
				() => {
					this.settings.arrowTo = 'none'
				})
		})

	}
	changeAutoLinkSettings(check: () => boolean, action: () => void) {
		return (checking: boolean) => {
			if (check()) {
				if (!checking) {
					action();
					this.saveSettings();
				}
				return true
			}
			return false
		}
	}
	async activateView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CARDNOTESEARCH),
			createNewLeaf = async () => {
				const newLeaf = workspace.getLeaf('split');
				await newLeaf?.setViewState({
					type: VIEW_TYPE_CARDNOTESEARCH,
					active: true,
				})
				return newLeaf
			};


		let leaf = leaves.length > 0
			? leaves[0]
			: await createNewLeaf()

		workspace.revealLeaf(leaf!)

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
		//this.app.fileManager.generateMarkdownLink()

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
		const view = this.app.workspace.getActiveViewOfType(TextFileView);

		if (view) {
			//return canvas node because excalidraw also use canvas node and need to get narrow to block offset
			if (isObsidianCanvasView(view)) {
				const [selectNode] = view.canvas.selection;
				// selection is canvas node not the json canvas node data,
				// so property type = 'file' | 'text' | 'group' is in the unknownData property
				//const file = selectNode?.file as TFile | undefined;
				return isCanvasEditorNode(selectNode)
					? { fileEditor: selectNode, offset: getOffset(selectNode) }
					: undefined
			}
			if (isExcalidrawView(view)) {
				const excalidrawShape = view.getViewSelectedElements().first()
				const embeddable = view.getActiveEmbeddable();

				return isCanvasEditorNode(embeddable?.node)
					? {
						fileEditor: {
							...embeddable.node,
							id: excalidrawShape?.id ?? embeddable.node.id,
						}, offset: getOffset(embeddable.node)
					} : undefined
			}

		}
		return { fileEditor: this.app.workspace.activeEditor, offset: 0 }
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
		//can not update canvas
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
	updateCanvasNodes(canvasPath: string, newNode: (node: AllCanvasNodeData) => AllCanvasNodeData) {
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
			//const start = item.position.start;
			const end = item.position.end;
			//return from <= start.offset && end.offset <= to
			return end.offset > from
				&& end.offset <= to
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
	findLinks(targetFile: TFile, match: (link: LinkPath) => boolean): Promise<[LinkInfo[] | undefined, Map<string, LinkInfo[]>]> {
		return new Promise(res => {
			const cache = this.app.metadataCache;
			const fileManger = this.app.fileManager;
			const linkMap = new Map<string, LinkInfo[]>();
			fileManger.iterateAllRefs((fileName, linkCache) => {
				fileName.normalize()
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
			res([selfLink, linkMap]);
		})
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
	createRandomHexString(length = 6) {
		const id = [...Array(length).keys()]
			.map(_ => (16 * Math.random() | 0).toString(16)).join('')
		return id
	}
	listenDragAndDrop(e: DragEvent, content: string, dropEvent: (e: DragEvent) => void) {
		const trim = content.trim(),
			display = trim.length > 600 ? trim.substring(0, 600).concat(' ...') : trim;

		const floatingSplits = this.app.workspace.floatingSplit as WorkspaceSplit,
			popoutWindows = floatingSplits.children.map(win => win.containerEl),
			allWindows = [this.app.workspace.containerEl].concat(popoutWindows),
			eventListeners = allWindows.map(container => this.createDraggingAndDropEvent(e, container, display, dropEvent))

		return {
			reset: () => eventListeners.forEach(listen => listen.reset()),
		}
	}
	createDraggingAndDropEvent(
		e: DragEvent,
		container: HTMLElement,
		content: string,
		dropEvent: (e: DragEvent) => void) {

		const dragContentEle = document.createElement('div');
		//plugin's css style doesn't apply to popup window
		//so assign style via js in this place.
		dragContentEle.hide();
		dragContentEle.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
		dragContentEle.style.width = '300px';
		dragContentEle.style.height = 'min-content';
		//dragContentEle.style.minHeight = '200px';
		dragContentEle.style.position = 'absolute';
		dragContentEle.style.padding = '5px 25px';
		dragContentEle.style.borderWidth = '3px';
		dragContentEle.style.borderRadius = '10px';
		dragContentEle.style.border = 'solid';
		//https://stackoverflow.com/questions/55095367/while-drag-over-the-absolute-element-drag-leave-event-has-been-trigger-continuo
		//closing pointer events can prevent dragbackground's dragleave event from being triggerd when the mouse move quickly from background to dragcontent element.
		dragContentEle.style.pointerEvents = 'none';

		const dragoverBackground = document.createElement('div');

		dragoverBackground.setCssStyles({
			opacity: '0',
			width: '100%',
			height: '100%',
			position: 'fixed'
		})

		MarkdownRenderer.render(
			this.app,
			content,
			dragContentEle,
			'',
			this
		)
		//need to add dragoverBackground to the container, 
		//let your dragover event be triggerd correctly when your mouse move over the embedded iframe.
		container.appendChild(dragoverBackground);
		container.appendChild(dragContentEle);

		const showDragContent = (e: DragEvent) => {
			dragContentEle.show();
			//e.preventDefault();
		}
		const moveDragContent = (e: DragEvent) => {
			const x = e.clientX,
				y = e.clientY;
			dragContentEle.style.transform = `translate(${x}px,${y}px)`;
			//https://stackoverflow.com/questions/27361925/unable-to-detect-the-drop-event-in-chrome-extension-when-dropped-a-file
			//use preventDefault here then the drop event will trigger correctly
			e.preventDefault();
		}
		const hideDragContent = (e: DragEvent) => {
			//e.preventDefault();
			// the dragleave event will be triggerd by child elements in the container not only the background element.
			if (e.target === dragoverBackground) {
				dragContentEle.hide();
			}
		}

		container.addEventListener('dragenter', showDragContent);
		container.addEventListener('dragover', moveDragContent);
		container.addEventListener('dragleave', hideDragContent);
		container.addEventListener('drop', dropEvent)

		return {
			reset: () => {
				container.removeChild(dragContentEle);
				container.removeChild(dragoverBackground);
				container.removeEventListener('drop', dropEvent)
				container.removeEventListener('dragover', moveDragContent);
				container.removeEventListener('dragenter', showDragContent);
				container.removeEventListener('dragleave', hideDragContent);
			}
		}
	}

	getDropView(e: DragEvent) {
		const locate = this.app.workspace.getDropLocation(e),
			target = locate.children.find(child => child.tabHeaderEl.className.contains("active")),
			drawView = target?.view;
		return drawView
	}
	onClickOpenFile(e: MouseEvent, file: TFile, openState?: OpenViewState) {
		const isFnKey = () => e.ctrlKey || e.metaKey;
		this.app.workspace.getLeaf(
			isFnKey() && e.shiftKey && e.altKey ? 'window'
				: isFnKey() && e.altKey ? 'split'
					: isFnKey() ? 'tab'
						: false
		)
			.openFile(file, openState)
	}
	arrowToFrom() {
		return this.settings.arrowTo == 'both' || this.settings.arrowTo == 'from'
	}
	arrowToEnd() {
		return this.settings.arrowTo == 'both' || this.settings.arrowTo == 'end'
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
			.setDesc("Default loction for new note. if empty, new note will be created in the vault root.")
			.addText((text) =>
				text
					.setPlaceholder("/sub folder name")
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


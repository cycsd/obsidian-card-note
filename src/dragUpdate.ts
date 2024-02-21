import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet, Line } from "@codemirror/state";
import { foldable } from "@codemirror/language"
import { Break, ReCheck, createDefaultFileName, createFullPath, FileInfo, isBreak, markdownParser, LineBreak as LINEBREAK, MarkdownFileExtension, throttle, LinkInfo, RequiredProperties } from "src/utility";
import { BlockCache, CacheItem, HeadingCache, ListItemCache, MarkdownFileInfo, MarkdownRenderer, Plugin, SectionCache, TFile } from "obsidian";
import { CreateFile, FileNameCheckModal, FileNameModelConfig, LinkToReference, UserAction } from "src/ui";
import { getEA, insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing, isExcalidrawView, isObsidianMarkdownEmbeded } from "src/adapters/obsidian-excalidraw-plugin";
import { isCanvasFileNode, isObsidianCanvasView } from "src/adapters/obsidian";
import { CanvasFileNode } from "./adapters/obsidian/types/canvas";



type Selection = {
	from: number,
	to: number,
}
type FoldableLine = {
	type: 'foldable',
	startLine: Line,
	selection: Selection,
}
type OneLine = {
	type: 'line',
	line: Line,
	selection: Selection,
	section?: Section,
}
type SingleSelection = {
	type: 'single',
	selection: Selection,
}
type MutipleSelction = {
	type: 'mutiple',
	selections: Selection[],
}
type BaseSelection = FoldableLine | OneLine | SingleSelection | MutipleSelction;
type UserSelection = BaseSelection & {
	content: string,
};

type ListBlock = {
	type: 'list',
	cache: ListItemCache
}
type HeadingBlcok = {
	type: 'heading'
	cache: HeadingCache
}
type LinkBlock = {
	type: 'linkBlock',
	id: string,
	cache: SectionCache
}
type BaseReferenceBlock = ListBlock | HeadingBlcok | LinkBlock;
type BaseBlock = {
	cache: SectionCache,
}
// type BaseBlock = {
// 	type: 'heading' | 'list' | 'linkBlock'
// 	defaultName: string
// } | {
// 	type: 'paragraph'
// 	extractName: string
// }
type Block = BaseReferenceBlock | BaseBlock;
export type BaseReferenceSection = {
	type: 'reference',
	block: Block,
}
export type UnReferenceSection = {
	type: 'unreference' | 'lazy',
}
export type Section = (BaseReferenceSection | UnReferenceSection) & {
	// typse: 'referenceable' | 'unreferenceable',
	content?: string
}

type CreatNewFile = CreateFile & {
	newFile: TFile
}
type LinkToFile = LinkToReference & {
	sourceFile: TFile,
	subpath: string,
}
type Action = (CreatNewFile | LinkToFile) & {
	newName: Promise<string>
};
export type LinkPath = {
	path: string,
	// #^...
	subpath?: string,
	// link to which file
	file?: TFile,
	text?: string,
	displayText?: string,
}

export type LinkFilePath = RequiredProperties<LinkPath, 'file'>

type NameBlock = { id: string } & CacheItem;

function isRerenceBlock(cache: CacheItem & { id?: string }): cache is NameBlock {
	return cache.id !== undefined
}
function isSpecialBlock(block: Block): block is BaseReferenceBlock {
	return 'type' in block
		&& (block.type === 'heading'
			|| block.type === 'list'
			|| block.type === 'linkBlock')

}
function getSelectOffset(select: FoldableLine | OneLine | SingleSelection) {
	if (select.type === 'line' && select.section?.type === 'reference') {
		const pos = select.section.block.cache.position;
		return {
			from: pos.start.offset,
			to: pos.end.offset,
		}
	}
	else {
		return {
			from: select.selection.from,
			to: select.selection.to,
		}
	}
}

function getLinkBlocks(select: UserSelection, file: TFile | null | undefined, plugin: CardNote): [BlockCache[], HeadingCache[]] {
	if (!file) {
		return [[], []];
	}
	else if (select.type === 'mutiple') {
		const res = select.selections.map(sel => plugin.findLinkBlocks(file, sel.from, sel.to));
		const blocks = res.flatMap(r => r[0]);
		const headings = res.flatMap(r => r[1]);
		return [blocks, headings];
	}
	else {
		const { from, to } = getSelectOffset(select);
		return plugin.findLinkBlocks(file, from, to);
	}
}
function selected(select: Selection, section: SectionCache) {
	return (section.position.start.offset > select.from && section.position.end.offset < select.to)
		|| (section.type === 'list')
}
function getListDefaultName(block: ListBlock) {
	return block.cache.id ?? 'list parser'
}
function getDefaultName(section: Section) {
	if (section.type === 'reference') {
		const block = section.block;
		if (isSpecialBlock(block)) {
			return block.type === 'heading'
				? block.cache.heading
				: block.type === 'linkBlock'
					? block.id
					: getListDefaultName(block)
		}
	}
}
type ReNameConfig = Omit<FileNameModelConfig, "onSubmit">;
async function userAction(plugin: CardNote, section: Section, selected: UserSelection) {
	const folderPath = plugin.settings.defaultFolder;
	const getUserRename = (config: ReNameConfig) => {
		return new Promise<UserAction | Break>(resolve => {
			const onSubmit = (action: UserAction) => {
				resolve(action);
			}
			new FileNameCheckModal({ ...config, onSubmit })
				.open();
		})
	}
	const provide = async (arg: ReNameConfig, unvalid: UserAction | undefined, error: string) => {
		if (unvalid?.type !== 'cancel') {
			const name = (await unvalid?.newName) ?? arg.name;
			return getUserRename({ ...arg, name, errorMessage: error });
		}
	}
	const check = async (value: UserAction): Promise<Required<UserAction> | Error> => {
		if (value.type !== 'cancel') {
			const newName = await value.newName;
			if (value.type === 'createFile') {
				const file = await plugin.checkFileName({ folderPath, fileName: newName, extension: MarkdownFileExtension });
				return file instanceof Error ? file : { ...value, file }
			}
		}
		return value
	}
	const action = await ReCheck<ReNameConfig, UserAction, Required<UserAction>>({
		create() {
			//"if not referencalbe ,extract from content";
			const defulatName = getDefaultName(section) ?? selected.content.split(LINEBREAK, 1)[0].substring(0, 20).trim()
			return {
				app: plugin.app,
				section,
				name: defulatName,
			};
		},
		update(prev) {
			return prev;
		},
		provide,
		check,
	})
	return action;
}
function moveElement(elm: HTMLElement, x: number, y: number) {
	elm.style.transform = `translate(${x}px,${y}px)`;
}
function getPosition(e: DragEvent) {
	return { x: e.clientX, y: e.clientY };
}
function getSection(sourceFile: TFile | undefined | null, selected: UserSelection, plugin: CardNote): Section {
	if (sourceFile instanceof TFile) {
		const fileCache = plugin.app.metadataCache.getFileCache(sourceFile)
		const findCorrespondBlock = () => {
			console.log("user selection:", selected);
			if (selected.type === 'mutiple') {
				return
			}
			const start = selected.selection.from;
			const match = (block: CacheItem) => {
				return block.position.start.offset === start;
			}
			const block = fileCache?.sections?.find(cache => {
				// if (info.type === "line" || info.type === 'foldable') {
				// 	const line = getLine(info);
				// 	sec.position.start.offset === line.from
				// 	&&sec.position.end.offset === line.to

				// }

				//only top list show in section cache,so find the top list first
				//next step will find the corresponding list in cache.listItems
				if (cache.type === 'list') {
					return cache.position.start.offset <= start
						&& start <= cache.position.end.offset;
				}
				else {
					return match(cache)
				}

			});
			return block
		}
		const blockCache = findCorrespondBlock();
		console.log("cache", fileCache);
		console.log("find block cache", blockCache);
		const match = (cache: CacheItem) => {
			return selected.type !== 'mutiple' && cache.position.start.offset === selected.selection.from
		}
		const getList = (): ListBlock | undefined => {
			if (blockCache?.type === 'list') {
				const listItem = fileCache?.listItems?.find(match);
				if (listItem) {
					return {
						type: blockCache.type,
						cache: listItem,
					}
				}
			}
		}
		const getHeading = (): HeadingBlcok | undefined => {
			if (blockCache?.type === 'heading') {
				const heading = fileCache?.headings?.find(match);
				return {
					type: blockCache.type,
					cache: heading!,
				}
			}
		}
		const getBlock = (): LinkBlock | BaseBlock | undefined => {
			if (blockCache) {
				return blockCache.id
					? {
						type: 'linkBlock',
						cache: blockCache,
						id: blockCache.id,
					}
					: {
						cache: blockCache,
					}
			}
		}
		const block = getList() ?? getHeading() ?? getBlock();
		console.log("block", block);
		return block
			? {
				type: 'reference',
				block,
			}
			: {
				type: 'unreference',
			}
	}
	else {
		return {
			type: 'unreference'
		}
	}
}
type UpdateLinksInDrawPara = {
	textFile: Map<string, LinkInfo[]>,
	canvas: string[],
	getNewPath: (oldPath: LinkPath) => LinkFilePath,
	linkMatch: (link: LinkPath) => boolean,
}
export const dragExtension = (plugin: CardNote) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		const container = plugin.app.workspace.containerEl;
		let ghost: HTMLElement;
		let dragoverBackground: HTMLElement;
		let info: UserSelection;
		let source: MarkdownFileInfo | CanvasFileNode | undefined | null;
		const handleDrop = async (e: DragEvent) => {
			const createFileAndDraw = async (
				draw: (action: Action, target: RequiredProperties<LinkPath, 'file' | 'text'> | string) => void,
				updateLinksInDraw: (para: UpdateLinksInDrawPara) => Omit<UpdateLinksInDrawPara, 'getNewPath' | 'linkMatch'>
			) => {
				const section = info.type === 'line' ? info.section! : getSection(source?.file, info, plugin);
				const action = await userAction(plugin, section, info);
				if (!isBreak(action)) {
					if (action.type === 'createFile') {
						//replace editor's select line or text with link
						const filePath = createFullPath(action.file);
						const newFile = await plugin.app.vault.create(filePath, info.content);
						const fileLink = plugin.createLinkText(newFile);
						//const newPath = fileLink.path;
						//if (section.type === 'reference') {
						if (source?.file) {
							//update vault internal link
							const [blocks, headings] = getLinkBlocks(info, source.file, plugin);
							const subpathSet = [...blocks.map(block => `#^${block.id}`), ...headings.map(cache => `#${cache.heading}`)];
							const match = (link: LinkPath) =>
								(link.path === source?.file?.path || link.file === source?.file)
								&& link.subpath !== undefined
								&& subpathSet.contains(link.subpath);
							const createNewPath = (oldPath: LinkPath): LinkFilePath => {
								return plugin.createLinkText(newFile, oldPath.subpath, oldPath.displayText);

							}
							const [selfLinks, outer] = plugin.findLinks(
								source.file, subpathSet,
								match);
							const canvasWithLink = plugin.getCanvas((path, embed) => {
								const subpath = embed.subpath;//#^
								return match({ path: embed.file ?? '', subpath })
							})
							const undealData = updateLinksInDraw({
								textFile: outer,
								canvas: canvasWithLink,
								linkMatch: match,
								getNewPath: createNewPath
							});
							plugin.updateInternalLinks(undealData.textFile, text => {
								const newPath = createNewPath({ path: text.path, subpath: text.subpath });
								return `${newPath.path}${newPath.subpath}`
							})
							plugin.updateCanvasLinks(undealData.canvas, node => {
								if (match({ path: node.file, subpath: node.subpath })) {
									const newPath = createNewPath({ path: node.file, subpath: node.subpath });
									return {
										...node,
										file: newPath.path + MarkdownFileExtension,
										subpath: newPath.subpath,
									}
								}
								return node
							})
						}
						//handle self link and replace text with link
						const replaceTextWithLink = () => {
							const trans = view.state.update({
								changes: info.type !== 'mutiple'
									? { ...getSelectOffset(info), insert: fileLink.text }
									: info.selections.map(line => {
										return { from: line.from, to: line.to, insert: fileLink.text }
									})
							})
							view.dispatch(trans);
						};
						replaceTextWithLink();
						// console.log("detect file cache change?") not immediately
						// plugin.app.fileManager.iterateAllRefs((file, cache) => {
						// 	console.log("file: ", file, "link cache:", cache);
						// });
						// plugin.app.vault.process(newFile, data => {
						// 	console.log("detect new file", data);
						// 	return data
						// })
						//plugin.app.metadataCache.getFileCache
						draw({ ...action, newFile: newFile }, fileLink);
					}
					if (action.type === 'linkToReference') {
						const name = await action.newName;
						const subpathPrevSymbol = isSpecialBlock(action.section.block)
							&& action.section.block.type === 'heading' ? '#' : '#^';
						const subpath = subpathPrevSymbol + name;
						const fileLink = plugin.createLinkText(source!.file!, subpath);
						draw({
							...action,
							subpath,
							sourceFile: source!.file!
						}, fileLink);
					}
				}

			};
			const locate = plugin.app.workspace.getDropLocation(e);
			const target = locate.children.find(child => child.tabHeaderEl.className.contains("active"));
			const drawView = target?.view;
			if (isExcalidrawView(drawView)) {
				// const ea = getEA();
				// const eaView = ea.setView(view);
				createFileAndDraw(
					(action, target) => {
						if (typeof (target) !== 'string') {
							insertEmbeddableNoteOnDrawing(e, drawView, target.text, target.file, plugin);
						}
					},
					(para) => {
						const { linkMatch, textFile, getNewPath } = para
						if (textFile.delete(drawView.file?.path ?? "")) {
							const nodes = Array.from(drawView.embeddableLeafRefs.entries()).map(value => {
								const [id, refObject] = value;
								const getLinkInfo = (node: CanvasFileNode) => {
									return { path: node.filePath, subpath: node.subpath }
								}
								if (isObsidianMarkdownEmbeded(refObject)
									&& isCanvasFileNode(refObject.node)
									&& linkMatch(getLinkInfo(refObject.node))) {
									return { id, link: getNewPath(getLinkInfo(refObject.node)) }
								}
							}).filter(v => v !== undefined) as { id: string, link: LinkFilePath }[];
							nodes.forEach(node => {
								const element = drawView.excalidrawAPI.getSceneElements().find((e) => e.id === node.id);
								drawView.excalidrawData.elementLinks.set(node.id, node.link.text!)
								//@ts-ignore
								ExcalidrawLib.mutateElement(element, { link: node.link.text });
							}
							)
							drawView.setDirty(99);
							drawView.updateScene({ appState: { activeEmbeddable: null } });

						}
						return {
							...para,
							textFile,
						}
					});
			} else if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(e);
				createFileAndDraw((action, target) => {
					// const file = action.type === 'createFile' ? action.newFile : action.sourceFile;
					// const subpath = action.type === 'linkToReference' ? action.subpath : undefined;
					// drawView.canvas.createFileNode({
					// 	file: file,
					// 	pos,
					// 	subpath,
					// 	save: true
					// });
					if (typeof (target) !== 'string') {
					drawView.canvas.createFileNode({
						file: target.file,
						pos,
						subpath: target.subpath,
						save: true,
					})
					}
					else {
						//drawView.canvas.creatTextNode
					}
				},
					(para) => {
						const { linkMatch, getNewPath, canvas } = para;
						const findSelf = canvas.find(canvas => canvas === drawView.file?.path);
						if (findSelf) {
							drawView.canvas.nodes.forEach((node, id) => {
								const path = (node: CanvasFileNode): LinkPath => ({
									path: node.filePath,
									file: node.file,
									subpath: node.subpath
								})
								if (isCanvasFileNode(node) && linkMatch(path(node))) {
									const newPath = getNewPath(path(node));
									node.setFilePath(newPath.file.path, newPath.subpath ?? "")
								}
							});
							//drawView.canvas.requestSave();
							return {
								...para,
								canvas: canvas.filter(canvas => canvas !== findSelf),
							}
						}
						return para
					}
					,);
			}
		}
		const displayContentWhenDragging = (e: DragEvent) => {
			if (ghost) {
				const pos = getPosition(e);
				moveElement(ghost, pos.x, pos?.y);
				if (!ghost.isShown()) {
					ghost.show();
				}
			}
			e.preventDefault();
		};
		//dragSymbol.addEventListener("drag", displayContentWhenDragging);
		dragSymbol.addEventListener("dragstart", (e) => {
			source = plugin.getActiveEditorFile();
			const getSelection = () => {
				const selectLines = view.state.selection.ranges.map(range => ({
					from: range.from,
					to: range.to,
				}))
				const content = selectLines.map(range => {
					return view.state.sliceDoc(range.from, range.to);
				}).join().trim();
				return { content, selectLines };
			}

			const getLineString = (): UserSelection => {
				const statefield = view.state.field(dragSymbolSet);
				const start = statefield.iter().from;
				const doc = view.state.doc;
				const line = view.state.doc.lineAt(start);
				//console.log("get line", line);
				const foldableRange = foldable(view.state, line.from, line.to);
				if (foldableRange) {
					return {
						type: 'foldable',
						startLine: line,
						selection: {
							from: line.from,
							to: foldableRange.to,
						},
						content: doc.sliceString(line.from, foldableRange.to),
					}
				}
				else {
					const selected: OneLine = {
						type: 'line',
						line,
						selection: {
							from: line.from,
							to: line.to,
						},
					}
					const section = getSection(source?.file, { ...selected, content: '' }, plugin);
					const content = section && section.type === 'reference'
						? doc.sliceString(section.block.cache.position.start.offset, section.block.cache.position.end.offset)
						: line.text;
					return {
						...selected,
						content,
						section,
					}
				}
			}
			const defaultSelect = getSelection();
			info = defaultSelect.content.length === 0
				? getLineString()
				: defaultSelect.selectLines.length === 1
					? { type: 'single', selection: defaultSelect.selectLines.first()!, content: defaultSelect.content }
					: { type: 'mutiple', selections: defaultSelect.selectLines, content: defaultSelect.content };

			//Drag table will cause dragend event would be triggerd immediately at dragstart
			//https://stackoverflow.com/questions/19639969/html5-dragend-event-firing-immediately
			setTimeout(() => {
				if (!ghost) {
					const div = document.createElement("div");
					//set position to absolute and append it to body to show custom element when dragging
					div.addClass("ghost");
					div.hide();
					moveElement(div, e.clientX, e.clientY);
					const bg = document.createElement("div");
					bg.addClass("dragbackground")
					dragoverBackground = container.appendChild(bg);
					ghost = container.appendChild(div);
				}
				else {
					ghost = container.appendChild(ghost);
					dragoverBackground = container.appendChild(dragoverBackground);
				}
				MarkdownRenderer.render(
					plugin.app,
					info.content,
					ghost,
					"",
					plugin);
			});
			plugin.registerDomEvent(container, "drop", handleDrop);
			plugin.registerDomEvent(container, "dragover", displayContentWhenDragging);
		});

		const reset = () => {
			container.removeEventListener("drop", handleDrop);
			container.removeEventListener("dragover", displayContentWhenDragging);
			container.removeChild(ghost);
			container.removeChild(dragoverBackground);
			ghost.replaceChildren();
		};

		return {
			reset,
		}
	}
	const dragMarker = new (class extends GutterMarker {
		destroy(dom: Node): void {
		}
		toDOM(view: EditorView) {
			const dragSymbol = document.createElement("div");
			dragSymbol.draggable = true;
			const symbol = dragSymbol.createSpan();
			symbol.innerText = plugin.settings.dragSymbol;
			symbol.style.fontSize = `${plugin.settings.dragSymbolSize}px`;

			const { reset } = addDragStartEvent(dragSymbol, view);

			dragSymbol.addEventListener("dragend", () => {
				reset();
			});

			return dragSymbol;
		}
	})();
	const mousemoveEffect = StateEffect.define<{ from: number, to: number }>({
		map: (val, mapping) => ({ from: mapping.mapPos(val.from), to: mapping.mapPos(val.to) }),
	});
	const dragSymbolSet = StateField.define<RangeSet<GutterMarker>>({
		create() {
			return RangeSet.empty;
		},
		update(set, transaction) {
			set = set.map(transaction.changes);
			for (const e of transaction.effects) {
				if (e.is(mousemoveEffect)) {
					set = RangeSet.of(dragMarker.range(e.value.from));
				}
			}
			return set;
		},
		//依此stateField狀態所需要更新的Extension都可以放在provide funciton中提供出來
		provide: (value) => {
			const gut = gutter({
				markers: (v) => {
					const range_set = v.state.field(value);
					return range_set;
				},
				initialSpacer: () => dragMarker,
			})
			return [gut];
		}
	});
	const addSymbolWhenMouseMove = (event: MouseEvent, view: EditorView) => {
		const pos = view.posAtCoords({
			x: event.clientX,
			y: event.clientY,
		});
		if (pos) {
			const dragLine = view.state.field(dragSymbolSet);
			const line = view.lineBlockAt(pos);
			let hasDragPoint = false;
			dragLine.between(line.from, line.from, () => {
				hasDragPoint = true;
			});
			if (!hasDragPoint) {
				view.dispatch({
					effects: mousemoveEffect.of({ from: line.from, to: line.to }),
				});
			}
		}
		return pos;
	};
	const mouseMoveWatch = EditorView.domEventHandlers({
		mousemove: (event: MouseEvent, view) => {
			//debounceMousemove(event, view);
			throttle(addSymbolWhenMouseMove, 0.2)(event, view);
		},
	});


	return [
		dragSymbolSet,
		mouseMoveWatch,
	];
};


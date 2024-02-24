import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet, Line } from "@codemirror/state";
import { foldable } from "@codemirror/language";
import { Break, ReCheck, isBreak, LineBreak as LINEBREAK, MarkdownFileExtension, throttle, LinkInfo, RequiredProperties, BLOCKIDREPLACE, HEADINGREPLACE, listItemParser } from "src/utility";
import { BlockCache, CachedMetadata, CacheItem, HeadingCache, ListItemCache, MarkdownFileInfo, MarkdownRenderer, SectionCache, TFile } from "obsidian";
import { BaseAction, FileNameCheckModal, FileNameModelConfig, UserAction } from "src/ui";
import { createTextOnDrawing, insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing, isExcalidrawView, isObsidianMarkdownEmbeded } from "src/adapters/obsidian-excalidraw-plugin";
import { isCanvasFileNode, isObsidianCanvasView } from "src/adapters/obsidian";
import { CanvasFileNode, CanvasView } from "./adapters/obsidian/types/canvas";
import { ExcalidrawView } from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';




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
	cache: ListItemCache,
}
type HeadingBlcok = {
	type: 'heading',
	cache: HeadingCache,
	name: string,
}
type LinkBlock = {
	type: 'linkBlock',
	name: string,
	cache: SectionCache
}
type NamedBlock = LinkBlock | HeadingBlcok | (ListBlock & { name: string });
type UnNamedBlock = {
	cache: SectionCache,
} | ListBlock;
// type BaseBlock = {
// 	type: 'heading' | 'list' | 'linkBlock'
// 	defaultName: string
// } | {
// 	type: 'paragraph'
// 	extractName: string
// }
type Block = NamedBlock | UnNamedBlock;
export type BaseReferenceSection = {
	type: 'reference',
	block: Block,
	file: TFile,
}
export type LazyReferenceSection = {
	type: 'lazy',
	file: TFile,
}
export type UnReferenceSection = {
	type: 'unreference'
}
export type Section = (BaseReferenceSection | LazyReferenceSection | UnReferenceSection) //& {

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

export function isNamedBlock(block: Block): block is NamedBlock {
	return 'name' in block && block.name !== undefined;
}
export function isHeadingBlock(block: Block): block is HeadingBlcok {
	return 'type' in block && block.type === 'heading';
}
export function isListBlock(block: Block): block is ListBlock {
	return 'type' in block && block.type === 'list';
}

function getSelectOffset(select: FoldableLine | OneLine | SingleSelection) {
	if (select.type === 'line' && select.section?.type === 'reference') {
		const pos = select.section.block.cache.position;
		return {
			from: pos.start.offset,
			to: pos.end.offset,
		};
	}
	else {
		return {
			from: select.selection.from,
			to: select.selection.to,
		};
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


type ReNameConfig = Omit<FileNameModelConfig, "onSubmit">;

async function userAction(plugin: CardNote, section: Section, selected: UserSelection) {
	const folderPath = plugin.settings.defaultFolder;
	const getUserRename = (config: ReNameConfig) => {
		return new Promise<(UserAction) | Break>(resolve => {
			const onSubmit = (action: UserAction) => {
				resolve({ ...action });
			};
			new FileNameCheckModal({ ...config, onSubmit })
				.open();
		});
	};
	const provide = async (arg: ReNameConfig, unvalid: UserAction | undefined, error: string) => {
		if (unvalid?.type !== 'cancel' && unvalid?.type !== 'cut') {
			const newName = unvalid?.newName;
			const name = newName && newName.length !== 0 ? newName : arg.name;
			return getUserRename({ ...arg, name, errorMessage: error });
		}
	};
	const check = async (value: UserAction): Promise<Required<UserAction> | Error> => {
		if (value.type !== 'cancel' && value.type !== 'cut') {
			const newName = value.newName;
			if (value.type === 'createFile') {
				const file = await plugin.checkFileName({ folderPath, fileName: newName, extension: MarkdownFileExtension });
				return file instanceof Error ? file : { ...value, file };
			}
			if (value.type === 'linkToReference') {
				const findUnvalidBlockSymbol = () => BLOCKIDREPLACE().exec(value.newName);
				//? new Error('Block id noly accept alphanumeric and -') : value;
				return isHeadingBlock(value.section.block)
					? value
					: findUnvalidBlockSymbol()
						? new Error('Block id only accept alphanumeric and -')
						: value;
			}
		}
		return value;
	};
	const action = await ReCheck<ReNameConfig, UserAction, Required<UserAction>>({
		create() {
			//"if not referenceable ,extract from content";
			const getDefault = () => {
				return selected.content.split(LINEBREAK, 1)[0].substring(0, 20).trim();
			};

			const defulatName =
				section.type === 'reference'
					? isNamedBlock(section.block)
						? section.block.name
						: isListBlock(section.block)
							? listItemParser(selected.content)?.item
							: getDefault()
					: getDefault();

			return {
				app: plugin.app,
				section,
				name: defulatName ?? "",
			};
		},
		update(prev) {
			return prev;
		},
		provide,
		check,
	});
	return action;
}
function moveElement(elm: HTMLElement, x: number, y: number) {
	elm.style.transform = `translate(${x}px,${y}px)`;
}
function getPosition(e: DragEvent) {
	return { x: e.clientX, y: e.clientY };
}
function getSection(sourceFile: TFile | undefined | null, selected: UserSelection, plugin: CardNote, offset = 0): Section {
	if (sourceFile instanceof TFile && selected.type !== 'mutiple') {
		const fileCache = plugin.app.metadataCache.getFileCache(sourceFile),
			matchStart = (block: CacheItem) => {
				const start = selected.selection.from + offset;
				return block.position.start.offset === start;
			},
			findCorrespondBlock = () => {
				console.log("user selection:", selected);
				const start = selected.selection.from + offset;
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
						return matchStart(cache);
					}

				});
				return block;
			};

		const blockCache = findCorrespondBlock(),
			getList = (): ListBlock & { name?: string } | undefined => {
			if (blockCache?.type === 'list') {
				const listItem = fileCache?.listItems?.find(item => {
					return item.position.start.offset >= selected.selection.from
						&& item.position.end.offset <= selected.selection.to
				});
				if (listItem) {
					return {
						type: blockCache.type,
						cache: listItem,
						name: listItem.id
					};
				}
			}
			},
			getHeading = (): HeadingBlcok | undefined => {
			if (blockCache?.type === 'heading') {
				const heading = fileCache?.headings?.find(matchStart);
				if (heading) {
					return {
						type: blockCache.type,
						name: heading?.heading,
						cache: heading,
					};
				}
			}
			},
			getBlock = (): LinkBlock | UnNamedBlock | undefined => {
			if (blockCache) {
				return blockCache.id
					? {
						type: 'linkBlock',
						cache: blockCache,
						name: blockCache.id,
					}
					: {
						cache: blockCache,
					};
			}
			};

		const block = getList() ?? getHeading() ?? getBlock();

		return block
			? {
				type: 'reference',
				block,
				file: sourceFile,
			}
			: {
				type: 'unreference',
			};
	}
	else {
		return {
			type: 'unreference'
		};
	}
}
type UpdateLinksInDrawPara = {
	textFile: Map<string, LinkInfo[]>,
	canvas: string[],
	getNewPath: (oldPath: LinkPath) => LinkFilePath,
	linkMatch: (link: LinkPath) => boolean,
}
type FileCache = {
	file: TFile,
	data: string,
	cache: CachedMetadata,
}
export function fileUpdateObserver(plugin: CardNote, file: TFile) {
	let res: Promise<FileCache> | undefined,
		waiting: ((value: FileCache | PromiseLike<FileCache>) => void)[] = [];
	const metadataCache = plugin.app.metadataCache;
	const e = metadataCache.on('changed', (changeFile, data, cache) => {
		if (changeFile === file) {
			//metadataCache.offref(e);
			const r = {
				file: changeFile,
				data,
				cache,
			};
			res = Promise.resolve(r);
			waiting.forEach(resolve => resolve(r));
			waiting = [];
			console.log("need to be close after excute once");
		}
	});
	return {
		getUpdate: () => res ?? new Promise<FileCache>(resolve => {
			waiting.push(resolve);
		}),
		close: () => metadataCache.offref(e),
	};
}
export async function onFilesUpdated(plugin: CardNote, files: TFile[], on: (cache: FileCache[]) => void, timeLimited: number) {
	const time = timeLimited * files.length,
		observers = files.map(file => fileUpdateObserver(plugin, file)),
		closeObserver = () => observers.forEach(ob => ob.close()),
		update = observers.map(ob => ob.getUpdate());

	return new Promise<void>((resolve, reject) => {
		resolve(Promise.all(update).then(data => { closeObserver(); on(data); }));
		setTimeout(() => {
			closeObserver();
			reject(`files: ${files.map(file => file.path)} are not detected in ${time} seconds, `);
		}, 1000 * time);
	});

}
type FileEditor = {
	fileEditor: MarkdownFileInfo | CanvasFileNode | null | undefined,
	offset: number,
}
async function extractSelect(
	action: Required<BaseAction>,
	extract: UserSelection,
	view: EditorView,
	activeFile: FileEditor | null | undefined,
	locatedView: CanvasView | ExcalidrawView,
	updateLinksInDraw: (para: UpdateLinksInDrawPara) => Omit<UpdateLinksInDrawPara, 'getNewPath' | 'linkMatch'>,
	draw: (target: string | RequiredProperties<LinkPath, 'file' | 'text'>) => void,
	plugin: CardNote) {

	let target: string | RequiredProperties<LinkPath, 'file' | 'text'>;
	const updateInternalLinks = (
		sourceFile: TFile,
		createNewPath: (old: LinkPath) => LinkFilePath,
		match: (old: LinkPath) => boolean,
		updateAfterDraw: TFile[]) => {
		const [selfLinks, outer] = plugin.findLinks(
			sourceFile, match);
		const canvasHasMatchLinks = plugin.getCanvas((canvasPath, embed) => {
			const subpath = embed.subpath;//#^
			return match({ path: embed.file ?? '', subpath });
		});
		const undealData = updateLinksInDraw({
			textFile: outer,
			canvas: canvasHasMatchLinks,
			linkMatch: match,
			getNewPath: createNewPath
		});
		plugin.updateInternalLinks(undealData.textFile, text => {
			const newPath = createNewPath({ path: text.path, subpath: text.subpath });
			return `${newPath.path}${newPath.subpath}`;
		});
		plugin.updateCanvasLinks(undealData.canvas, node => {
			if (match({ path: node.file, subpath: node.subpath })) {
				const newPath = createNewPath({ path: node.file, subpath: node.subpath });
				return {
					...node,
					file: newPath.path + MarkdownFileExtension,
					subpath: newPath.subpath,
				};
			}
			return node;
		});
		if (selfLinks) {
			const linksSet = selfLinks.map(l => l.link.link);
			onFilesUpdated(plugin, updateAfterDraw, (data) => {
				const res = new Map<string, LinkInfo[]>;
				data.map(d => {
					const links = d.cache.links ?? [];
					const embeds = d.cache.embeds ?? [];
					const all = links.concat(embeds);
					const linkRef = all.filter(cache => linksSet.contains(cache.link))
						.map(plugin.createLinkInfo);
					return {
						file: d.file.path,
						linkRef
					};
				}).forEach(d => { if (d.linkRef.length > 0) { res.set(d.file, d.linkRef); } });
				plugin.updateInternalLinks(res, text => {
					const newPath = createNewPath({ path: text.path, subpath: text.subpath });
					return `${newPath.path}${newPath.subpath}`;
				});
			}, 10);
		}
	};
	if (action.type === 'createFile') {
		//replace editor's select line or text with link
		const filePath = action.file.fileName;
		const newFile = await plugin.app.vault.create(filePath, extract.content);
		const newFileLink = plugin.createLinkText(newFile);
		target = newFileLink;
		//const newPath = fileLink.path;
		//if (section.type === 'reference') {
		if (activeFile?.fileEditor?.file) {
			const sourceFile = activeFile.fileEditor.file;
			//update vault internal link
			const [blocks, headings] = getLinkBlocks(extract, sourceFile, plugin);
			const subpathSet = [...blocks.map(block => `#^${block.id}`), ...headings.map(cache => `#${cache.heading}`)];
			const match = (link: LinkPath) =>
				(link.path === sourceFile.path || link.file === sourceFile)
				&& link.subpath !== undefined
				&& subpathSet.contains(link.subpath);
			const createNewPath = (oldPath: LinkPath): LinkFilePath => {
				return plugin.createLinkText(newFile, oldPath.subpath, oldPath.displayText);

			};
			updateInternalLinks(sourceFile, createNewPath, match, [sourceFile, newFile]);
			// const [selfLinks, outer] = plugin.findLinks(
			// 	sourceFile, match);
			// const canvasHasMatchLinks = plugin.getCanvas((canvasPath, embed) => {
			// 	const subpath = embed.subpath;//#^
			// 	return match({ path: embed.file ?? '', subpath })
			// })
			// const undealData = updateLinksInDraw({
			// 	textFile: outer,
			// 	canvas: canvasHasMatchLinks,
			// 	linkMatch: match,
			// 	getNewPath: createNewPath
			// });
			// plugin.updateInternalLinks(undealData.textFile, text => {
			// 	const newPath = createNewPath({ path: text.path, subpath: text.subpath });
			// 	return `${newPath.path}${newPath.subpath}`
			// })
			// plugin.updateCanvasLinks(undealData.canvas, node => {
			// 	if (match({ path: node.file, subpath: node.subpath })) {
			// 		const newPath = createNewPath({ path: node.file, subpath: node.subpath });
			// 		return {
			// 			...node,
			// 			file: newPath.path + MarkdownFileExtension,
			// 			subpath: newPath.subpath,
			// 		}
			// 	}
			// 	return node
			// })
			// if (selfLinks) {
			// 	const linksSet = selfLinks.map(l => l.link.link);
			// 	onFilesUpdated(plugin, [sourceFile, newFile], (data) => {
			// 		const res = new Map<string, LinkInfo[]>;
			// 		data.map(d => {
			// 			const links = d.cache.links ?? [];
			// 			const embeds = d.cache.embeds ?? [];
			// 			const all = links.concat(embeds);
			// 			const linkRef = all.filter(cache => linksSet.contains(cache.link))
			// 				.map(plugin.createLinkInfo);
			// 			return {
			// 				file: d.file.path,
			// 				linkRef
			// 			}
			// 		}).forEach(d => { if (d.linkRef.length > 0) { res.set(d.file, d.linkRef); } })
			// 		plugin.updateInternalLinks(res, text => {
			// 			const newPath = createNewPath({ path: text.path, subpath: text.subpath });
			// 			return `${newPath.path}${newPath.subpath}`
			// 		})
			// 	}, 10);
			// }
		}
		//handle self link and replace text with link
		const replaceTextWithLink = () => {
			const trans = view.state.update({
				changes: extract.type !== 'mutiple'
					? { ...getSelectOffset(extract), insert: newFileLink.text }
					: extract.selections.map(line => {
						return { from: line.from, to: line.to, insert: newFileLink.text };
					})
			});
			view.dispatch(trans);
		};
		replaceTextWithLink();
	}
	else if (action.type === 'linkToReference') {
		const block = action.section.block,
			sourceFile = action.section.file;
		const name = action.newName;

		const subpath = isHeadingBlock(action.section.block)
			? {
				symbol: '#',
				path: plugin.normalizeHeadingToLinkText(name),
			}
			: {
				symbol: '#^',
				path: name,
			}

		const oldBlock = isNamedBlock(block) ? block : undefined;

		const newPath = plugin.createLinkText(sourceFile, subpath.symbol + subpath.path);
		target = newPath;

		if (oldBlock) {
			const reName = () => oldBlock.name !== name;
			if (reName()) {
				const oldName = oldBlock.name,
				from = block.cache.position.end.offset - oldName.length,
				to = block.cache.position.end.offset;
				updateInternalLinks(
					sourceFile,
					old => ({
						path: old.path,
						subpath: plugin.replaceSpaceInLinkText(newPath.subpath ?? ""),
						file: sourceFile
					}),
					link => (link.path === sourceFile.path || link.file === sourceFile)
					&& link.subpath !== undefined
						&& link.subpath === newPath.subpath
					,
					[sourceFile]
				)
				//replace old name
				const trans = view.state.update({
					changes: { from, to, insert: subpath.path }
				});
				view.dispatch(trans);
			}
		}
		else {
			//insert new block name
			const insertNamePosition = block.cache.position.end.offset;
			const trans = view.state.update({
				changes: { from: insertNamePosition, insert: ' ^' + name }
			});
			view.dispatch(trans);
		}

	}
	else {
		target = extract.content;
		const deleteText = () => {
			const trans = view.state.update({
				changes: extract.type !== 'mutiple'
					? { ...getSelectOffset(extract), }
					: extract.selections.map(line => {
						return { from: line.from, to: line.to, };
					})
			});
			view.dispatch(trans);
		};
		deleteText();
	}

	draw(target);


}
export const dragExtension = (plugin: CardNote) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		const container = plugin.app.workspace.containerEl;
		let ghost: HTMLElement;
		let dragoverBackground: HTMLElement;
		let info: UserSelection;
		let source: FileEditor | undefined | null;
		const handleDrop = async (e: DragEvent) => {
			const createFileAndDraw = async (
				locatedView: CanvasView | ExcalidrawView,
				draw: (target: string | RequiredProperties<LinkPath, 'file' | 'text'>) => void,
				updateLinksInDraw: (para: UpdateLinksInDrawPara) => Omit<UpdateLinksInDrawPara, 'getNewPath' | 'linkMatch'>
			) => {
				const section = info.type === 'line' && info.section ? info.section : getSection(source?.fileEditor?.file, info, plugin);
				const action = await userAction(plugin, section, info);
				if (!isBreak(action) && action.type !== 'cancel') {
					extractSelect(
						action,
						info,
						view,
						source,
						locatedView,
						updateLinksInDraw,
						draw,
						plugin
					);
				}
			};
			const locate = plugin.app.workspace.getDropLocation(e);
			const target = locate.children.find(child => child.tabHeaderEl.className.contains("active"));
			const drawView = target?.view;
			if (isExcalidrawView(drawView)) {
				createFileAndDraw(
					drawView,
					(target) => {
						if (typeof (target) !== 'string') {
							insertEmbeddableNoteOnDrawing(e, drawView, target.text, target.file, plugin);
						}
						else {
							createTextOnDrawing(e, drawView, target, plugin);
						}
					},
					(para) => {
						const { linkMatch, textFile, getNewPath } = para;
						if (textFile.delete(drawView.file?.path ?? "")) {
							const nodes = Array.from(drawView.embeddableLeafRefs.entries()).map(value => {
								const [id, refObject] = value;
								const getLinkInfo = (node: CanvasFileNode) => {
									return { path: node.filePath, subpath: node.subpath };
								};
								if (isObsidianMarkdownEmbeded(refObject)
									&& isCanvasFileNode(refObject.node)
									&& linkMatch(getLinkInfo(refObject.node))) {
									return { id, link: getNewPath(getLinkInfo(refObject.node)) };
								}
							}).filter(v => v !== undefined) as { id: string, link: LinkFilePath }[];
							nodes.forEach(node => {
								const element = drawView.excalidrawAPI.getSceneElements().find((e) => e.id === node.id);
								drawView.excalidrawData.elementLinks.set(node.id, node.link.text!);
								//@ts-ignore
								ExcalidrawLib.mutateElement(element, { link: node.link.text });
							}
							);
							drawView.setDirty(99);
							drawView.updateScene({ appState: { activeEmbeddable: null } });

						}
						return {
							...para,
							textFile,
						};
					});
			} else if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(e);
				createFileAndDraw(
					drawView,
					(target) => {
					if (typeof (target) !== 'string') {
					drawView.canvas.createFileNode({
						file: target.file,
						pos,
						subpath: target.subpath,
						save: true,
					});
					}
					else {
						drawView.canvas.createTextNode({
							text: target,
							pos,
							save: true,
						});
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
								});
								if (isCanvasFileNode(node) && linkMatch(path(node))) {
									const newPath = getNewPath(path(node));
									node.setFilePath(newPath.file.path, newPath.subpath ?? "");
								}
							});
							//drawView.canvas.requestSave();
							return {
								...para,
								canvas: canvas.filter(canvas => canvas !== findSelf),
							};
						}
						return para;
					}
					,);
			}
		};
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
				}));
				const content = selectLines.map(range => {
					return view.state.sliceDoc(range.from, range.to);
				}).join().trim();
				return { content, selectLines };
			};

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
					};
				}
				else {
					const selected: OneLine = {
						type: 'line',
						line,
						selection: {
							from: line.from,
							to: line.to,
						},
					};
					const section = getSection(source?.fileEditor?.file, { ...selected, content: '' }, plugin);
					console.log("line get section?", section);
					const content = section && section.type === 'reference'
						? doc.sliceString(section.block.cache.position.start.offset, section.block.cache.position.end.offset)
						: line.text;
					console.log("line content", content)
					return {
						...selected,
						content,
						section,
					};
				}
			};
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
					bg.addClass("dragbackground");
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
		};
	};
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
			});
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


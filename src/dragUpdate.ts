import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet, Line } from "@codemirror/state";
import { foldable } from "@codemirror/language";
import type { Break, LinkInfo, RequiredProperties, } from "src/utility";
import {
	ReCheck, isBreak, LineBreak as LINEBREAK, MarkdownFileExtension, throttle, BLOCKIDREPLACE, listItemParser,
	getRelativePosition,
	reverseRelative
} from "src/utility";
import type { BlockCache, CachedMetadata, CacheItem, HeadingCache, ListItemCache, MarkdownFileInfo, SectionCache, } from "obsidian";
import { TFile } from "obsidian";
import type { BaseAction, FileNameModelConfig, UserAction } from "src/ui";
import { FileNameCheckModal } from "src/ui";
import { addLink, createTextOnDrawing, insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing, isExcalidrawView } from "src/adapters/obsidian-excalidraw-plugin";
import { isCanvasEditorNode, isCanvasFileNode, isObsidianCanvasView } from "src/adapters/obsidian";
import type { CanvasFileNode, CanvasTextNode, CanvasView } from "./adapters/obsidian/types/canvas";
import type { ExcalidrawView } from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';
//import { syntaxTree } from "@codemirror/language";

type WhiteBoard = {
	located: CanvasView | ExcalidrawView,
	draw: (target: string | RequiredProperties<LinkPath, 'file' | 'text'>) => void,
	updateLinks: (para: UpdateLinksInDrawPara) => void,
}


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
export type Section = (BaseReferenceSection | LazyReferenceSection | UnReferenceSection)

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

function getSelectOffset(select: (FoldableLine | OneLine | SingleSelection) & { textOffset: number }) {
	if (select.type === 'line' && select.section?.type === 'reference') {
		const pos = select.section.block.cache.position;
		return {
			from: pos.start.offset - select.textOffset,
			to: pos.end.offset - select.textOffset,
		};
	}
	else {
		return {
			from: select.selection.from,
			to: select.selection.to,
		};
	}
}

function getLinkBlocks(select: UserSelection & { textOffset: number }, file: TFile | null | undefined, plugin: CardNote): [BlockCache[], HeadingCache[]] {
	const textOffset = select.textOffset;
	if (!file) {
		return [[], []];
	}
	else if (select.type === 'mutiple') {
		const res = select.selections.map(sel => plugin.findLinkBlocks(file, sel.from + textOffset, sel.to + textOffset));
		const blocks = res.flatMap(r => r[0]);
		const headings = res.flatMap(r => r[1]);
		return [blocks, headings];
	}
	else {
		const { from, to } = getSelectOffset(select);
		return plugin.findLinkBlocks(file, from + textOffset, to + textOffset);
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
	const provide = async (arg: ReNameConfig, unvalid: UserAction | undefined, error: string | undefined) => {
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
				plugin,
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

function getSection(source: FileEditor | undefined, selected: UserSelection, plugin: CardNote): Section {
	const sourceFile = getFile(source);
	if (sourceFile instanceof TFile && selected.type !== 'mutiple') {
		const offset = source?.offset ?? 0;
		const fileCache = plugin.app.metadataCache.getFileCache(sourceFile),
			matchStart = (block: CacheItem) => {
				const start = selected.selection.from + offset;
				return block.position.start.offset === start;
			},
			touch = (block: CacheItem) => {
				const start = selected.selection.from + offset,
					end = selected.selection.to + offset,
					blockStart = block.position.start.offset,
					blockEnd = block.position.end.offset;

				return (blockEnd > start && blockEnd <= end)
					|| (blockStart >= start && blockStart < end)
			},
			findCorrespondBlock = () => {
				const start = selected.selection.from + offset;
				const block = fileCache?.sections?.find(cache => {
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
				const listItem = fileCache?.listItems?.find(item => {
					const listStartPosition = item.position.start,
						listEndPosition = item.position.end,
						listStart = listStartPosition.offset,
						listEnd = listEndPosition.offset,
						listLineStart = listStart - listStartPosition.col,
						selectStart = selected.selection.from + offset,
						selectEnd = selected.selection.to + offset;

					return selectStart >= listLineStart
						&& (listStart >= selectStart
							&& listEnd <= selectEnd)
				});
				if (listItem) {
					return {
						type: 'list',
						cache: listItem,
						name: listItem.id
					};
				}

			},
			getHeading = (): HeadingBlcok | undefined => {
				const heading = fileCache?.headings?.find(matchStart);
				if (heading) {
					return {
						type: 'heading',
						name: heading?.heading,
						cache: heading,
					};
				}

			},
			getBlock = (): Block | undefined => {
				if (blockCache) {
					if (blockCache.type === 'list') {
						return getList()
					}
					else if (blockCache.type === 'heading') {
						return getHeading()
					}
					else {
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
			const r = {
				file: changeFile,
				data,
				cache,
			};
			res = Promise.resolve(r);
			waiting.forEach(resolve => resolve(r));
			waiting = [];
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
	fileEditor: MarkdownFileInfo | CanvasFileNode | CanvasTextNode | null | undefined,
	offset: number,
}
function getFile(ed: FileEditor | undefined | null) {
	const hasFile = (fe: MarkdownFileInfo | CanvasFileNode | CanvasTextNode): fe is MarkdownFileInfo | CanvasFileNode => {
		return 'file' in fe;
	}
	if (ed?.fileEditor && hasFile(ed.fileEditor)) {
		return ed.fileEditor.file
	}
}
async function extractSelect(
	action: Required<BaseAction>,
	extract: UserSelection & { textOffset: number },
	view: EditorView,
	activeFile: FileEditor | null | undefined,
	whiteboard: WhiteBoard,
	plugin: CardNote,
) {
	// let target: string | RequiredProperties<LinkPath, 'file' | 'text'>;
	const updateInternalLinks = async (
		sourceFile: TFile,
		createNewPath: (old: LinkPath) => LinkFilePath,
		match: (old: LinkPath) => boolean,
		updateAfterDraw: TFile[]) => {
		// const [selfLinks, outer] = plugin.findLinks(sourceFile, match);
		const linksInFiles = plugin.findLinks(sourceFile, match);
		onFilesUpdated(plugin, updateAfterDraw, async (data) => {
			const [selfLinks, _] = await linksInFiles;
			if (selfLinks) {
				const linksSet = selfLinks.map(l => l.link.link);
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
			}
		}, 10);

		const [_, outer] = await linksInFiles;
		const canvasHasMatchLinks = plugin.getCanvas((canvasPath, embed) => {
			const subpath = embed.subpath;//#^
			return match({ path: embed.file ?? '', subpath });
		});
		const whiteboardPath = whiteboard.located.file?.path,
			updateLinksInDraw = () => {
				whiteboard.updateLinks({
					getNewPath: createNewPath,
					linkMatch: match,
				})
			};
		if (outer.has(whiteboardPath ?? '')) {
			outer.delete(whiteboardPath ?? '');
			updateLinksInDraw();
		}
		else if (canvasHasMatchLinks.contains(whiteboardPath ?? '')) {
			canvasHasMatchLinks.remove(whiteboardPath ?? '');
			updateLinksInDraw()
		}

		plugin.updateInternalLinks(outer, text => {
			const newPath = createNewPath({ path: text.path, subpath: text.subpath });
			return `${newPath.path}${newPath.subpath}`;
		});
		plugin.updateCanvasLinks(canvasHasMatchLinks, node => {
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

	};
	if (action.type === 'createFile') {

		const updateConfig = () => {
			const sourceFile = getFile(activeFile);
			if (sourceFile) {
				const match = (link: LinkPath) =>
					(link.path === sourceFile.path || link.file === sourceFile)
					&& link.subpath !== undefined
					&& subpathSet.contains(link.subpath);
				const createNewPath = (oldPath: LinkPath): LinkFilePath => {
					return plugin.createLinkText(newFile, oldPath.subpath, oldPath.displayText);
				};
				//update vault internal link
				const [blocks, headings] = getLinkBlocks(extract, sourceFile, plugin);
				const subpathSet = [...blocks.map(block => `#^${block.id}`), ...headings.map(cache => `#${plugin.normalizeHeadingToLinkText(cache.heading)}`)];
				return {
					sourceFile,
					match,
					createNewPath,
					subpathSet,
				}
			}
		}

		const config = updateConfig();
		//replace editor's select line or text with link
		const filePath = action.file.fileName;
		const newFile = await plugin.app.vault.create(filePath, extract.content);
		const newFileLink = plugin.createLinkText(newFile);
		// target = newFileLink;

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
		if (config && config.subpathSet.length !== 0) {
			const { sourceFile, createNewPath, match } = config;
			await updateInternalLinks(sourceFile, createNewPath, match, [sourceFile, newFile]);
		}
		whiteboard.draw(newFileLink);

	}
	else if (action.type === 'linkToReference') {
		const block = action.section.block,
			sourceFile = action.section.file;
		const name = action.newName;

		const subpath = isHeadingBlock(block)
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
		// target = newPath;

		if (oldBlock) {
			const reName = () => oldBlock.name !== name;
			if (reName()) {
				const oldName = oldBlock.name,
					oldPath = isHeadingBlock(oldBlock)
						? '#' + plugin.normalizeHeadingToLinkText(oldName)
						: '#^' + oldName,
					from = block.cache.position.end.offset - extract.textOffset - oldName.length,
					to = block.cache.position.end.offset - extract.textOffset;
				//replace old name
				const trans = view.state.update({
					changes: { from, to, insert: subpath.path }
				});
				view.dispatch(trans);
				await updateInternalLinks(
					sourceFile,
					old => newPath,
					link => (link.path === sourceFile.path || link.file === sourceFile)
						&& link.subpath !== undefined
						&& link.subpath === oldPath
					,
					[sourceFile]
				)
			}
		}
		else {
			//insert new block name
			const insertNamePosition = block.cache.position.end.offset - extract.textOffset;
			const trans = view.state.update({
				changes: { from: insertNamePosition, insert: ' ^' + name }
			});
			view.dispatch(trans);
		}
		whiteboard.draw(newPath);
	}
	else {
		// target = extract.content;
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
		whiteboard.draw(extract.content);
	}
}
export const dragExtension = (plugin: CardNote) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		let info: UserSelection;
		let source: FileEditor | undefined;
		let listener: { reset: () => void };
		const handleDrop = async (e: DragEvent) => {
			const createFileAndDraw = async (
				whiteboard: WhiteBoard,
			) => {
				const section = info.type === 'line' && info.section ? info.section : getSection(source, info, plugin);
				const action = await userAction(plugin, section, info);
				if (!isBreak(action) && action.type !== 'cancel') {
					extractSelect(
						action,
						{ ...info, textOffset: source?.offset ?? 0 },
						view,
						source,
						whiteboard,
						plugin,
					);
				}
			};
			const drawView = plugin.getDropView(e);
			if (isExcalidrawView(drawView)) {
				createFileAndDraw(
					{
						located: drawView,
						draw: async (target) => {
							const createNode = typeof (target) === 'string'
								? createTextOnDrawing(e, drawView, target, plugin)
								: insertEmbeddableNoteOnDrawing(e, drawView, target.text, target.file, plugin);
							if (plugin.settings.autoLink && isCanvasEditorNode(source?.fileEditor)) {
								const createNodeId = await createNode;
								if (createNodeId) {
									addLink(source.fileEditor.id, createNodeId, drawView, plugin)
								}
							}
						},
						updateLinks: (para) => {
							const { linkMatch, getNewPath } = para;
							const nodes = Array.from(drawView.canvasNodeFactory.nodes.entries()).map(value => {
								const [id, refNode] = value;
								const getLinkInfo = (node: CanvasFileNode) => {
									return { path: node.filePath, subpath: node.subpath };
								};
								if (isCanvasFileNode(refNode)
									&& linkMatch(getLinkInfo(refNode))) {
									return { id, link: getNewPath(getLinkInfo(refNode)) };
								}
							}).filter(v => v !== undefined) as { id: string, link: LinkFilePath }[];
							nodes.forEach(node => {
								const elements = drawView.excalidrawAPI.getSceneElements().filter((e) => e.id === node.id);
								elements.forEach(elem => {
									drawView.excalidrawData.elementLinks.set(node.id, node.link.text!);
									//@ts-ignore
									ExcalidrawLib.mutateElement(elem, { link: node.link.text });
								})
							}
							);
							drawView.setDirty(99);
							drawView.updateScene({});
						}
					});
			} else if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(e);
				createFileAndDraw({
					located: drawView,
					draw: (target) => {
						const dropCanvas = drawView.canvas;
						const createNode = typeof (target) === 'string' ? dropCanvas.createTextNode({
							text: target,
							pos,
							save: true,
						}) : dropCanvas.createFileNode({
							file: target.file,
							pos,
							subpath: target.subpath,
							save: true,
						});
						if (plugin.settings.autoLink && isCanvasEditorNode(source?.fileEditor)) {
							const fromSide = getRelativePosition(source.fileEditor, createNode);
							if (fromSide && reverseRelative.has(fromSide)) {
								const toSide = reverseRelative.get(fromSide);
								const edgeID = plugin.createRandomHexString(16);
								const data = dropCanvas.getData()
								dropCanvas.importData({
									nodes: data.nodes,
									edges: [...data.edges, {
										id: edgeID,
										fromNode: source.fileEditor.id,
										fromSide,
										toNode: createNode.id,
										toSide: toSide!
									}]
								});
							}
						}
						dropCanvas.requestFrame()
					},
					updateLinks: (para) => {
						const { linkMatch, getNewPath } = para;
						drawView.canvas.nodes.forEach((node, id) => {
							const path = (node: CanvasFileNode): LinkPath => ({
								path: node.filePath,
								file: node.file,
								subpath: node.subpath
							});
							if (isCanvasFileNode(node) && linkMatch(path(node))) {
								const newPath = getNewPath(path(node));
								node.setFilePath(newPath.file.path, newPath.subpath ?? "");
								//node.canvas.requestSave();
							}
						});
						drawView.canvas.requestSave();
					}
				});
			}
		};
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
					const referenceTextOffset = source?.offset ?? 0;
					const section = getSection(source, { ...selected, content: '' }, plugin);
					const content = section && section.type === 'reference'
						? doc.sliceString(
							section.block.cache.position.start.offset - referenceTextOffset,
							section.block.cache.position.end.offset - referenceTextOffset)
						: line.text;

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
				listener = plugin.listenDragAndDrop(e, info.content, handleDrop);
			});

		});


		return {
			reset: () => listener?.reset(),
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
					return v.state.doc.length !== 0 ? range_set : RangeSet.empty;
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


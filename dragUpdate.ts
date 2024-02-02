import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet, Line } from "@codemirror/state";
import { foldable } from "@codemirror/language"
import { Break, ReCheck, createDefaultFileName, createFullPath, FileInfo, isBreak, markdownParser, LineBreak as LINEBREAK, MarkdownFileExtension, throttle } from "utility";
import { CacheItem, HeadingCache, ListItemCache, MarkdownRenderer, SectionCache, TFile } from "obsidian";
import { CreateFile, FileNameCheckModal, FileNameModelConfig, LinkToReference, UserAction } from "src/ui";
import { insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing, isExcalidrawView } from "src/adapters/obsidian-excalidraw-plugin";
import { isObsidianCanvasView } from "src/adapters/obsidian";


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
	subPath: string,
}
type Action = (CreatNewFile | LinkToFile) & {
	newName: Promise<string>
};
function isReferenceBlock(block: Block): block is BaseReferenceBlock {
	return 'type' in block
		&& (block.type === 'heading'
			|| block.type === 'list'
			|| block.type === 'linkBlock')

}

function getLine(line: FoldableLine | OneLine) {
	return line.type === 'foldable' ? line.startLine : line.line;
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
		if (isReferenceBlock(block)) {
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
			return getUserRename({ ...arg, name });
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

export const dragExtension = (plugin: CardNote) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		const container = plugin.app.workspace.containerEl;
		let ghost: HTMLElement;
		let dragoverBackground: HTMLElement;
		let info: UserSelection;
		let sourceFile: TFile | undefined | null;
		const handleDrop = async (e: DragEvent) => {
			const createFileAndDraw = async (draw: (action: Action, link: string) => void) => {
				// const findReferenceBlock = () => {
				// 	const sections = fileCache?.sections?.filter(sec => {
				// 		return info.type !== 'mutiple'
				// 			? selected(info.selection, sec)
				// 			: info.selections.find(sel => selected(sel, sec))
				// 	})
				// 	console.log("file cache", fileCache);
				// 	console.log("sections", sections);
				// }
				// 	// if (block?.type === 'list') {
				// 	// 	new RegExp(`(?<list>[-*]\\s|(?:\\d.)+\\s)(?<text>.*)`);
				// 	// 	block.type
				// 	// 	return fileCache?.listItems?.find(item => match(item))
				// 	// }
				// 	// else {
				// 	// 	return block
				// 	// }
				// 	// else if (block?.position.start.offset === start) {
				// 	// 	return block
				// 	// } else {
				// 	// 	return undefined
				// 	// }
				// }

				const section = info.type === 'line' ? info.section! : getSection(sourceFile, info, plugin);
				const action = await userAction(plugin, section, info);
				if (!isBreak(action)) {
					if (action.type === 'createFile') {
					//replace editor's select line or text with link
						const filePath = createFullPath(action.file);
						const file = await plugin.app.vault.create(filePath, info.content);
						const fileLink = plugin.createLink(file);
						const replaceTextWithLink = () => {
							const trans = view.state.update({
								changes: info.type !== 'mutiple'
									? info.type === 'line' && info.section && info.section.type === 'reference'
										? {
											from: info.section.block.cache.position.start.offset,
											to: info.section.block.cache.position.end.offset,
											insert: fileLink,
										} : {
											from: info.selection.from,
											to: info.selection.to,
											insert: fileLink,
										}
									: info.selections.map(line => {
										return { from: line.from, to: line.to, insert: fileLink }
									})
							})
							view.dispatch(trans);
						};
						replaceTextWithLink();
						draw({ ...action, newFile: file }, fileLink);
					}
					if (action.type === 'linkToReference') {
						// const subpath = action.section.type === 'reference'
						// 	?
						// 	: undefined;
						const name = await action.newName;
						const subpathPrevSymbol = isReferenceBlock(action.section.block)
							&& action.section.block.type === 'heading' ? '#' : '#^';

						draw({
							...action,
							subPath: subpathPrevSymbol + name,
							sourceFile: sourceFile!
						}, '');
					}
				}

			};
			const locate = plugin.app.workspace.getDropLocation(e);
			const target = locate.children.find(child => child.tabHeaderEl.className.contains("active"));
			const drawView = target?.view;
			if (isExcalidrawView(drawView)) {
				createFileAndDraw((action, fileLink) => {
					if (action.type === 'createFile') {
						insertEmbeddableNoteOnDrawing(e, drawView, fileLink, action.newFile, plugin);
					}
				});
			} else if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(e);
				createFileAndDraw((action, fileLink) => {
					const file = action.type === 'createFile' ? action.newFile : action.sourceFile;
					const subpath = action.type === 'linkToReference' ? action.subPath : undefined;
					drawView.canvas.createFileNode({
						file: file,
						pos,
						subpath,
						save: true
					});
				})
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
			sourceFile = plugin.getActiveEditorFile();
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
					const section = getSection(sourceFile, { ...selected, content: '' }, plugin);
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


import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { foldable } from "@codemirror/language"
import { Break, checkFileName, createDefaultFileName, createFullPath, FileInfo, isBreak, markdownParser, LineBreak as LINEBREAK, MarkdownFileExtension, throttle } from "utility";
import { MarkdownRenderer, TFile } from "obsidian";
import { FileNameCheckModal } from "src/ui";
import { insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing, isExcalidrawView } from "src/adapters/obsidian-excalidraw-plugin";
import { isObsidianCanvasView } from "src/adapters/obsidian";

type Selection = {
	from: number,
	to: number,
}
type ExtractInfo = {
	title?: string,
	content: string,
	lines: Selection[]
};

async function uerRename(plugin: CardNote, defaultFile: FileInfo) {
	const folderPath = plugin.settings.defaultFolder;
	const getUserRename = (defaultValue?: string, errorMessage?: string) => {
		return new Promise<FileInfo | Break>(resolve => {
			new FileNameCheckModal(plugin.app, value => {
				resolve(isBreak(value)
					? value
					: {
						folderPath,
						fileName: value,
						extension: MarkdownFileExtension,
					});
			}, defaultValue, errorMessage)
				.open();
		})
	}
	const userCheckPath = await checkFileName(plugin, {
		create() {
			return defaultFile.fileName;
		},
		update(prev) {
			return prev;
		},
		provide(arg, file, error) {
			return getUserRename(arg, error);
		}
	})
	return userCheckPath;
}
function moveElement(elm: HTMLElement, x: number, y: number) {
	elm.style.transform = `translate(${x}px,${y}px)`;
}
function getPosition(e: DragEvent) {
	return { x: e.clientX, y: e.clientY };
}

export const dragExtension = (plugin: CardNote) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		const container = plugin.app.workspace.containerEl;
		let ghost: HTMLElement;
		let dragoverBackground: HTMLElement;
		let info: ExtractInfo;

		const handleDrop = async (e: DragEvent) => {
			const createFileAndDraw = async (draw: (file: TFile, link: string) => void) => {
				const pluginApp = plugin.app;
				const title = info.title ?? info.content.split(LINEBREAK, 1)[0].substring(0, 20).trim();
				const defaultFile: FileInfo = title.length !== 0
					? {
						fileName: title,
						folderPath: plugin.settings.defaultFolder,
						extension: MarkdownFileExtension,
					}
					: await createDefaultFileName(plugin, info.content);
				const userCheckPath = await uerRename(plugin, defaultFile);
				if (!isBreak(userCheckPath)) {
					//replace editor's select line or text with link
					const filePath = createFullPath(userCheckPath);
					const file = await pluginApp.vault.create(filePath, info.content);
					const fileLink = `[[${pluginApp.metadataCache.fileToLinktext(
						file,
						file.path,
						file.extension === "md",
					)}]]`;
					const replaceTextWithLink = () => {
						const trans = view.state.update({
							changes: info.lines.map(line => {
								return { from: line.from, to: line.to, insert: fileLink }
							})
						})
						view.dispatch(trans);
					};
					replaceTextWithLink();
					draw(file, fileLink);
				}
			}
			const locate = plugin.app.workspace.getDropLocation(e);
			const target = locate.children.find(child => child.tabHeaderEl.className.contains("active"));
			const drawView = target?.view;
			if (isExcalidrawView(drawView)) {
				createFileAndDraw((file, fileLink) => {
					insertEmbeddableNoteOnDrawing(e, drawView, fileLink, file, plugin);
				});
			} else if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(e);
				createFileAndDraw((file, fileLink) => {
					drawView.canvas.createFileNode({ file, pos });
				})
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
			const getSelection = (): ExtractInfo => {
				const selectLines = view.state.selection.ranges.map(range => ({
					from: range.from,
					to: range.to,
				}))
				const select = selectLines.map(range => {
					return view.state.sliceDoc(range.from, range.to);
				}).join().trim();
				return { content: select, lines: selectLines }
			}

			const getLineString = (): ExtractInfo => {
				const statefield = view.state.field(dragSymbolSet);
				const start = statefield.iter().from;
				const doc = view.state.doc;
				const line = view.state.doc.lineAt(start);
				const foldableRange = foldable(view.state, line.from, line.to);
				const allRange: ExtractInfo = foldableRange
					? {
						content: doc.sliceString(line.from, foldableRange.to),
						lines: [{
							from: line.from,
							to: foldableRange.to
						}]
					}
					: {
						content: line.text,
						lines: [{ from: line.from, to: line.to }]
					}
				const extract = markdownParser(line.text);
				return extract.type === 'text' ? allRange : { title: extract.title, ...allRange };
			}
			const defaultSelect = getSelection();
			info = defaultSelect.content.length !== 0 ? defaultSelect : getLineString();

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
			symbol.style.fontSize = "18px";

			const { reset } = addDragStartEvent(dragSymbol, view);

			dragSymbol.addEventListener("dragend", (e) => {
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


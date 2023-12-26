import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { Break, checkFileName, createDefaultFileName, isBreak, MarkdownFileExtension, throttle } from "utility";
import { MarkdownRenderer, TFile } from "obsidian";
import { FileNameCheckModal } from "src/ui";
import { insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing } from "src/adapters/obsidian-excalidraw-plugin";


type Selection = {
	from: number,
	to: number,
}

async function getUerRename(plugin: CardNote, defaultFilePath: string) {
	const getUserRename = (defaultValue?: string) => {
		return new Promise<string | Break>(resolve => {
			new FileNameCheckModal(plugin.app, value => {
				resolve(value);
			}, defaultValue)
				.open();
		})
	}
	const userCheckPath = await checkFileName(plugin, {
		create() {
			return defaultFilePath as string;
		},
		update(prev) {
			return prev;
		},
		provide(arg, file) {
			return getUserRename(arg)
		}
	})
	return userCheckPath;
}
function moveElement(elm: HTMLElement, x: number, y: number) {
	elm.style.transform = `translate(${x}px,${y}px)`;
}
export const dragExtension = (plugin: CardNote) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		const container = plugin.app.workspace.containerEl;
		let needToAddLinkFlag = false;
		let ghost: HTMLElement;
		let info: { content: string, lines: Selection[] };
		let drawMethod: (fileLink: string, file: TFile, plugin: CardNote) => void;
		const handleDrop = (e: DragEvent) => {
			if (e.target instanceof HTMLCanvasElement) {
				needToAddLinkFlag = true;
				drawMethod = insertEmbeddableNoteOnDrawing;
			} else {
				needToAddLinkFlag = false;
			}
		};
		const handleDragOver = (e: DragEvent) => {
			if (ghost) {
				moveElement(ghost, e.clientX, e.clientY);
			}
			e.preventDefault();
		};

		dragSymbol.addEventListener("dragstart", (e) => {
			const getSelection = (): { content: string, lines: Selection[] } => {
				const selectLines = view.state.selection.ranges.map(range => ({
					from: range.from,
					to: range.to,
				}))
				const select = selectLines.map(range => {
					return view.state.sliceDoc(range.from, range.to);
				}).join().trim();
				return { content: select, lines: selectLines }
			}

			const getLineString = () => {
				const statefield = view.state.field(dragSymbolSet);
				const start = statefield.iter().from;
				const lineBlock = view.lineBlockAt(start);
				const lineString = view.state.sliceDoc(lineBlock.from, lineBlock.to)
				return { content: lineString, lines: [{ from: start, to: lineBlock.to }] }
			}
			const defaultSelect = getSelection();
			info = defaultSelect.content.length !== 0 ? defaultSelect : getLineString();
			if (!ghost) {
				const div = document.createElement("div");
				//set position to absolute and append it to body to show custom element when dragging
				div.style.position = "absolute";
				div.setCssStyles({
					padding: "5px 25px",
					borderStyle: "solid",
					borderWidth: "3px",
					borderRadius: "10px",
					width: "300px",
					minHeight: "200px",
				})
				moveElement(div, 1000, -1000);
				ghost = container.appendChild(div);
			}
			else {
				ghost = container.appendChild(ghost);
			}
			MarkdownRenderer.render(
				plugin.app,
				info.content,
				ghost,
				"",
				plugin);
			plugin.registerDomEvent(container, "drop", handleDrop);
			plugin.registerDomEvent(container, "dragover", handleDragOver);
			(e.dataTransfer as any).effectAllowed = "all";
			// e.dataTransfer?.setDragImage(
			// 	ghost,
			// 	0,
			// 	0
			// );
		});

		const reset = () => {
			container.removeEventListener("drop", handleDrop);
			container.removeEventListener("dragover", handleDragOver);
			container.removeChild(ghost);
			ghost.replaceChildren();
			const flagRest = () => {
				needToAddLinkFlag = false;
			};
			return needToAddLinkFlag
				? { flagRest }
				: needToAddLinkFlag;
		};

		return {
			reset,
			getInfo: () => info,
			insertLinkOnDrawing: (fileLink: string, file: TFile, plugin: CardNote) => drawMethod?.(fileLink, file, plugin),
		}
	}
	const dragMarker = new (class extends GutterMarker {
		destroy(dom: Node): void {
		}
		toDOM(view: EditorView) {
			const dragSymbol = document.createElement("div");
			dragSymbol.draggable = true;
			const symbol = dragSymbol.createSpan();
			symbol.innerText = "💔";
			symbol.style.fontSize = "18px";

			const { reset, getInfo, insertLinkOnDrawing } = addDragStartEvent(dragSymbol, view);
			dragSymbol.addEventListener("dragend", async (e) => {
				const dropOnCanvas = reset();
				if (dropOnCanvas) {
					dropOnCanvas.flagRest();
					const pluginApp = plugin.app;
					const info = getInfo();
					const filePath = await createDefaultFileName(plugin, info.content);
					const userCheckPath = await getUerRename(plugin, filePath as string);
					if (!isBreak(userCheckPath)) {
						//replace editor's select line or text with link
						const file = await pluginApp.vault.create(userCheckPath + MarkdownFileExtension, info.content)
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
						insertLinkOnDrawing(fileLink, file, plugin);

					}
				}
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


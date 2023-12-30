import CardNote from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { Break, checkFileName, createDefaultFileName, createFullPath, FileInfo, isBreak, MarkdownFileExtension, throttle } from "utility";
import { MarkdownRenderer, TFile } from "obsidian";
import { FileNameCheckModal } from "src/ui";
import { insertEmbeddableOnDrawing as insertEmbeddableNoteOnDrawing, isExcalidrawView } from "src/adapters/obsidian-excalidraw-plugin";
import { isObsidianCanvasView } from "src/adapters/obsidian";
//import { CanvasNodeData } from "obsidian/canvas"



type Selection = {
	from: number,
	to: number,
}

async function getUerRename(plugin: CardNote, defaultFile: FileInfo) {
	const folderPath = plugin.settings.defaultFolder;
	const getUserRename = (defaultValue?: string) => {
		return new Promise<FileInfo | Break>(resolve => {
			new FileNameCheckModal(plugin.app, value => {
				resolve(isBreak(value)
					? value
					: {
						folderPath,
						fileName: value,
						extension: MarkdownFileExtension,
					});
			}, defaultValue)
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
		const handleDrop = async (e: DragEvent) => {
			const createFileAndDraw = async (draw: (file: TFile, link: string) => void) => {
				const pluginApp = plugin.app;
				const defaultFile = await createDefaultFileName(plugin, info.content);
				const userCheckPath = await getUerRename(plugin, defaultFile);
				if (!isBreak(userCheckPath)) {
					//replace editor's select line or text with link
					const filePath = createFullPath(userCheckPath);
					console.log(filePath);
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
			console.log("locate", locate);
			console.log("target", target);
			console.log("canvas view", drawView);
			if (isExcalidrawView(drawView)) {
				//needToAddLinkFlag = true;
				createFileAndDraw((file, fileLink) => {
					insertEmbeddableNoteOnDrawing(drawView, fileLink, file, plugin);
				});
				//drawMethod = (fileLink, file, plugin) => insertEmbeddableNoteOnDrawing(drawView, fileLink, file, plugin,);
			} else if (isObsidianCanvasView(drawView)) {
				//needToAddLinkFlag = true;
				const pos = drawView.canvas.posFromEvt(e);
				console.log("position", pos);
				createFileAndDraw((file, fileLink) => {
					drawView.canvas.createFileNode({ file, pos });
				})
				// drawMethod = (fileLink, file, plugin) => {
				// 	const returnValue = drawView.canvas.createFileNode({ file, pos });
				// 	console.log("draw on obsidian canvas", returnValue);
				// }
			}
			else {
				needToAddLinkFlag = false;
				//obsidian canvas is div wrap
				//console.log("not in canvase", e.target);
			}
		};
		const displayContentWhenDragging = (e: DragEvent) => {
			if (ghost) {
				moveElement(ghost, e.clientX, e.clientY);
			}
			e.preventDefault();
		};

		dragSymbol.addEventListener("drag", displayContentWhenDragging);
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

			//Drag table will cause dragend event would be triggerd immediately at dragstart
			//https://stackoverflow.com/questions/19639969/html5-dragend-event-firing-immediately
			setTimeout(() => {
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
					moveElement(div, e.clientX, e.clientY);
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
			});

			plugin.registerDomEvent(container, "drop", handleDrop);
			//plugin.registerDomEvent(container, "dragover", handleDragOver);
			//(e.dataTransfer as any).effectAllowed = "all";
			//e.dataTransfer?.setDragImage(
			// 	ghost,
			// 	0,
			// 	0
			// );
		});

		const reset = () => {
			container.removeEventListener("drop", handleDrop);
			//container.removeEventListener("dragover", handleDragOver);
			container.removeChild(ghost);
			ghost.replaceChildren();
			// const flagRest = () => {
			// 	needToAddLinkFlag = false;
			// };
			// return needToAddLinkFlag
			// 	? { flagRest }
			// 	: needToAddLinkFlag;
		};

		return {
			reset,
			// getInfo: () => info,
			// insertLinkOnDrawing: (fileLink: string, file: TFile, plugin: CardNote) => drawMethod?.(fileLink, file, plugin),
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
			dragSymbol.addEventListener("dragend", async (e) => {
				reset();
				//const dropOnCanvas = 
				// if (dropOnCanvas) {
				// 	dropOnCanvas.flagRest();
				// 	const pluginApp = plugin.app;
				// 	const info = getInfo();
				// 	const defaultFile = await createDefaultFileName(plugin, info.content);
				// 	const userCheckPath = await getUerRename(plugin, defaultFile);
				// 	if (!isBreak(userCheckPath)) {
				// 		//replace editor's select line or text with link
				// 		const filePath = createFullPath(userCheckPath);
				// 		console.log(filePath);
				// 		pluginApp.vault.createFolder
				// 		const file = await pluginApp.vault.create(filePath, info.content);
				// 		const fileLink = `[[${pluginApp.metadataCache.fileToLinktext(
				// 			file,
				// 			file.path,
				// 			file.extension === "md",
				// 		)}]]`;
				// 		const replaceTextWithLink = () => {
				// 			const trans = view.state.update({
				// 				changes: info.lines.map(line => {
				// 					return { from: line.from, to: line.to, insert: fileLink }
				// 				})
				// 			})
				// 			view.dispatch(trans);
				// 		};
				// 		replaceTextWithLink();
				// 		insertLinkOnDrawing(fileLink, file, plugin);

				// 	}
				// }
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


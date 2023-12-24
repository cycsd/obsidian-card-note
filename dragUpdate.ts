import MyPlugin from "main";
import { EditorView, gutter, GutterMarker, Decoration, DecorationSet, WidgetType, ViewPlugin, ViewUpdate, Rect } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { throttle } from "utility";
import { syntaxTree } from "@codemirror/language"
import * as CodeMirror from "codemirror";
import { TFile, TFolder, ViewState, normalizePath } from "obsidian";
import { stat } from "fs";
import { FileNameCheckModal } from "src/ui";
import { resolve } from "path";
import { getEA, getEALib } from "src/adapters/obsidian-excalidraw-plugin";
import { ExcalidrawLib } from "obsidian-excalidraw-plugin/lib/typings/ExcalidrawLib";
//import { viewportCoordsToSceneCoords } from "src/adapters/obsidian-excalidraw-plugin/types/ExcalidrawLib";


//import { ExcalidrawLib, EmbeddedLink } from "obsidian-excalidraw-plugin/lib/typings/ExcalidrawLib";






// type BlockInfo = ReturnType<EditorView["lineBlockAt"]>;
// const addUnderline = StateEffect.define<{ from: number, to: number }>({
// 	map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) })
// })

// const underlineField = StateField.define<DecorationSet>({
// 	create() {
// 		return Decoration.none
// 	},
// 	update(underlines, tr) {
// 		underlines = underlines.map(tr.changes)
// 		for (const e of tr.effects) if (e.is(addUnderline)) {
// 			underlines = underlines.update({
// 				add: [underlineMark.range(e.value.from, e.value.to)]
// 			})
// 		}
// 		return underlines
// 	},
// 	provide: f => EditorView.decorations.from(f)
// })

// const underlineMark = Decoration.mark({ class: "cm-underline" })

// class CheckboxWidget extends WidgetType {
// 	constructor(readonly checked: boolean) { super() }

// 	eq(other: CheckboxWidget) { return other.checked == this.checked }

// 	toDOM(view: EditorView) {
// 		const wrap = document.createElement("span")
// 		wrap.setAttribute("aria-hidden", "true")
// 		wrap.className = "cm-boolean-toggle"
// 		const box = wrap.appendChild(document.createElement("input"))
// 		box.type = "checkbox"
// 		box.checked = this.checked
// 		return wrap
// 	}

// 	ignoreEvent() { return false }
// }

// function checkboxes(view: EditorView) {
// 	const widgets: ReturnType<Decoration["range"]>[] = [];
// 	for (const { from, to } of view.visibleRanges) {
// 		syntaxTree(view.state).iterate({
// 			from, to,
// 			enter: (node) => {
// 				console.log("from: ", node.from, "to: ", node.to, "name:", node.name);
// 				if (node.name == "Document") {
// 					console.log("from: ", node.from, "to: ", node.to, "node", node);

// 				}
// 				if (node.name == "BooleanLiteral") {
// 					const isTrue = view.state.doc.sliceString(node.from, node.to) == "true"
// 					const deco = Decoration.widget({
// 						widget: new CheckboxWidget(isTrue),
// 						side: 1
// 					})
// 					widgets.push(deco.range(node.to))
// 				}
// 			}
// 		})
// 	}
// 	return Decoration.set(widgets)
// }

// const checkboxPlugin = ViewPlugin.fromClass(class {
// 	decorations: DecorationSet

// 	constructor(view: EditorView) {
// 		this.decorations = checkboxes(view)
// 	}

// 	update(update: ViewUpdate) {
// 		if (update.docChanged || update.viewportChanged)
// 			this.decorations = checkboxes(update.view)
// 	}
// }, {
// 	decorations: v => v.decorations,

// 	eventHandlers: {
// 		mousedown: (e, view) => {
// 			const target = e.target as HTMLElement
// 			if (target.nodeName == "INPUT" &&
// 				target.parentElement!.classList.contains("cm-boolean-toggle"))
// 				return toggleBoolean(view, view.posAtDOM(target))
// 		}
// 	}
// })
// function toggleBoolean(view: EditorView, pos: number) {
// 	const before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
// 	let change
// 	if (before == "false")
// 		change = { from: pos - 5, to: pos, insert: "true" }
// 	else if (before.endsWith("true"))
// 		change = { from: pos - 4, to: pos, insert: "false" }
// 	else
// 		return false
// 	view.dispatch({ changes: change })
// 	return true
// }

type NameFile<T> = {
	create: () => T,
	update: (prev: T) => T,
	provide: (arg: T, unapprove: TFile | TFolder | undefined) => Promise<string | undefined>,
}

type Selection = {
	from: number,
	to: number,
}
const LineBreak = "\n";
const MarkdownFileExtension = ".md";
async function checkFileName<T>(plugin: MyPlugin, config: NameFile<T>) {
	let state = config.create();
	let folder;
	while (true) {
		const fileUncheck = await config.provide(state, folder);
		if (fileUncheck === undefined) {
			console.log("no file?", fileUncheck);
			return fileUncheck;
		}
		const normalFilePath = normalizePath(fileUncheck);
		try {
			console.log("normalFilePath: ", normalFilePath)
			if (fileUncheck === "" || await plugin.app.vault.adapter.exists(fileUncheck + MarkdownFileExtension)) {
				throw new Error("File Exist!");
			}
			plugin.app.vault.checkPath(normalFilePath)
			return normalFilePath;

		} catch (error) {
			state = config.update(state);
			console.log(error.message);
			continue;
			//@ts-ignore
			// folder = plugin.app.vault.getAbstractFileByPathInsensitive(normalFilePath);
			// plugin.app.vault.adapter.exists(fileUncheck)
			// if (folder && (folder instanceof TFolder || folder instanceof TFile)) {
			// 	state = config.update(state);
			// 	continue;
			// }
			// return folder;
		}

	}
}
async function createDefaultFileName(plugin: MyPlugin, content: string) {
	const filePath = content.split(LineBreak, 1)[0];
	const createRandomFileName = () => {
		return checkFileName(plugin, {
			create: () => {
				return { name: "NewNote", count: 0 };
			},
			update: (prev) => ({ name: prev.name, count: prev.count + 1 }),
			provide: (arg) => Promise.resolve(arg.name + arg.count),
		})
	}
	return filePath.length !== 0
		? filePath
		: await createRandomFileName();
}
// new WarningPrompt(
// 	app,
// 	"⚠ ExcaliBrain Disabled: Excalidraw Plugin not found",
// 	t("EXCALIDRAW_NOT_FOUND")
// ).show(async (result: boolean) => {
// 	new Notice("Disabling ExcaliBrain Plugin", 8000);
// 	errorlog({
// 		fn: this.onload,
// 		where: "main.ts/onload()",
// 		message: "Excalidraw not found",
// 	});
// 	this.app.plugins.disablePlugin(PLUGIN_NAME);
// });

export const dragExtension = (plugin: MyPlugin) => {
	const addDragStartEvent = (dragSymbol: HTMLElement, view: EditorView) => {
		let needToAddLinkFlag = false;
		const handleDrop = (e: DragEvent) => {
			try {
				if (e.target instanceof HTMLCanvasElement) {
					console.log("detect canvas", e.target);
					needToAddLinkFlag = true;
				} else {
					console.log("detect other", e.target);
					needToAddLinkFlag = false;
				}
			} catch (error) {
				console.log("not find ea");
			}
		};
		let ghost: HTMLElement;
		let info: { content: string, lines: Selection[] };
		const reset = () => {
			document.removeEventListener("drop", handleDrop);
			document.body.removeChild(ghost);
			const flagRest = () => {
				needToAddLinkFlag = false;
			};
			return needToAddLinkFlag
				? { flagRest }
				: needToAddLinkFlag;
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
			//console.log("from: ", start, "line block: ", lineBlock)
			const defaultSelect = getSelection();
			info = defaultSelect.content.length !== 0 ? defaultSelect : getLineString();
			if (!ghost) {
				const div = document.createElement("div");
				//set position to absolute and append it to body to show custom element when dragging
				div.style.position = "absolute";
				//use translate to hide element outside of screen.
				div.style.transform = "translate(-10000px, -10000px)";
				ghost = document.body.appendChild(div);
				//plugin.app.workspace.containerEl.appendChild(this.ghost);
			}
			else {
				ghost = document.body.appendChild(ghost);
			}
			ghost.innerText = info.content;
			//console.log("widget to Dom can access view", view);
			document.addEventListener("drop", handleDrop);
			//const active = document.querySelector(".cm-active");

			// console.log("select: ", active);
			console.log("create ghost: ", ghost);
			// console.log("select", se);
			// console.log("select text", selection);
			// console.log("state field", statefield);
			(e.dataTransfer as any).effectAllowed = "all";
			e.dataTransfer?.setDragImage(
				ghost,
				0,
				0
			);
		});

		return { reset, getInfo: () => info }
	}
	const dragMarker = new (class extends GutterMarker {
		clickHandler(e: MouseEvent) {
			//console.log("workspace", plugin.app.workspace);
			let leaf_count = 0;
			plugin.app.workspace.iterateCodeMirrors(editor => {

				console.log("editor", editor);
				leaf_count += 1;
			}
			)
			console.log("code mirror count", leaf_count);
			console.log(
				"show active editor",
				plugin.app.workspace.activeEditor
			);
		}

		destroy(dom: Node): void {
			document.removeEventListener("click", this.clickHandler);
		}
		//dragSymbol: HTMLElement;
		toDOM(view: EditorView) {
			const dragSymbol = document.createElement("div");
			dragSymbol.draggable = true;
			const symbol = dragSymbol.createSpan();
			symbol.innerText = "💔";
			symbol.style.fontSize = "18px";
			//div.style.fontSize = "3vh";
			// div.style.width = "10vw";
			// div.style.height = "10vh";

			//dragSymbol.addEventListener("click", this.clickHandler);
			// if I want to replace line
			// I need to know line.from line.to
			// support mutilple selection [{line.from, line.to}]
			//replace file name and view....but do it in dragend
			const { reset, getInfo } = addDragStartEvent(dragSymbol, view);
			dragSymbol.addEventListener("dragend", async (e) => {
				const needToAddLink = reset();
				if (needToAddLink) {
					needToAddLink.flagRest();
					const pluginApp = plugin.app;
					const info = getInfo();
					const filePath = await createDefaultFileName(plugin, info.content);
					const getUserReName = (defaultValue?: string) => {
						return new Promise<string | undefined>(resolve => {
							new FileNameCheckModal(pluginApp, value => {
								resolve(value);
							}, defaultValue)
								.open();
						})
					}
					const userCheckPath = await checkFileName(plugin, {
						create() {
							return filePath;
						},
						update(prev) {
							return undefined;
						},
						provide(arg, file) {
							return getUserReName(arg)
						}
					})
					if (userCheckPath) {
						//replace editor's select line or text with link
						const file = await pluginApp.vault.create(userCheckPath + MarkdownFileExtension, info.content)
						const fileLink = `[[${pluginApp.metadataCache.fileToLinktext(
							file,
							file.path,//eaView.file.path,
							file.extension === "md",
						)}]]`;
						const trans = view.state.update({
							changes: info.lines.map(line => {
								return { from: line.from, to: line.to, insert: fileLink }
							})
						})
						view.dispatch(trans);
						console.log("finish dispatch? transaction is", trans, "link is", fileLink);
						const ea = getEA();

						//const eb = ExcalidrawLib;
						const eaView = ea.setView();
						const api = ea.getExcalidrawAPI();
						const appState = api.getAppState();
						const { width, height, offsetLeft, offsetTop } = appState;
						console.log("getViewState", appState);

						const position = getEALib().viewportCoordsToSceneCoords({
							clientX: width / 2 + offsetLeft,
							clientY: height / 2 + offsetTop,
						}, appState);
						console.log("can get EA?", ea);
						//console.log("can get EB?", eb);
						console.log("can get view?", eaView);
						console.log("can get position?", position);
						console.log("add embeddabel", ea.addEmbeddable);
						const MAX_IMAGE_SIZE = 500;
						//const _id = ea.addEmbeddable(
						// 	eaView.currentPosition.x,
						// 	eaView.currentPosition.y,
						// 	MAX_IMAGE_SIZE,
						// 	MAX_IMAGE_SIZE,
						// 	fileLink,
						// 	file
						// );
						//await ea.addElementsToView(false, true, true);


					}
					//return _id;
				}
			});

			//return document.createTextNode("💔");
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
				class: "cm-breakpoint-gutter",
				markers: (v) => {
					//console.log("provide", value);
					const range_set = v.state.field(value);
					return range_set;
				},
				initialSpacer: () => dragMarker,
			})
			return [gut];
		}
	});
	// const dragGutter = gutter({
	// 	class: "cm-breakpoint-gutter",
	// 	//markers: (v) => { console.log("provide in gutter", v.state.field(dragSymbolSet)); return v.state.field(dragSymbolSet); },
	// 	initialSpacer: () => dragMarker,
	// 	// domEventHandlers: {
	// 	// 	pointerover(view, line, event) {
	// 	// 		toggleBreakpoint(view, line.from, true);
	// 	// 		return true;
	// 	// 	},
	// 	// 	pointerleave(view, line, event) {
	// 	// 		toggleBreakpoint(view, line.from, false);
	// 	// 		return true;
	// 	// 	},
	// 	// },
	// });
	const addSymbolWhenMouseMove = (event: MouseEvent, view: EditorView) => {
		const pos = view.posAtCoords({
			x: event.clientX,
			y: event.clientY,
		});
		//console.log("mouse moving moving", pos);
		if (pos) {
			const dragLine = view.state.field(dragSymbolSet);
			const line = view.lineBlockAt(pos);
			let hasDragPoint = false;
			//console.log("breackpoints", breakpoints);
			dragLine.between(line.from, line.from, () => {
				hasDragPoint = true;
			});
			//console.log("hasBreakpoint", hasBreakpoint);
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
			throttle(addSymbolWhenMouseMove, 1000 * 0.2)(event, view);
		},
	});


	return [
		//dragGutter,
		dragSymbolSet,
		mouseMoveWatch,
		//checkboxPlugin
	];
};

// const lineDragWidget = new (class extends WidgetType {
// 	toDOM(view: EditorView): HTMLElement {
// 		const dragContent = document.createElement("span");
// 		dragContent.draggable = true;
// 		dragContent.innerText = "💔";
// 		dragContent.addEventListener("click", e => {
// 			const editor = plugin.app.workspace.activeEditor;
// 			console.log("can detect active editor in line?", editor);
// 		})
// 		return dragContent;
// 	}
// 	coordsAt(dom: HTMLElement, pos: number, side: number): Rect | null {
// 		console.log("pos: ", pos, "side: ", side);
// 		return super.coordsAt(dom, pos, side);
// 	}
// })

import MyPlugin from "main";
import { EditorView, gutter, GutterMarker, Decoration, DecorationSet, WidgetType, ViewPlugin, ViewUpdate, Rect } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { throttle } from "utility";
import { getEA } from "obsidian-excalidraw-plugin";
import { syntaxTree } from "@codemirror/language"
import * as CodeMirror from "codemirror";



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


export const dragExtension = (plugin: MyPlugin) => {
	let needToAddLink = false;
	const handleDropToCreateFile = (text: () => string) => {
		return async (e: DragEvent) => {
			console.log("can detect canvas?", e.target);
			try {
				if (e.target as HTMLCanvasElement) {
					const ea = getEA();
					//@ts-ignore
					const eb = ExcalidrawLib;
					//@ts-ignore
					const view = ea.setView();

					const pluginApp = plugin.app;
					const filePath = "";

					const file = await pluginApp.vault.create(filePath, text())
					const fileLink = pluginApp.metadataCache.fileToLinktext(
						file,
						view.file.path,
						file.extension === "md",
					)
					const MAX_IMAGE_SIZE = 500;
					const _id = ea.addEmbeddable(
						view.currentPosition.x,
						view.currentPosition.y,
						MAX_IMAGE_SIZE,
						MAX_IMAGE_SIZE,
						fileLink,
						file
					);
					await ea.addElementsToView(false, true, true);
					needToAddLink = true;
					console.log("can get EA?", ea);
					console.log("can get EB?", eb);
					console.log("file", text());

					//return _id;
				}
			} catch (error) {
				console.log("not find ea");
			}
			return;
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
		}
	};
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
			this.ghost?.remove();
		}
		//dragSymbol: HTMLElement;
		ghost?: HTMLElement;
		toDOM(view: EditorView) {
			const dragSymbol = document.createElement("div");
			dragSymbol.draggable = true;
			const symbol = dragSymbol.createSpan();
			symbol.innerText = "💔";
			symbol.style.fontSize = "18px";
			//div.style.fontSize = "3vh";
			// div.style.width = "10vw";
			// div.style.height = "10vh";
			let content: string;
			dragSymbol.addEventListener("click", this.clickHandler);

			const handleDrop = handleDropToCreateFile(() => content);
			dragSymbol.addEventListener("dragend", (e) => {
				document.removeEventListener("drop", handleDrop);
				if (needToAddLink) {
					needToAddLink = false;
					//replace editor's select line or text with link
				}
			});
			dragSymbol.addEventListener("dragstart", (e) => {
				const select = view.state.selection.ranges.map(range => {
					return view.state.sliceDoc(range.from, range.to);
				}).join().trim();
				const getLineString = () => {
					const statefield = view.state.field(dragSymbolSet);
					const start = statefield.iter().from;
					const lineBlock = view.lineBlockAt(start);
					const lineString = view.state.sliceDoc(lineBlock.from, lineBlock.to)
					return lineString
				}
				//console.log("from: ", start, "line block: ", lineBlock)
				content = select.length !== 0 ? select : getLineString();
				if (!this.ghost) {
					const div = document.createElement("div");
					//set position to absolute and append it to body to show custom element when dragging
					div.style.position = "absolute";
					//use translate to hide element outside of screen.
					div.style.transform = "translate(-10000px, -10000px)";
					this.ghost = document.body.appendChild(div);
					//plugin.app.workspace.containerEl.appendChild(this.ghost);
				}
				this.ghost.innerText = content;
				//console.log("widget to Dom can access view", view);
				document.addEventListener("drop", handleDrop);
				//const active = document.querySelector(".cm-active");

				// console.log("select: ", active);
				console.log("create ghost: ", this.ghost);
				// console.log("select", se);
				// console.log("select text", selection);
				// console.log("state field", statefield);
				(e.dataTransfer as any).effectAllowed = "all";
				e.dataTransfer?.setDragImage(
					this.ghost,
					0,
					0
				);
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

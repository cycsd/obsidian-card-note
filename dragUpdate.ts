import MyPlugin from "main";
import { EditorView, gutter, GutterMarker, Decoration, DecorationSet, WidgetType, ViewPlugin, ViewUpdate, Rect } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { throttle } from "utility";
import { getEA } from "obsidian-excalidraw-plugin";
import { syntaxTree } from "@codemirror/language"
import * as CodeMirror from "codemirror";



type BlockInfo = ReturnType<EditorView["lineBlockAt"]>;
const addUnderline = StateEffect.define<{ from: number, to: number }>({
	map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) })
})

const underlineField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none
	},
	update(underlines, tr) {
		underlines = underlines.map(tr.changes)
		for (const e of tr.effects) if (e.is(addUnderline)) {
			underlines = underlines.update({
				add: [underlineMark.range(e.value.from, e.value.to)]
			})
		}
		return underlines
	},
	provide: f => EditorView.decorations.from(f)
})

const underlineMark = Decoration.mark({ class: "cm-underline" })

class CheckboxWidget extends WidgetType {
	constructor(readonly checked: boolean) { super() }

	eq(other: CheckboxWidget) { return other.checked == this.checked }

	toDOM(view: EditorView) {
		const wrap = document.createElement("span")
		wrap.setAttribute("aria-hidden", "true")
		wrap.className = "cm-boolean-toggle"
		const box = wrap.appendChild(document.createElement("input"))
		box.type = "checkbox"
		box.checked = this.checked
		return wrap
	}

	ignoreEvent() { return false }
}

function checkboxes(view: EditorView) {
	const widgets: ReturnType<Decoration["range"]>[] = [];
	for (const { from, to } of view.visibleRanges) {
		syntaxTree(view.state).iterate({
			from, to,
			enter: (node) => {
				console.log("from: ", node.from, "to: ", node.to, "name:", node.name);
				if (node.name == "Document") {
					console.log("from: ", node.from, "to: ", node.to, "node", node);

				}
				if (node.name == "BooleanLiteral") {
					const isTrue = view.state.doc.sliceString(node.from, node.to) == "true"
					const deco = Decoration.widget({
						widget: new CheckboxWidget(isTrue),
						side: 1
					})
					widgets.push(deco.range(node.to))
				}
			}
		})
	}
	return Decoration.set(widgets)
}

const checkboxPlugin = ViewPlugin.fromClass(class {
	decorations: DecorationSet

	constructor(view: EditorView) {
		this.decorations = checkboxes(view)
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged)
			this.decorations = checkboxes(update.view)
	}
}, {
	decorations: v => v.decorations,

	eventHandlers: {
		mousedown: (e, view) => {
			const target = e.target as HTMLElement
			if (target.nodeName == "INPUT" &&
				target.parentElement!.classList.contains("cm-boolean-toggle"))
				return toggleBoolean(view, view.posAtDOM(target))
		}
	}
})
function toggleBoolean(view: EditorView, pos: number) {
	const before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
	let change
	if (before == "false")
		change = { from: pos - 5, to: pos, insert: "true" }
	else if (before.endsWith("true"))
		change = { from: pos - 4, to: pos, insert: "false" }
	else
		return false
	view.dispatch({ changes: change })
	return true
}


export const dragExtension = (plugin: MyPlugin) => {
	const handleDropToCreateFile = (e: DragEvent) => {
		console.log("can detect canvas?", e.target);
		try {
			const ea = getEA();
			console.log("can get EA?", ea);
		} catch (error) {
			console.log("not find ea");
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
			//const leaf = plugin.app.workspace.createLeafBySplit();
			//console.log("acitve leaf: ", leaf);
			console.log(
				"show active editor",
				plugin.app.workspace.activeEditor
			);
		}
		destroy(dom: Node): void {
			document.removeEventListener("click", this.clickHandler);
		}
		toDOM(view: EditorView) {
			const div = document.createElement("div");
			div.draggable = true;
			div.innerText = "💔";
			let ghost: HTMLElement;
			div.style.width = "10vw";
			div.style.height = "10vh";
			//可偵測到
			//不過在一開始打開obsidian的時候(會顯示gutter)
			//及在canvas or excalidraw 一開始點選的時候(雖然也不會顯示gutter)
			//會無法偵測到activeEditor
			//且toDOM這個動作以目前的寫法似乎只會在
			//editor獲得statefield extension的時候做一次
			//接下來range改變都不會再進行toDom動作(原因需要再理解)
			console.log(
				"gutter detect active editor in toDom",
				plugin.app.workspace.activeEditor
			);
			const ae = plugin.app.workspace.activeEditor;
			div.addEventListener("click", this.clickHandler);
			div.addEventListener("dragend", (e) => {
				document.removeEventListener("drop", handleDropToCreateFile);
			});
			div.addEventListener("dragstart", (e) => {
				console.log("get file in to Dom and read in drag start", ae?.file);
				console.log("widget to Dom can access view", view);
				document.addEventListener("drop", handleDropToCreateFile);
				//點擊gutter後會取不到activeEditor
				const se = view.state.selection;
				const selection = view.state.doc.sliceString(se.main.from, se.main.to);
				//plugin.app.workspace.activeEditor?.editor?.getSelection();
				ghost = document.createElement("div");
				//set position to absolute and append it to body to show custom element when dragging
				ghost.style.position = "absolute";
				//use translate to hide element outside of screen.
				ghost.style.transform = "translate(-10000px, -10000px)";
				//document.body.appendChild(ghost);

				plugin.app.workspace.containerEl.appendChild(ghost);
				ghost.innerText = selection ?? "Hellow World";
				const active = document.querySelector(".cm-active");
				const statefield = view.state.field(dragSymbolSet);
				console.log("select: ", active);
				console.log("create ghost: ", ghost);
				console.log("select", se);
				console.log("select text", selection);
				console.log("state field", statefield);
				(e.dataTransfer as any).effectAllowed = "all";
				e.dataTransfer?.setDragImage(
					ghost.innerText?.trim().length === 0
						? active ?? ghost
						: ghost,
					0,
					0
				);
			});
			//return document.createTextNode("💔");
			return div;
		}
	})();
	const mousemoveEffect = StateEffect.define<{ from: number, to: number }>({
		map: (val, mapping) => ({ from: mapping.mapPos(val.from), to: mapping.mapPos(val.to) }),
	});
	const dragSymbolSet = StateField.define<[RangeSet<GutterMarker>, DecorationSet]>({
		create() {
			return [RangeSet.empty, Decoration.none];
		},
		update(set, transaction) {
			let [range_set, deco] = set;
			range_set = range_set.map(transaction.changes);
			for (const e of transaction.effects) {
				if (e.is(mousemoveEffect)) {
					range_set = range_set.update({
						add: [dragMarker.range(e.value.from)],
						filter: (from) => from === e.value.from,
					});
					deco = Decoration.set([
						Decoration.widget({
							widget: lineDragWidget
						}).range(e.value.from)
					])
				}
			}
			return [range_set, deco];
		},
		//依此stateField狀態所需要更新的Extension都可以放在provide funciton中提供出來
		provide: (value) => {
			const de = EditorView.decorations.from(value, v => {
				const [_r, d] = v;
				return d;
			})
			const gut = gutter({
				class: "cm-breakpoint-gutter",
				markers: (v) => {
					//console.log("provide", value);
					const [range_set, _deco] = v.state.field(value);
					return range_set;
				},
				initialSpacer: () => dragMarker,
			})
			return [de, gut];
		}
	});
	const dragGutter = gutter({
		class: "cm-breakpoint-gutter",
		//markers: (v) => { console.log("provide in gutter", v.state.field(dragSymbolSet)); return v.state.field(dragSymbolSet); },
		initialSpacer: () => dragMarker,
		// domEventHandlers: {
		// 	pointerover(view, line, event) {
		// 		toggleBreakpoint(view, line.from, true);
		// 		return true;
		// 	},
		// 	pointerleave(view, line, event) {
		// 		toggleBreakpoint(view, line.from, false);
		// 		return true;
		// 	},
		// },
	});
	const addSymbolWhenMouseMove = (event: MouseEvent, view: EditorView) => {
		const pos = view.posAtCoords({
			x: event.clientX,
			y: event.clientY,
		});
		//console.log("mouse moving moving", pos);
		if (pos) {
			const [dragPoint, dragLine] = view.state.field(dragSymbolSet);
			const line = view.lineBlockAt(pos);
			let hasDragPoint = false;
			//console.log("breackpoints", breakpoints);
			dragPoint.between(line.from, line.from, () => {
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
	const lineDragWidget = new (class extends WidgetType {
		toDOM(view: EditorView): HTMLElement {
			const dragContent = document.createElement("span");
			dragContent.draggable = true;
			dragContent.innerText = ":::";
			// console.log(
			// 	"line widget detect active editor in toDom",
			// 	plugin.app.workspace.activeEditor
			// );
			dragContent.addEventListener("click", e => {
				//相對於gutter
				//可在canvas中偵測到activeEditor
				console.log("click", e);
				const editor = plugin.app.workspace.activeEditor;
				console.log("can detect active editor in line?", editor);
			})
			return dragContent;
		}
		coordsAt(dom: HTMLElement, pos: number, side: number): Rect | null {
			console.log("pos: ", pos, "side: ", side);
			return super.coordsAt(dom, pos, side);
		}
	})

	return [
		//dragGutter,
		dragSymbolSet,
		mouseMoveWatch,
		//checkboxPlugin
	];
};

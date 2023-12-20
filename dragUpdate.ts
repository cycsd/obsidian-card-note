import MyPlugin from "main";
import { EditorView, gutter, GutterMarker } from "@codemirror/view";
import { StateField, StateEffect, RangeSet } from "@codemirror/state";
import { throttle } from "utility";
export const dragExtension = (plugin: MyPlugin) => {
	const dragMarker = new (class extends GutterMarker {
		toDOM() {
			const div = document.createElement("div");
			div.draggable = true;
			div.innerText = "💔";
			let ghost: HTMLElement;
			div.addEventListener(
				"dragstart",
				(e) => {
					const selection =
						plugin.app.workspace.activeEditor?.editor?.getSelection();
					ghost = document.createElement("div");
					//set position to absolute and append it to body to show custom element when dragging
					ghost.style.position = "absolute";
					//use translate to hide element outside of screen.
					ghost.style.transform = "translate(-10000px, -10000px)";
					document.body.appendChild(ghost);

					ghost.innerText = selection ?? "";
					const active = document.querySelector(".cm-active");
					console.log("select: ", active);
					console.log("create ghost: ", ghost);
					//(e.dataTransfer as any).effectAllowed = "all";
					e.dataTransfer?.setDragImage(
						selection?.trim().length === 0
							? active ?? ghost
							: ghost,
						0,
						0
					);
				},
				false
			);
			//return document.createTextNode("💔");
			return div;
		}
	})();
	const mousemoveEffect = StateEffect.define<{ pos: number }>({
		map: (val, mapping) => ({ pos: mapping.mapPos(val.pos) }),
	});
	const dragSymbolSet = StateField.define<RangeSet<GutterMarker>>({
		create() {
			return RangeSet.empty;
		},
		update(set, transaction) {
			set = set.map(transaction.changes);
			for (const e of transaction.effects) {
				if (e.is(mousemoveEffect)) {
					set = set.update({
						add: [dragMarker.range(e.value.pos)],
						filter: (from) => from === e.value.pos,
					});
				}
			}
			return set;
		},
	});
	const dragGutter = gutter({
		class: "cm-breakpoint-gutter",
		markers: (v) => v.state.field(dragSymbolSet),
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
			const breakpoints = view.state.field(dragSymbolSet);
			const line = view.lineBlockAt(pos);
			let hasBreakpoint = false;
			//console.log("breackpoints", breakpoints);
			breakpoints.between(line.from, line.from, () => {
				hasBreakpoint = true;
			});
			//console.log("hasBreakpoint", hasBreakpoint);
			if (!hasBreakpoint) {
				view.dispatch({
					effects: mousemoveEffect.of({ pos: line.from }),
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
	return [dragGutter, dragSymbolSet, mouseMoveWatch];
};

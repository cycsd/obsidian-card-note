import { TextFileView } from "obsidian";
import { CanvasView } from "./types/canvas";


export const OBSIDIAN_CANVAS = "canvas";

export function isObsidianCanvasView(view?: TextFileView): view is CanvasView {
	return view?.getViewType() === OBSIDIAN_CANVAS;
}

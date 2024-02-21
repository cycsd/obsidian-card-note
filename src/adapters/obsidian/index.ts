import { TextFileView } from "obsidian";
import { CanvasFileNode, CanvasNode, CanvasView } from "./types/canvas";
import { ObsidianCanvasNode } from "obsidian-excalidraw-plugin/lib/utils/CanvasNodeFactory";


export const OBSIDIAN_CANVAS = "canvas";

export function isObsidianCanvasView(view?: TextFileView): view is CanvasView {
	return view?.getViewType() === OBSIDIAN_CANVAS;
}
export function isCanvasFileNode(node: CanvasNode | ObsidianCanvasNode): node is CanvasFileNode {
	return 'file' in node
}


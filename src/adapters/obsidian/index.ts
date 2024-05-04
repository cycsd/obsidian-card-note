import { TextFileView, type MarkdownFileInfo } from "obsidian";
import type { CanvasFileNode, CanvasNode, CanvasTextNode, CanvasView } from "./types/canvas";
import type { ObsidianCanvasNode } from "obsidian-excalidraw-plugin/lib/utils/CanvasNodeFactory";


export const OBSIDIAN_CANVAS = "canvas";

export function isObsidianCanvasView(view?: TextFileView): view is CanvasView {
	return view?.getViewType() === OBSIDIAN_CANVAS;
}
export function isCanvasFileNode(node: CanvasNode | ObsidianCanvasNode): node is CanvasFileNode {
	return 'file' in node && 'canvas' in node
}
export function isCanvasEditorNode(node: CanvasNode | ObsidianCanvasNode | MarkdownFileInfo | undefined | null): node is CanvasFileNode | CanvasTextNode {
	return node
		? ('file' in node || 'text' in node) && 'id' in node
		: false
}
export function getOffset(node: CanvasFileNode | CanvasTextNode) {
	const child = isCanvasFileNode(node) ? node.child : undefined;
	return child === undefined ? 0 : child?.before.length + child?.heading.length
}


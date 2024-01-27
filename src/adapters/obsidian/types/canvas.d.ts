
import { TFile, TextFileView } from "obsidian";
import { AllCanvasNodeData } from "obsidian/canvas";


export interface CanvasView extends TextFileView {
	canvas: ObsidianCanvas;
}
export interface ObsidianCanvas {
	posFromEvt(event: MouseEvent): { x: number, y: number },
	createFileNode(config: {
		file: TFile,
		pos: { x: number, y: number },
		subpath?: string,
		position?: "top" | "bottom" | "left" | "right" | "center",
		size?: number,
		save?: boolean,
		focus?: boolean,
	}): any,
		selection: Set<AllCanvasNodeData>
	}



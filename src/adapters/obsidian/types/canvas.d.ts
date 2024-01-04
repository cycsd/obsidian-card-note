
import { TFile, TextFileView } from "obsidian";

interface CanvasView extends TextFileView {
	canvas: ObsidianCanvas,
}
interface ObsidianCanvas {
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
}


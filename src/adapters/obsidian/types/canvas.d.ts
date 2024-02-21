import { TFile, TextFileView } from "obsidian";
import { AllCanvasNodeData, CanvasNodeData } from "obsidian/canvas";


export interface CanvasView extends TextFileView {
	canvas: ObsidianCanvas;
}
export interface ObsidianCanvas {
	nodes: Map<string, CanvasNode>,
	selection: Set<CanvasNode>,
	posFromEvt: (event: MouseEvent) => { x: number, y: number },
	createFileNode: (config: {
		file: TFile,
		pos: { x: number, y: number },
		subpath?: string,
		position?: "top" | "bottom" | "left" | "right" | "center",
		size?: number,
		save?: boolean,
		focus?: boolean,
	}) => any,
	requestSave: () => void,
}
export type CanvasNode = CanvasFileNode | CanvasTextNode
export interface CanvasFileNode extends CanvasNodeData {
	file: TFile,
	setFilePath: (filePath: string, subpath: string) => void,
	filePath: string,
	subpath: string,
	child: {
		//text before current
		before: string,
		//text after current
		after: string,
		file: TFile,
		//heading text if not narrow to heading "" instead.
		heading: string,
		data: string,
		//if show all file subpath is "".
		subpath: string,
		subpathNotFound: boolean,
		//text show in canvas
		text: string,
	}
}
export interface CanvasTextNode extends CanvasNodeData {
	text: string,
	setText: (text: string) => void,
}




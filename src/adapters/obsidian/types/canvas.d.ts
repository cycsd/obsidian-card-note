import { TFile, TextFileView } from "obsidian";
import { AllCanvasNodeData, CanvasNodeData, type CanvasData, CanvasEdgeData } from "obsidian/canvas";


export function isInstanceofCanvasEdge()
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
		size?: { height: number, width: number },
		save?: boolean,
		focus?: boolean,
	}) => CanvasFileNode,
	createTextNode: (config: {
		text: string,
		pos: { x: number, y: number },
		position?: "top" | "bottom" | "left" | "right" | "center",
		size?: { height: number, width: number },
		save?: boolean,
		focus?: boolean,
	}) => CanvasTextNode,
	edges: Map<string, CanvasEdgeNode>,
	addEdge: (edge: CanvasEdgeNode) => void,
	getData: () => CanvasData,
	importData: (data: CanvasData) => void,
	requestFrame: () => Promise<void>,
	requestSave: () => Promis<void>,
}
export type CanvasNode = CanvasFileNode | CanvasTextNode
export interface CanvasFileNode extends CanvasNodeData {
	file: TFile,
	canvas: ObsidianCanvas,
	setFilePath: (filePath: string, subpath: string) => void,
	filePath: string,
	subpath: string,
	/**
	 * 
	 * {@link CanvasFileNode.child.previewMode} has the preview mode elements after this function is called.
	 */
	render: () => void,
	//canvas-node-ineraction-layer call this function on resize double click
	onResizeDblclick: (event: MouseEvent, position: "top" | "bottom" | "left" | "right") => void,
	child?: {
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
		// get preview mode element
		previewMode: {
			renderer: {
				//markdown-preview
				previewEl: HTMLElement,
				//markdown-preview-sizer (this element is the child of previewEl)
				sizerEl: HTMLElement,
				sections: Array<any>,
			}
		}
	},
	isContentMounted: boolean,
}
export interface CanvasTextNode extends CanvasNodeData {
	text: string,
	setText: (text: string) => void,
	render: () => void,
	onResizeDblclick: (event: MouseEvent, position: "top" | "bottom" | "left" | "right") => void,
	child?: {
		text: string,
		previewMode: {
			renderer: {
				previewEl: HTMLElement,
				sizerEl: HTMLElement,
				sections: Array<any>,
			}
		}
	},
	isContentMounted: boolean,
}

export interface CanvasEdgeNode extends CanvasEdgeData {
	setLabel: (label?: string) => void
}




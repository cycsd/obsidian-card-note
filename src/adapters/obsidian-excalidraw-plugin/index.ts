//import { ExcalidrawLib } from 'obsidian-excalidraw-plugin/lib/typings/ExcalidrawLib';
import CardNote from "main";
import "obsidian";
import { TFile, WorkspaceLeaf } from "obsidian";
export type { ExcalidrawBindableElement, ExcalidrawElement, FileId, FillStyle, StrokeRoundness, StrokeStyle } from "@zsviczian/excalidraw/types/element/types";
export type { ExcalidrawImperativeAPI, Point } from "@zsviczian/excalidraw/types/types";
import { getEA as excalidrawGetEA } from "obsidian-excalidraw-plugin";
import { ExcalidrawAutomate } from "obsidian-excalidraw-plugin/lib/ExcalidrawAutomate"
//import { ExcalidrawView }  from "obsidian-excalidraw-plugin/lib/ExcalidrawView";
import { ExcalidrawView } from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';
import { ObsidianCanvasNode } from "obsidian-excalidraw-plugin/lib/utils/CanvasNodeFactory";
import { ObsidianMarkdownEmbeded } from "./types/ExcalidrawAutomate";
//no export in source file
//import { ExcalidrawLibs } from 'src/adapters/obsidian-excalidraw-plugin/types/ExcalidrawLib'



export const VIEW_TYPE_EXCALIDRAW = "excalidraw";
export function getEA(view?: any): ExcalidrawAutomate {
    return excalidrawGetEA(view);
}
export function isExcalidrawView(view: any): view is ExcalidrawView{
	return view.getViewType() === VIEW_TYPE_EXCALIDRAW;
}
export function isObsidianMarkdownEmbeded(value: any): value is Required<ObsidianMarkdownEmbeded> {
	// leaf: WorkspaceLeaf;
	// node ?: ObsidianCanvasNode;
	return 'leaf' in value && 'node' in value
}
const MAX_IMAGE_SIZE = 500;
export async function insertEmbeddableOnDrawing(event: DragEvent, view: ExcalidrawView, fileLink: string, file: TFile, plugin: CardNote) {
	try {
		const ea = getEA();
		const eaView = ea.setView(view);
		//@ts-ignore
		const pos = ExcalidrawLib.viewportCoordsToSceneCoords({
			clientX: event.clientX,
			clientY: event.clientY
		}, eaView.excalidrawAPI.getAppState())
		const id = ea.addEmbeddable(
			pos.x,
			pos.y,
		MAX_IMAGE_SIZE,
		MAX_IMAGE_SIZE,
		fileLink,
		file
		)
		await ea.addElementsToView(false, true, true);
		ea.selectElementsInView([id]);
		//const eb = ExcalidrawLib;
		//const api = ea.getExcalidrawAPI();
		//const appState = api.getAppState();
		//const { width, height, offsetLeft, offsetTop } = appState;
		//console.log("getViewState", appState);
		//@ts-ignore
		// const position = excalidrawLib.sceneCoordsToViewportCoords({
		// 	clientX: width / 2 + offsetLeft,
		// 	clientY: height / 2 + offsetTop,
		// }, appState);
		//insertEmbeddableToView()
	} catch (error) {
		console.log(error);
	}

}

export async function createTextOnDrawing(event: DragEvent, view: ExcalidrawView, text: string, plugin: CardNote) {
	try {
		const ea = getEA();
		const eaView = ea.setView(view);
		const appState = view.excalidrawAPI.getAppState();
		ea.style.strokeColor = appState.currentItemStrokeColor ?? "black";
		ea.style.opacity = appState.currentItemOpacity ?? 1;
		ea.style.fontFamily = appState.currentItemFontFamily ?? 1;
		ea.style.fontSize = appState.currentItemFontSize ?? 20;
		ea.style.textAlign = appState.currentItemTextAlign ?? "left";
		//@ts-ignore
		const pos = ExcalidrawLib.viewportCoordsToSceneCoords({
			clientX: event.clientX,
			clientY: event.clientY
		}, eaView.excalidrawAPI.getAppState())
		const id = ea.addText(
			pos.x,
			pos.y,
			text,
		)
		await view.addElements(ea.getElements(), false, true, undefined, true);

	} catch (error) {
		console.log(error);
	}

}

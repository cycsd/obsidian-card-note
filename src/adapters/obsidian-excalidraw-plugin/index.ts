import { ExcalidrawView } from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';
import CardNote from "main";
import "obsidian";
import { TFile} from "obsidian";
export type { ExcalidrawBindableElement, ExcalidrawElement, FileId, FillStyle, StrokeRoundness, StrokeStyle } from "@zsviczian/excalidraw/types/element/types";
export type { ExcalidrawImperativeAPI, Point } from "@zsviczian/excalidraw/types/types";
import { getEA as excalidrawGetEA } from "obsidian-excalidraw-plugin";
import {ExcalidrawAutomate} from "obsidian-excalidraw-plugin/lib/ExcalidrawAutomate"

export const VIEW_TYPE_EXCALIDRAW = "excalidraw";
export function getEA(view?: any): ExcalidrawAutomate {
    return excalidrawGetEA(view);
}
export function isExcalidrawView(view: any): view is ExcalidrawView{
	return view.getViewType() === VIEW_TYPE_EXCALIDRAW;
}
const MAX_IMAGE_SIZE = 500;
export async function insertEmbeddableOnDrawing(view:ExcalidrawView,fileLink:string,file:TFile,plugin:CardNote) {
	try {
		const ea = getEA();
		const eaView = ea.setView(view);
		const id = ea.addEmbeddable(
		eaView.currentPosition.x,
		eaView.currentPosition.y,
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
		// console.log("can get EA?", ea);
		// console.log("can get EB?", eb);
		// console.log("can get view?", eaView);
		// console.log("can get position?", position);
		// console.log("add embeddabel", ea.addEmbeddable);	
	} catch (error) {
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

}

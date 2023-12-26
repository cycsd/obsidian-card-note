//import { ExcalidrawView } from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';
import { ExcalidrawImperativeAPI } from "..";



declare module "obsidian-excalidraw-plugin/lib/ExcalidrawAutomate" {
	interface ExcalidrawAutomate {
		/**
		 *
		 * @returns https://github.com/excalidraw/excalidraw/tree/master/src/packages/excalidraw#ref
		 */
		getExcalidrawAPI(): ExcalidrawImperativeAPI;

		// setView(view?: ExcalidrawView | "first" | "active"):ExcalidrawView

	}
}
declare module "obsidian-excalidraw-plugin/lib/ExcalidrawView" {
	interface ExcalidrawView{
		currentPosition: { x: number, y: number };
	}
}




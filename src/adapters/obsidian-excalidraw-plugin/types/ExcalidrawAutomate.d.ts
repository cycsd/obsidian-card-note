import { Editor, WorkspaceLeaf } from 'obsidian';
import { ExcalidrawElement, ExcalidrawImperativeAPI } from '..';
import { ObsidianCanvasNode } from 'obsidian-excalidraw-plugin/lib/utils/CanvasNodeFactory';
import { default as BaseView } from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';
import { ExcalidrawData } from 'obsidian-excalidraw-plugin/lib/ExcalidrawData';

//import ExcalidrawView from 'obsidian-excalidraw-plugin/lib/ExcalidrawView';

export type ObsidianMarkdownEmbeded = {
	leaf: WorkspaceLeaf;
	node?: ObsidianCanvasNode;
}
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
declare module 'obsidian-excalidraw-plugin/lib/ExcalidrawView' {
	interface ExcalidrawView extends Omit<BaseView, 'embeddableLeafRefs'> {
		currentPosition: { x: number, y: number };
		excalidrawAPI: ExcalidrawImperativeAPI;
		editor: Editor;
		excalidrawData: ExcalidrawData;
		embeddableLeafRefs: Map<string, unknown>;
		getActiveEmbeddable(): ObsidianMarkdownEmbeded | null;
		//setDirty: (debug?: number) => void;
		updateScene: (scene: {
			elements?: ExcalidrawElement[];
			appState?: any;
			files?: any;
			commitToHistory?: boolean;
		}, shouldRestore?: boolean) => void;
		addElements: (para: {
			newElements: ExcalidrawElement[],
			repositionToCursor?: boolean,
			save?: boolean,
			images?: any,
			newElementsOnTop?: boolean,
			shouldRestoreElements?: boolean,
		}
		) => Promise<boolean>
	}
}





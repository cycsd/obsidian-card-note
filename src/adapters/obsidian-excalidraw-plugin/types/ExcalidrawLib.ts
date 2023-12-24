// // import { RestoredDataState } from "@zsviczian/excalidraw/types/data/restore";
// // import { ImportedDataState } from "@zsviczian/excalidraw/types/data/types";
// // import { BoundingBox } from "@zsviczian/excalidraw/types/element/bounds";
// // import { ExcalidrawBindableElement, ExcalidrawElement, ExcalidrawFrameElement, ExcalidrawTextElement, FontFamilyValues, FontString, NonDeleted, NonDeletedExcalidrawElement, Theme } from "@zsviczian/excalidraw/types/element/types";
// // import { AppState, BinaryFiles, ExportOpts, Point, Zoom } from "@zsviczian/excalidraw/types/types";
// // import { Mutable } from "@zsviczian/excalidraw/types/utility-types";

// import { ExcalidrawLib } from "obsidian-excalidraw-plugin/lib/typings/ExcalidrawLib";

// //@ts-ignore
// const excalidrawLib: typeof ExcalidrawLib = ExcalidrawLib;

// export const {
//     sceneCoordsToViewportCoords,
//     viewportCoordsToSceneCoords,
//     determineFocusDistance,
//     intersectElementWithLine,
//     getCommonBoundingBox,
//     getMaximumGroups,
//     measureText,
//     getDefaultLineHeight,
//     wrapText,
//     getFontString,
//     getBoundTextMaxWidth,
//     exportToSvg,
//     exportToBlob,
//     mutateElement,
//     restore,
// } = excalidrawLib;
// // declare module "obsidian-excalidraw-plugin/lib/typings/ExcalidrawLib" {
// //   // 这里根据实际情况定义 ExcalidrawLib 的类型
// //   // 例如：export interface ExcalidrawLib { /* 类型定义 */ }
// //   // 或者按照实际导出的内容进行定义
// //   export namespace ExcalidrawLib {
// //     // ...
// //   }
// // }
// // type EmbeddedLink =
// //   | ({
// //     aspectRatio: { w: number; h: number };
// //     warning?: string;
// //   } & (
// //       | { type: "video" | "generic"; link: string }
// //       | { type: "document"; srcdoc: (theme: Theme) => string }
// //     ))
// //   | null;

// // declare namespace ExcalidrawLib {
// //   type ElementUpdate<TElement extends ExcalidrawElement> = Omit<
// //     Partial<TElement>,
// //     "id" | "version" | "versionNonce"
// //   >;

// //   type ExportOpts = {
// //     elements: readonly NonDeleted<ExcalidrawElement>[];
// //     appState?: Partial<Omit<AppState, "offsetTop" | "offsetLeft">>;
// //     files: BinaryFiles | null;
// //     maxWidthOrHeight?: number;
// //     getDimensions?: (
// //       width: number,
// //       height: number,
// //     ) => { width: number; height: number; scale?: number };
// //   };

// //   function restore(
// //     data: Pick<ImportedDataState, "appState" | "elements" | "files"> | null,
// //     localAppState: Partial<AppState> | null | undefined,
// //     localElements: readonly ExcalidrawElement[] | null | undefined,
// //     elementsConfig?: { refreshDimensions?: boolean; repairBindings?: boolean },
// //   ): RestoredDataState;

// //   function exportToSvg(opts: Omit<ExportOpts, "getDimensions"> & {
// //     elements: ExcalidrawElement[];
// //     appState?: AppState;
// //     files?: any;
// //     exportPadding?: number;
// //     exportingFrame: ExcalidrawFrameElement | null | undefined;
// //     renderEmbeddables?: boolean;
// //   }): Promise<SVGSVGElement>;

// //   function sceneCoordsToViewportCoords(
// //     sceneCoords: { sceneX: number; sceneY: number },
// //     viewParams: {
// //       zoom: Zoom;
// //       offsetLeft: number;
// //       offsetTop: number;
// //       scrollX: number;
// //       scrollY: number;
// //     },
// //   ): { x: number; y: number };

// //   function viewportCoordsToSceneCoords(
// //     viewportCoords: { clientX: number; clientY: number },
// //     viewParams: {
// //       zoom: Zoom;
// //       offsetLeft: number;
// //       offsetTop: number;
// //       scrollX: number;
// //       scrollY: number;
// //     },
// //   ): { x: number; y: number };

// //   function determineFocusDistance(
// //     element: ExcalidrawBindableElement,
// //     a: Point,
// //     b: Point,
// //   ): number;

// //   function intersectElementWithLine(
// //     element: ExcalidrawBindableElement,
// //     a: Point,
// //     b: Point,
// //     gap?: number,
// //   ): Point[];

// //   function getCommonBoundingBox(
// //     elements: ExcalidrawElement[] | readonly NonDeleted<ExcalidrawElement>[],
// //   ): BoundingBox;

// //   function getMaximumGroups(
// //     elements: ExcalidrawElement[],
// //   ): ExcalidrawElement[][];

// //   function measureText(
// //     text: string,
// //     font: FontString,
// //     lineHeight: number,
// //   ): { width: number; height: number; baseline: number };

// //   function getDefaultLineHeight(fontFamily: FontFamilyValues): number;

// //   function wrapText(text: string, font: FontString, maxWidth: number): string;

// //   function getFontString({
// //     fontSize,
// //     fontFamily,
// //   }: {
// //     fontSize: number;
// //     fontFamily: FontFamilyValues;
// //   }): FontString;

// //   function getBoundTextMaxWidth(container: ExcalidrawElement): number;

// //   function exportToBlob(
// //     opts: ExportOpts & {
// //       mimeType?: string;
// //       quality?: number;
// //       exportPadding?: number;
// //     },
// //   ): Promise<Blob>;

// //   function mutateElement<TElement extends Mutable<ExcalidrawElement>>(
// //     element: TElement,
// //     updates: ElementUpdate<TElement>,
// //     informMutation?: boolean,
// //   ): TElement;

// //   function getEmbedLink(link: string | null | undefined): EmbeddedLink;

// //   function mermaidToExcalidraw(
// //     mermaidDefinition: string,
// //     opts: { fontSize: number },
// //     forceSVG?: boolean,
// //   ): Promise<{
// //     elements: ExcalidrawElement[],
// //     files: any
// //   } | undefined>;
// // }
export { }
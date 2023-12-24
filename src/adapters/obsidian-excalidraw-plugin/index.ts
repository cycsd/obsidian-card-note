import "obsidian";
export type { ExcalidrawBindableElement, ExcalidrawElement, FileId, FillStyle, StrokeRoundness, StrokeStyle } from "@zsviczian/excalidraw/types/element/types";
export type { ExcalidrawImperativeAPI, Point } from "@zsviczian/excalidraw/types/types";
import { getEA as excalidrawGetEA } from "obsidian-excalidraw-plugin";
import type { ExcalidrawAutomate } from "obsidian-excalidraw-plugin/lib/ExcalidrawAutomate";
import { ExcalidrawLib } from "obsidian-excalidraw-plugin/lib/typings/ExcalidrawLib"


export function getEA(view?: any): ExcalidrawAutomate {
    return excalidrawGetEA(view);
};
export function getEALib() {
    return ExcalidrawLib;
}

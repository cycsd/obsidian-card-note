import { App, Component, MarkdownRenderer, prepareSimpleSearch, type SearchResult, type TFile } from "obsidian"
import type { CardSearchView } from "./view/cardSearchView";
export enum Seq {
    ascending,
    descending
}
export type FileMatch = {
    file: TFile;
    content?: string;
    match?: SearchResult;
    nameMatch?: SearchResult;
}
export type SortMethod = (a: FileMatch, b: FileMatch) => number
export type SearchedFile = FileMatch & {
    content: string;
}
export type File = TFile | SearchedFile
export function isSearchedFile(file: File | FileMatch): file is SearchedFile {
    return "content" in file
}

export type RenderPara = {
    app: App;
    markdown: string;
    sourcePath: string;
    component: Component;
}
export function search(query: string, validFiles: (file: TFile) => boolean, view: CardSearchView) {
    const fuzzy = prepareSimpleSearch(query),
        searching = async (
            file: TFile,
        ): Promise<SearchedFile | undefined> => {
            const content = validFiles(file)
                ? await view.app.vault.cachedRead(file)
                : '',
                contentResult = fuzzy(content),
                fileNameResult = fuzzy(file.name);
            if (contentResult || fileNameResult) {
                return {
                    file: file,
                    content,
                    match: contentResult ?? undefined,
                    nameMatch: fileNameResult ?? undefined,
                };
            }
        };
    return searching;
}
export function sortByName(a: FileMatch, b: FileMatch) {
    return a.file.path < b.file.path
        ? -1
        : a.file.path > b.file.path
            ? 1
            : 0;
}
export function sortByModifiedTime(a: FileMatch, b: FileMatch) {
    return a.file.stat.mtime - b.file.stat.mtime;
}
export function sortByCreateTime(a: FileMatch, b: FileMatch) {
    return a.file.stat.ctime - b.file.stat.ctime;
}
export function sortByRelated(a: FileMatch, b: FileMatch) {
    return computeScore(a) - computeScore(b);
}
function computeScore(value: FileMatch) {
    return (
        (value.match?.score ?? -5) +
        (value.nameMatch?.score ?? -5)
    );
}
export function ObsidianMarkdownRender(element: HTMLElement, para: RenderPara) {
    // console.log('div', element)
    // console.log('render div', para)
    MarkdownRenderer.render(
        para.app,
        para.markdown,
        element,
        para.sourcePath,
        para.component
    )
    // .then(() => { element.style.display = "block" })
    // return {
    // update: (u: RenderPara) => {
    //     console.log('update', u)
    //     MarkdownRenderer.render(
    //         para.app,
    //         u.markdown,
    //         element,
    //         para.sourcePath,
    //         para.component
    //     )
    // },
    // destroy: () => {
    //     element.replaceChildren();
    // }
    // }
}
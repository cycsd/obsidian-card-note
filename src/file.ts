import { App, Component, MarkdownRenderer, prepareSimpleSearch, renderMatches, renderResults, type SearchMatches, type SearchResult, type TFile } from "obsidian"
import type { CardSearchView } from "./view/cardSearchView";
import { text } from "stream/consumers";
import { debug } from "console";
import { tryCreateRegex } from "./utility";
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
export function search(query: string) {
    const fuzzy = prepareSimpleSearch(query),
        searching = async (
            file: TFile,
            content: string
        ): Promise<SearchedFile | undefined> => {
            // const content = validFiles(file)
            //     ? await view.app.vault.cachedRead(file)
            //     : '',
            const contentResult = fuzzy(content),
                filePathResult = fuzzy(file.path);
            if (contentResult || filePathResult) {
                return {
                    file: file,
                    content,
                    match: contentResult ?? undefined,
                    nameMatch: filePathResult ?? undefined,
                };
            }
        };
    return searching;
}
export function searchByRegex(query: string, flags?: string) {
    return (file: TFile, content: string): SearchedFile | undefined => {
        const contentMatches = regexSearch(content, tryCreateRegex(query, flags));
        const filePathMatches = regexSearch(file.path, tryCreateRegex(query, flags));

        if (contentMatches.length !== 0 || filePathMatches.length !== 0) {
            return {
                file,
                content,
                match: { score: contentMatches.length, matches: contentMatches },
                nameMatch: { score: filePathMatches.length, matches: filePathMatches }
            }
        }

    }
}
function regexSearch(content: string, regex?: RegExp): SearchMatches {
    if (regex) {
        let matches: SearchMatches = [];
        while (regex.lastIndex < content.length) {
            const match = regex.exec(content);
            if (match) {
                matches.push([match.index, regex.lastIndex]);
                continue;
            }
            else {
                break;
            }
        }
        return matches
    }
    return []

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
export function Touch(source: [number, number]) {
    const [from, to] = source;

    return (target: [number, number]) => {
        const [start, end] = target;
        return (end >= from && end <= to) ||
            (start >= from && start <= to) ||
            (start <= from && end >= to)
    }
}
export function InRange(source: [number, number]) {
    const [from, to] = source;
    return (target: [number, number]) => {
        const [start, end] = target;
        return from <= start && end <= to
    }
}
export function ObsidianMarkdownRender(element: HTMLElement, para: RenderPara) {
    MarkdownRenderer.render(
        para.app,
        para.markdown,
        element,
        para.sourcePath,
        para.component
    )
    // .then(() => { element.style.display = "block" })
    // return {
    //     update: (u: RenderPara) => {
    //         element.replaceChildren();
    //         console.log('update', u.sourcePath, 'content: ', u.markdown.substring(0, 50))
    //         MarkdownRenderer.render(
    //             para.app,
    //             u.markdown,
    //             element,
    //             para.sourcePath,
    //             para.component
    //         )
    //     },
    // // destroy: () => {
    // //     element.replaceChildren();
    // // }
    // }
}
export type ResultRenderPara = {
    text: string,
    result: SearchMatches,
    offset?: number,
}
export function ObsidianResultRender(element: HTMLElement, para: ResultRenderPara) {

    renderMatches(
        element,
        para.text,
        para.result,
        para.offset
    )
}
export const validCacheReadFilesExtension = ["md", "canvas"]

export enum SectionCacheType {
    code = "code",
}
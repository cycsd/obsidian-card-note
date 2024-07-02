<script lang="ts" context="module">
	import { prepareSimpleSearch } from "obsidian";
	import type { CardSearchView } from "../cardSearchView";
	import type { FileMatch, TFileContainer } from "./PrepareLoad.svelte";

	export type FileCommon = TFileContainer & Partial<FileMatch>;
	export type SEQ = "descending" | "ascending";
	export type SortMethod = (a: FileCommon, b: FileCommon) => number;
	export const descending = "descending";
	export const ascending = "ascending";

	export function sortByName(a: FileCommon, b: FileCommon) {
		return a.file.path < b.file.path
			? -1
			: a.file.path > b.file.path
				? 1
				: 0;
	}
	export function sortByModifiedTime(a: FileCommon, b: FileCommon) {
		return a.file.stat.mtime - b.file.stat.mtime;
	}
	export function sortByCreateTime(a: FileCommon, b: FileCommon) {
		return a.file.stat.ctime - b.file.stat.ctime;
	}
	export function sortByRelated(a: FileCommon, b: FileCommon) {
		return computeScore(a) - computeScore(b);
	}
	function computeScore(value: FileCommon) {
		return (
			(value.contentMatchResult?.score ?? -5) +
			(value.fileNameMatchResult?.score ?? -5)
		);
	}

	export function search(query: string, view: CardSearchView) {
		const fuzzy = prepareSimpleSearch(query),
			searching = async (
				cont: TFileContainer,
			): Promise<FileMatch | undefined> => {
				const content = await view.app.vault.cachedRead(cont.file),
					contentResult = fuzzy(content),
					fileNameResult = fuzzy(cont.file.name);
				if (contentResult || fileNameResult) {
					return {
						file: cont.file,
						content,
						contentMatchResult: contentResult ?? undefined,
						fileNameMatchResult: fileNameResult ?? undefined,
					};
				}
			};
		return searching;
	}
	export async function searchFiles(
		query: string,
		origin: TFileContainer[],
		view: CardSearchView,
	) {
		const finds = (
			await Promise.all(origin.map(search(query, view)))
		).filter((file) => file !== undefined) as FileMatch[];
		return finds;
	}
	export async function getDisplayFiles(
		view: CardSearchView,
		origin: TFileContainer[],
		query: string,
	): Promise<TFileContainer[] | FileMatch[]> {
		return query.length !== 0
			? await searchFiles(query, origin, view)
			: origin;
	}
</script>

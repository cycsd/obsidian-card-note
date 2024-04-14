<script lang="ts" context="module">
	export type TFileContainer = {
		file: TFile;
	};
	export type FileMatch = TFileContainer & {
		content: string;
		contentMatchResult?: SearchResult;
		fileNameMatchResult?: SearchResult;
	};
	export type FileCommon = TFileContainer & Partial<FileMatch>;
	export type ProcessContent = {
		conent: Promise<string>;
	};

	export const isFileMatch = (
		file: TFileContainer | FileMatch,
	): file is FileMatch => {
		return "content" in file;
	};
</script>

<script lang="ts">
	import type {
		CacheItem,
		SearchMatchPart,
		SearchMatches,
		SearchResult,
		TFile,
	} from "obsidian";
	import type {
		MatchWithType,
		NoteContent,
		NoteMatchCache,
	} from "./DisplayCard.svelte";
	import type { CardSearchView } from "../cardSearchView";
	import { getCacheOffset } from "src/utility";
	export let source: TFileContainer | FileMatch;
	export let view: CardSearchView;

	const processMatch = (match: FileMatch): NoteMatchCache[] | undefined => {
		const contentMatch = match.contentMatchResult;
		if (contentMatch === undefined) {
			return;
		}
		const touch = (s: SearchMatchPart) => {
			const [matchStart, matchEnd] = s;
			// (blockEnd > start && blockEnd <= end)
			// 	|| (blockStart >= start && blockStart < end)
			return (c: CacheItem) => {
				const [start, end] = getCacheOffset(c);
				return (
					(matchStart > start && matchStart < end) ||
					(matchEnd > start && matchEnd < end)
				);
			};
		};
		const inSectionRange = (mt: MatchWithType, c: CacheItem) => {
			const [matchStart, matchEnd] = mt.match;
			const [start, end] = getCacheOffset(c);
			// (blockEnd > start && blockEnd <= end)
			// 	|| (blockStart >= start && blockStart < end)
			return matchStart >= start && matchEnd <= end;
		};
		const caches = view.app.metadataCache.getFileCache(match.file);
		const extendMatchRange = (mtch: SearchMatchPart): MatchWithType => {
			const [matchStart, matchEnd] = mtch;

			const extendRange = (c: CacheItem): SearchMatchPart => {
				const [start, end] = getCacheOffset(c);
				return [Math.min(start, matchStart), Math.max(end, matchEnd)];
			};
			const embeded = caches?.embeds?.find(touch(mtch));
			if (embeded) {
				return { match: extendRange(embeded), type: "embeds" };
			}
			const linked = caches?.links?.find(touch(mtch));
			if (linked) {
				return { match: extendRange(linked) };
			}
			return { match: mtch };
		};
		const matches = contentMatch.matches.map(extendMatchRange);
		// let sections:NoteMatchCache=[];
		// let matchIndex:0;
		const sections: NoteMatchCache[] | undefined = caches?.sections?.map(
			(section): NoteMatchCache => {
				const ms = matches.filter((m) => inSectionRange(m, section));
				return ms.length !== 0
					? {
							section,
							matchResult: {
								score: contentMatch.score,
								matches: ms,
							},
						}
					: {
							section,
						};
			},
		);
		return sections;
	};
	const loadingContent = (
		source: TFileContainer | FileMatch,
	): Promise<NoteContent> => {
		if (isFileMatch(source)) {
			return new Promise<NoteContent>((solve) => {
				const caches = processMatch(source);
				solve({
					content: source.content,
					matchCache: caches,
				});
			});
		} else {
			return source.file.vault
				.cachedRead(source.file)
				.then((content) => ({
					content,
				}));
		}
	};
</script>

<slot item={{ file: source.file, data: loadingContent(source) }} />

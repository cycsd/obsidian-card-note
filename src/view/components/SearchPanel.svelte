<script lang="ts" context="module">
	export type SearchPara = {
		include: (file: TFile) => boolean;
		query: (file: TFile) => Promise<FileCommon | undefined>;
		sortMethod: (a: FileCommon, b: FileCommon) => number;
		seq: SEQ;
	};
    	import { TFile } from "obsidian";
	import {
		derived,
		writable,
		type Readable,
		type Writable,
	} from "svelte/store";
	import {
		descending,
		sortByModifiedTime,
		type SEQ,
	} from "./SearchUtil.svelte";
	import type { FileCommon } from "./PrepareLoad.svelte";
	export async function defaultExclude(file: TFile) {
		return false;
	}
	export function defaultInclude(file: TFile): boolean {
		return true;
	}
	export function createSearchPanel(files: TFile[]) {
		const originFiles = writable(files);
		const excludeMethod = writable(defaultExclude);
		const filesForSearch = derived(
			[originFiles, excludeMethod],
			(values) => {
				const [origin, exclude] = values;
				return origin.filter((file) => !exclude(file));
			},
		);
		const searchParas: Writable<SearchPara> = writable({
			include: defaultInclude,
			sortMethod: sortByModifiedTime,
			seq: descending,
			query: (file) => Promise.resolve({ file }),
		});

		const fileList: Readable<FileCommon[]> = derived(
			[filesForSearch, searchParas],
			(values, set) => {
				const [files, { include, sortMethod, seq, query }] = values;
				Promise.all(files.filter(include).map((f) => query(f)))
					.then((data) => {
						const d = data.filter((d) => d) as FileCommon[];
						return d;
					})
					.then((data) =>
						data.sort(
							seq === descending
								? (a, b) => -sortMethod(a, b)
								: sortMethod,
						),
					)
					.then(set);
			},
		);
        return {
            fileList,
        }
	}
</script>


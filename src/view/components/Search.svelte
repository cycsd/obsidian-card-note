<script lang="ts">
	import {
		SliderComponent,
		TFile,
		debounce,
		ButtonComponent,
		TAbstractFile,
	} from "obsidian";
	import { onMount } from "svelte";
	import {
		FixedSizeGrid as Grid,
		type GridChildComponentProps,
		type StyleObject,
		FixedSizeGrid,
		type GridOnScrollProps,
	} from "svelte-window";
	import AutoSizer from "svelte-virtualized-auto-sizer";
	import type { CardSearchView } from "../cardSearchView";
	import ComputeLayout from "./ComputeLayout.svelte";
	import { type TFileContainer } from "./PrepareLoad.svelte";
	import { getDisplayFiles } from "./SearchUtil.svelte";
	import ButtonGroups, { type Button } from "./ButtonGroups.svelte";
	import { derived, writable, type Readable } from "svelte/store";
	import {
		search as searchByObsidian,
		sortByCreateTime as byCreateTime,
		sortByModifiedTime as byModifiedTime,
		sortByRelated as byRelated,
		sortByName as byName,
		Seq,
		type SortMethod as Sort,
		type File,
		type FileMatch as FM,
		type SearchedFile,
		isSearchedFile,
		validCacheReadFilesExtension,
		searchByRegex,
	} from "src/file";
	import Card from "src/view/components/Card.svelte";
	import Index from "../Index.svelte";
	import SearchInput, { type SearchSettings } from "./searchInput.svelte";
	import { tryCreateRegex } from "src/utility";

	export let view: CardSearchView;

	let columnWidth = view.plugin.settings.columnWidth;
	let rowHeight = view.plugin.settings.rowHeight;
	let showLayoutMenu = false;
	const gutter = 30;
	const filesNew = writable<TFile[]>([]);
	const searchSettings = writable<SearchSettings>({
		useRegex: view.plugin.settings.useRegex,
		matchCase: view.plugin.settings.matchCase,
		showSearchDetail: view.plugin.settings.showSearchDetail,
	});
	const queryNew = writable(view.plugin.settings.query);
	const include = writable(view.plugin.settings.include);
	const exclude = writable(view.plugin.settings.exclude);
	const sortMethodNew = writable(byModifiedTime);
	const seqNew = writable(Seq.descending);
	const filesReadyForSearch: Readable<TFile[]> = derived(
		[filesNew, include, exclude],
		([$files, $include, $exclude], set) => {
			const getRemovePattern = () =>
				tryCreateRegex($exclude) ?? {
					test: (string: string) => false,
				};
			const getIncludePattern = () =>
				tryCreateRegex($include) ?? {
					test: (string: string) => true,
				};
			const includeFiles = $files.filter((file) => {
				const remove =
					$exclude.length != 0 && getRemovePattern().test(file.path);
				const need =
					$include.length == 0 || getIncludePattern().test(file.path);
				return !remove && need;
			});
			set(includeFiles);
		},
	);
	const searchedFiles: Readable<File[]> = derived(
		[filesReadyForSearch, queryNew, searchSettings],
		([$files, $query, $setting], set) => {
			console.log("use regex", $setting.useRegex);
			const searchMethod = $setting.useRegex
				? searchByRegex($query, $setting.matchCase ? "g" : "gi")
				: searchByObsidian($query);
			const finds =
				$query.length !== 0
					? Promise.all(
							$files.map(async (file) => {
								var fileCache = $searchedFiles.find(
									(f) =>
										isSearchedFile(f) &&
										f.file.path === file.path,
								) as SearchedFile | undefined;
								var content =
									fileCache &&
									fileCache.file.stat.mtime ===
										file.stat.mtime
										? Promise.resolve(fileCache.content)
										: validCacheReadFilesExtension.contains(
													file.extension,
											  )
											? view.app.vault.cachedRead(file)
											: Promise.resolve("");
								const cont = await content;
								return searchMethod(file, cont ?? "");
							}),
						).then(
							(files) =>
								files.filter(
									(f) => f !== undefined,
								) as SearchedFile[],
						)
					: Promise.resolve($files);
			finds.then((data) => set(data));
		},
		[] as File[],
	);
	const filesDisplay: Readable<FM[]> = derived(
		[searchedFiles, sortMethodNew, seqNew],
		([$files, $sortMethod, $seq], set) => {
			const sortM: Sort =
				$seq === Seq.descending
					? (a, b) => -$sortMethod(a, b)
					: $sortMethod;
			const sortFiles = $files.map((f) =>
				isSearchedFile(f) ? f : { file: f },
			);
			sortFiles.sort(sortM);
			set([...sortFiles]);
		},
		[] as FM[],
	);
	let originFiles: TFileContainer[] = [];
	let query = "";
	let offset: GridOnScrollProps = {
		scrollLeft: 0,
		scrollTop: 0,
		verticalScrollDirection: "forward",
		scrollUpdateWasRequested: false,
		horizontalScrollDirection: "forward",
	};

	$: files = getDisplayFiles(view, originFiles, query);
	const computeKey = (index: number) => {
		return index < $filesDisplay.length
			? index +
					$filesDisplay[index].file.path +
					$filesDisplay[index].file.stat.mtime +
					$queryNew +
					($queryNew.length !== 0
						? `${$searchSettings.useRegex}${$searchSettings.matchCase}`
						: "")
			: index;
	};

	onMount(() => {
		$filesNew = view.app.vault.getFiles();
		originFiles = view.app.vault
			.getMarkdownFiles()
			.map((file) => ({ file }));
		const vault = view.app.vault;
		const registerVaultEvent = (callback: (f: TFile) => void) => {
			return (tf: TAbstractFile) => {
				if (tf instanceof TFile) {
					callback(tf);
				}
			};
		};
		const create = view.app.vault.on(
			"create",
			registerVaultEvent((newF) => {
				// originFiles = [{ file: newF }, ...originFiles];
				$filesNew = [...$filesNew, newF];
			}),
		);
		const del = view.app.vault.on(
			"delete",
			registerVaultEvent((delF) => {
				// originFiles = originFiles.filter((of) => of.file !== delF);
				$filesNew = $filesNew.filter((of) => of !== delF);
			}),
		);
		const modify = view.app.vault.on(
			"modify",
			registerVaultEvent(async (mf) => {
				$filesNew = $filesNew.map((of) => (of === mf ? mf : of));

				// const inMatchFile = async () => {
				// 	const fs = await files;
				// 	return fs.find((f) => f.file === mf);
				// };
				// if (
				// 	query.length === 0 ||
				// 	(await inMatchFile()) ||
				// 	(await simpleSearch(query, view)({ file: mf }))
				// )
				// 	originFiles = originFiles.map((of) =>
				// 		of.file === mf ? { file: mf } : of,
				// 	);
			}),
		);
		const rename = view.app.vault.on("rename", (tf, oldPath) =>
			registerVaultEvent((renameFile) => {
				$filesNew = $filesNew.map((old) =>
					old.path === oldPath ? renameFile : old,
				);
				// originFiles = originFiles.map((of) =>
				// 	of.file.path === oldPath ? { file: renameFile } : of,
				// );
			})(tf),
		);
		const leafChange = view.app.workspace.on(
			"active-leaf-change",
			async (leaf) => {
				if (leaf?.view.getViewType() === view.getViewType() && grid) {
					//if this view does not display on screen and the file is modified.
					//the scroll items display in the correct position but div element scrolltop will not scroll to the position we want
					//when the leaf change to this view
					//so sroll to 0,0 first
					//then scroll to memorized offset
					grid.scrollTo({ scrollLeft: 0, scrollTop: 0 });
					grid.scrollTo({
						scrollLeft: offset.scrollLeft,
						scrollTop: offset.scrollTop,
					});
				}
			},
		);
		console.log("on mount");
		return () => {
			vault.offref(create);
			vault.offref(modify);
			vault.offref(del);
			vault.offref(rename);
			view.app.workspace.offref(leafChange);
			view.plugin.settings.query = $queryNew;
			view.plugin.settings.useRegex = $searchSettings.useRegex;
			view.plugin.settings.matchCase = $searchSettings.matchCase;
			view.plugin.settings.showSearchDetail =
				$searchSettings.showSearchDetail;
			view.plugin.settings.include = $include;
			view.plugin.settings.exclude = $exclude;
			view.plugin.saveSettings();
			console.log("close");
		};
	});

	// const search = (ele: HTMLElement) => {
	// 	new SearchComponent(ele).onChange(
	// 		debounce((value) => {
	// 			query = value;
	// 		}, 1000),
	// 	);
	// };
	const layoutSetting = (ele: HTMLElement) => {
		const b = new ButtonComponent(ele)
			.setIcon("layout-grid")
			.setTooltip("Toggle Layout Detail")
			.onClick((e) => {
				if (showLayoutMenu) {
					b.removeCta();
				} else {
					b.setCta();
				}
				showLayoutMenu = !showLayoutMenu;
			});
	};

	const columnWidthSetting = (ele: HTMLElement) => {
		new SliderComponent(ele)
			.setLimits(200, 1000, 10)
			.setValue(columnWidth)
			.setDynamicTooltip()
			.onChange((value) => {
				view.plugin.settings.columnWidth = value;
				view.plugin.saveSettings();
				columnWidth = value;
			});
	};
	const rowHeightSetting = (ele: HTMLElement) => {
		new SliderComponent(ele)
			.setLimits(200, 1000, 10)
			.setValue(rowHeight)
			.setDynamicTooltip()
			.onChange((value) => {
				view.plugin.settings.rowHeight = value;
				view.plugin.saveSettings();
				rowHeight = value;
			});
	};
	const sortSeq: Button<Seq>[] = [
		{
			icon: "arrow-down-narrow-wide",
			toolTip: "asc",
			value: Seq.ascending,
		},
		{
			icon: "arrow-up-narrow-wide",
			toolTip: "desc",
			value: Seq.descending,
			active: true,
		},
	];
	const sortMethods: Button<Sort>[] = [
		{
			icon: "file-type-2",
			toolTip: "name",
			value: byName,
		},
		{
			icon: "file-plus-2",
			toolTip: "last created",
			value: byCreateTime,
		},
		{
			icon: "file-clock",
			toolTip: "last modified",
			value: byModifiedTime,
			active: true,
		},
		{
			icon: "file-search",
			toolTip: "related",
			value: byRelated,
		},
	];

	const computeGapStyle = (
		style: StyleObject,
		padding: number,
	): StyleObject => {
		const top = (style.top ?? 0) + gutter,
			left = (style.left ?? 0) + gutter + padding,
			width =
				typeof style.width === "number"
					? style.width - gutter
					: style.width,
			height =
				typeof style.height === "number"
					? style.height - gutter
					: style.height;

		return {
			...style,
			top,
			left,
			width,
			height,
		};
	};
	const rememberScrollOffsetForFileUpdate = debounce(
		(props: GridOnScrollProps) => {
			offset = props;
		},
		2000,
	);
	let grid: FixedSizeGrid;
	const index = (
		com: GridChildComponentProps,
		columnCount: number,
		totalCount: number,
	) => {
		const dataBefore = com.rowIndex * columnCount,
			columOffest = com.columnIndex + 1,
			dataCount = dataBefore + columOffest;
		return dataCount <= totalCount ? dataCount - 1 : null;
	};
</script>

<SearchInput
	query={queryNew}
	{include}
	{exclude}
	settings={searchSettings}
	debounceTime={700}
></SearchInput>
<!-- <div use:search></div> -->
<div class="searchMenuBar">
	<div>
		{$filesDisplay.length} results
	</div>
	<div class="buttonBar">
		{#if showLayoutMenu}
			<div>
				<div use:columnWidthSetting>column width</div>
				<div use:rowHeightSetting>row height</div>
			</div>
		{/if}
		<div use:layoutSetting></div>
		<ButtonGroups
			buttons={sortMethods}
			onclick={(e, value) => {
				$sortMethodNew = value;
			}}
		></ButtonGroups>
		<ButtonGroups
			buttons={sortSeq}
			onclick={(e, value) => {
				$seqNew = value;
			}}
		></ButtonGroups>
	</div>
</div>
<AutoSizer let:width={childWidth} let:height={childHeight}>
	<svelte:fragment>
		<ComputeLayout
			viewHeight={childHeight ?? 1000}
			viewWidth={childWidth ?? 1000}
			{columnWidth}
			gap={gutter}
			totalCount={$filesDisplay.length}
			let:gridProps
		>
			<Grid
				bind:this={grid}
				initialScrollTop={offset.scrollTop}
				columnCount={gridProps.columns}
				columnWidth={columnWidth + gutter}
				height={childHeight ?? 500}
				rowCount={gridProps.rows}
				rowHeight={rowHeight + gutter}
				width={childWidth ?? 500}
				onScroll={rememberScrollOffsetForFileUpdate}
				let:items
			>
				<Index {items} columnCount={gridProps.columns} let:item={cells}>
					{#each cells as cell (computeKey(cell.index))}
						{#if cell.index < $filesDisplay.length}
							<Card
								{view}
								cellStyle={computeGapStyle(
									cell.style,
									gridProps.padding,
								)}
								component={view}
								files={$filesDisplay}
								index={cell.index}
							></Card>
						{/if}
					{/each}
					<!-- {#if cell.index < $filesDisplay.length}
					{/if} -->
				</Index>
			</Grid>
		</ComputeLayout>
	</svelte:fragment>
</AutoSizer>

<style>
	.searchMenuBar {
		display: flex;
		align-items: end;
	}
	.searchMenuBar {
		justify-content: space-between;
	}
	.buttonBar {
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		/* grid-template-columns: repeat(6, minmax(0, 1fr)); */
		/* grid-auto-flow: row; */
		/* grid-auto-columns: min-content; */
		gap: 3px;
		/* min-width: '150px'; */
		/* max-width: 50%; */
	}
	.hiddenContent {
		border: 2px solid;
		border-radius: 15px;
		padding: 10px;
	}
	/* .b{
		grid-template-columns: repeat(1, minmax(0, 1fr));
	} */
</style>

<script lang="ts">
	import {
		MarkdownRenderer,
		SearchComponent,
		SliderComponent,
		prepareFuzzySearch,
		TFile,
		debounce,
		prepareSimpleSearch,
		setIcon,
		Menu,
		ButtonComponent,
		Vault,
		TAbstractFile,
	} from "obsidian";
	import { afterUpdate, onMount, tick } from "svelte";
	import {
		FixedSizeGrid as Grid,
		styleString as sty,
		type GridChildComponentProps,
		type StyleObject,
		FixedSizeGrid,
		type GridOnScrollProps,
	} from "svelte-window";
	import AutoSizer from "svelte-virtualized-auto-sizer";
	import DisplayCard from "./DisplayCard.svelte";
	import type { CardSearchView } from "../cardSearchView";
	import ComputeLayout from "./ComputeLayout.svelte";
	import PrepareLoad, {
		type FileMatch,
		type TFileContainer,
	} from "./PrepareLoad.svelte";
	import {
		ascending,
		descending,
		getDisplayFiles,
		sortByCreateTime,
		sortByModifiedTime,
		type SEQ,
		type SortMethod,
		sortByRelated,
	} from "./SearchUtil.svelte";
	import ButtonGroups, { type Button } from "./ButtonGroups.svelte";
	import SortingFiles from "./SortingFiles.svelte";

	export let view: CardSearchView;
	//export let renderMethod:()=>(node:HTMLElement,file:TFile,content:string)=>void

	let columnWidth = 250;
	let rowHeight = 250;
	let showLayoutMenu = false;
	const gutter = 20;

	let originFiles: TFileContainer[] = [];
	let matchFiles: FileMatch[] = [];
	let query = "";
	let sortMethod = sortByModifiedTime;
	let seq: SEQ = descending;
	let offset: GridOnScrollProps = {
		scrollLeft: 0,
		scrollTop: 0,
		verticalScrollDirection: "forward",
		scrollUpdateWasRequested: false,
		horizontalScrollDirection: "forward",
	};

	$: files = getDisplayFiles(view, originFiles, query); //, sortMethod, seq); //query.length === 0 ? [...originFiles] : [...matchFiles];
	//$: totalCount = files.length;

	let rowCount: number;
	onMount(() => {
		originFiles = view.app.vault
			.getMarkdownFiles()
			.map((file) => ({ file }));
		const vault = view.app.vault;
		const registerVaultEvent = (callback: (f: TFile) => void) => {
			return (tf: TAbstractFile) => {
				if (tf instanceof TFile && tf.extension === "md") {
					callback(tf);
				}
			};
		};
		const create = view.app.vault.on(
			"create",
			registerVaultEvent((newF) => {
				originFiles = [{ file: newF }, ...originFiles];
			}),
		);
		const del = view.app.vault.on(
			"delete",
			registerVaultEvent((delF) => {
				originFiles = originFiles.filter((of) => of.file !== delF);
			}),
		);
		const modify = view.app.vault.on(
			"modify",
			registerVaultEvent(async (_mF) => {
				originFiles = originFiles.map((of) =>
					of.file === _mF ? { file: _mF } : of,
				);
				console.log("grid prev tick", grid, "scroll to", offset);
				// await tick();
				// await files;
				// grid.scrollTo({
				// 	scrollLeft: offset.scrollLeft,
				// 	scrollTop: offset.scrollTop,
				// });
			}),
		);
		const rename = view.app.vault.on("rename", (tf, oldPath) =>
			registerVaultEvent((renameFile) => {
				originFiles = originFiles.map((of) =>
					of.file.path === oldPath ? { file: renameFile } : of,
				);
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

		return () => {
			console.log("delete");
			vault.offref(create);
			vault.offref(modify);
			vault.offref(del);
			vault.offref(rename);
			view.app.workspace.offref(leafChange);
		};
	});
	// afterUpdate(() => {
	// 	if (grid) {
	// 		console.log('after update',offset)
	// 		grid.scrollTo({
	// 			scrollLeft: offset.scrollLeft,
	// 			scrollTop: offset.scrollTop,
	// 		});
	// 	}
	// });

	// const fuzzySearch = async (searchQuery: string) => {
	// 	if (searchQuery.length !== 0) {
	// 		//const fuzzy = prepareFuzzySearch(searchQuery),
	// 		const fuzzy = prepareSimpleSearch(searchQuery),
	// 			searching = async (
	// 				cont: TFileContainer,
	// 			): Promise<FileMatch | undefined> => {
	// 				const content = await view.app.vault.cachedRead(cont.file),
	// 					result = fuzzy(content);
	// 				if (result) {
	// 					return {
	// 						file: cont.file,
	// 						content,
	// 						matchResult: result,
	// 					};
	// 				}
	// 			},
	// 			finds = (await Promise.all(originFiles.map(searching))).filter(
	// 				(file) => file !== undefined,
	// 			) as FileMatch[];
	// 		matchFiles = finds;
	// 	}
	// 	query = searchQuery;
	// };
	const search = (ele: HTMLElement) => {
		new SearchComponent(ele).onChange(
			debounce((value) => {
				query = value;
			}, 1000),
		);
	};
	const layoutSetting = (ele: HTMLElement) => {
		setIcon(ele, "layout-grid");
	};
	const showLayoutMenuSetting = (e: MouseEvent) => {
		showLayoutMenu = !showLayoutMenu;
		// const menu = new Menu();
		// // const columneSetting = document.createDiv();
		// console.log("menu", menu);
		// menu.setUseNativeMenu(true);
		// menu.addItem((item) => {
		// 	item.setTitle("item menu");
		// 	item;
		// 	// item.setDisabled(false)
		// 	console.log("item: ", item);
		// 	new SliderComponent(item.dom.createEl("button"))
		// 		.setLimits(200, 1000, 10)
		// 		.setDynamicTooltip()
		// 		.onChange((value) => {
		// 			columnWidth = value;
		// 		});
		// });
		// menu.dom.createDiv();
		// menu.showAtMouseEvent(e);
	};
	const columnWidthSetting = (ele: HTMLElement) => {
		new SliderComponent(ele)
			.setLimits(200, 1000, 10)
			.setDynamicTooltip()
			.onChange((value) => {
				columnWidth = value;
			});
	};
	const rowHeightSetting = (ele: HTMLElement) => {
		new SliderComponent(ele)
			.setLimits(200, 1000, 10)
			.setDynamicTooltip()
			.onChange((value) => {
				rowHeight = value;
			});
	};
	const sortSeq: Button<SEQ>[] = [
		{
			icon: "arrow-down-narrow-wide",
			toolTip: "asc",
			value: ascending,
		},
		{
			icon: "arrow-up-narrow-wide",
			toolTip: "desc",
			value: descending,
			active: true,
		},
	];
	const sortMethods: Button<SortMethod>[] = [
		{
			icon: "file-plus-2",
			toolTip: "last created",
			value: sortByCreateTime,
		},
		{
			icon: "file-clock",
			toolTip: "last modified",
			value: sortByModifiedTime,
			active: true,
		},
		{
			icon: "file-search",
			toolTip: "related",
			value: sortByRelated,
		},
	];

	const index = (
		com: GridChildComponentProps,
		columnCount: number,
		totalCount: number,
	) => {
		const dataBefore = com.rowIndex * columnCount,
			columOffest = com.columnIndex + 1,
			dataCount = dataBefore + columOffest;
		//console.log("row:", com.rowIndex, "column:", com.columnIndex, "data index", dataCount, 'files lenght', files.length)
		return dataCount <= totalCount ? dataCount - 1 : null;
	};

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
			console.log("onscroll", props);
			offset = props;
		},
		2000,
	);
	const openFile = (file: TFile) => {
		console.log("open file", file);
		view.app.workspace.getLeaf(false).openFile(file);
	};

	let grid: FixedSizeGrid;
</script>

<div use:search></div>
<div
	on:click={(e) => {
		grid.scrollTo({ scrollLeft: 0, scrollTop: 1600 });
	}}
>
	click to offset 1600
</div>
<div class="searchMenuBar">
	<div>
		{#await files}
			Search...
		{:then f}
			{f.length} results
		{/await}
	</div>
	<div class="buttonBar">
		<div>
			<div use:columnWidthSetting>column width</div>
			<div use:rowHeightSetting>row height</div>
		</div>
		<button use:layoutSetting on:click={showLayoutMenuSetting}></button>
		<!-- <div use:icon={"clock"}></div> -->
		<ButtonGroups
			buttons={sortMethods}
			onclick={(e, value) => {
				sortMethod = value;
			}}
		></ButtonGroups>
		<!-- <div use:icon={"file-plus-2"}></div>
		<div use:icon={"file-clock"}></div>
		<div use:icon={"file-search"}></div> -->
		<ButtonGroups
			buttons={sortSeq}
			onclick={(e, value) => {
				seq = value;
			}}
		></ButtonGroups>
		<!-- <div use:icon={"arrow-down-narrow-wide"}></div>
		<div use:icon={"arrow-up-narrow-wide"}></div> -->
	</div>
</div>
<!-- <div>query: {query}</div>
<div>show total count in search {totalCount}</div> -->
<AutoSizer let:width={childWidth} let:height={childHeight}>
	<!-- {#await files}
		Searching...
	{:then f} -->
	{#await files then f}
		<!-- <div>render in move window {f.length}</div> -->
		<!-- <p
			on:click={(e) => {
				console.log(grid);
			}}
		>
			width:{childWidth} height:{childHeight}
		</p> -->
		<ComputeLayout
			viewHeight={childHeight ?? 1000}
			viewWidth={childWidth ?? 1000}
			{columnWidth}
			gap={gutter}
			totalCount={f.length}
			let:gridProps
		>
			<SortingFiles files={f} {sortMethod} {seq} let:files={sortFiles}>
				<!-- <div>grid rows: {gridProps.rows}</div> -->
				<Grid
					bind:this={grid}
					initialScrollTop={offset.scrollTop}
					columnCount={gridProps.columns}
					columnWidth={columnWidth + gutter}
					height={childHeight ?? 500}
					rowCount={gridProps.rows}
					rowHeight={rowHeight + gutter}
					width={childWidth ?? 500}
					useIsScrolling
					overscanRowCount={1}
					onScroll={rememberScrollOffsetForFileUpdate}
					let:items
				>
					{#each items as it}
						<!-- {it.isScrolling ? 'Scrolling' : `Row ${it.rowIndex} - Col ${it.columnIndex}`} -->
						<!-- {console.log(grid)} -->
						{#if index(it, gridProps.columns, f.length) !== null}
							<PrepareLoad
								{view}
								source={sortFiles[
									index(it, gridProps.columns, f.length) ?? 0
								]}
								let:item
							>
								<DisplayCard
									file={item.file}
									{view}
									cellStyle={computeGapStyle(
										it.style,
										gridProps.padding,
									)}
									onOpenFile={openFile}
									data={item.data}
								></DisplayCard>
							</PrepareLoad>
							<!-- {:else}
						{it.isScrolling
							? "Scrolling"
							: `Row ${it.rowIndex} - Col ${it.columnIndex}`} -->
						{/if}
					{/each}
				</Grid>
			</SortingFiles>
		</ComputeLayout>
	{/await}
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
		gap: 5px;
		/* min-width: '150px'; */
		/* max-width: 50%; */
	}
	/* .b{
		grid-template-columns: repeat(1, minmax(0, 1fr));
	} */
</style>

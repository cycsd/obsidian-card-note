<script lang="ts">
	import {
		MarkdownRenderer,
		SearchComponent,
		SliderComponent,
		prepareFuzzySearch,
		type TFile,
		debounce,
		prepareSimpleSearch,
		setIcon,
		Menu,
		ButtonComponent,
	} from "obsidian";
	import { onMount } from "svelte";
	import {
		FixedSizeGrid as Grid,
		styleString as sty,
		type GridChildComponentProps,
		type StyleObject,
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

	export let view: CardSearchView;
	//export let renderMethod:()=>(node:HTMLElement,file:TFile,content:string)=>void

	let columnWidth = 250;
	let rowHeight = 250;
	const gutter = 20;

	let originFiles: TFileContainer[] = [];
	let matchFiles: FileMatch[] = [];
	let query = "";
	let sortMethod = sortByModifiedTime;
	let seq: SEQ = descending;
	const sortbyCreate = sortByCreateTime;

	$: files = getDisplayFiles(view, originFiles, query, sortMethod, seq); //query.length === 0 ? [...originFiles] : [...matchFiles];
	//$: totalCount = files.length;

	let rowCount: number;
	onMount(() => {
		originFiles = view.app.vault
			.getMarkdownFiles()
			.map((file) => ({ file }));
	});
	const fuzzySearch = async (searchQuery: string) => {
		if (searchQuery.length !== 0) {
			//const fuzzy = prepareFuzzySearch(searchQuery),
			const fuzzy = prepareSimpleSearch(searchQuery),
				searching = async (
					cont: TFileContainer,
				): Promise<FileMatch | undefined> => {
					const content = await view.app.vault.cachedRead(cont.file),
						result = fuzzy(content);
					if (result) {
						return {
							file: cont.file,
							content,
							matchResult: result,
						};
					}
				},
				finds = (await Promise.all(originFiles.map(searching))).filter(
					(file) => file !== undefined,
				) as FileMatch[];
			matchFiles = finds;
		}
		query = searchQuery;
	};
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
	const showLayoutMenu = (e: MouseEvent) => {
		const menu = new Menu();
		// const columneSetting = document.createDiv();

		console.log("menu", menu);
		menu.setUseNativeMenu(true);
		menu.addItem((item) => {
			item.setTitle("item menu");
			item;
			// item.setDisabled(false)
			console.log("item: ", item);
			new SliderComponent(item.dom.createEl("button"))
				.setLimits(200, 1000, 10)
				.setDynamicTooltip()
				.onChange((value) => {
					columnWidth = value;
				});
		});
		menu.dom.createDiv();
		menu.showAtMouseEvent(e);
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
	const openFile = (file: TFile) => {
		console.log("open file", file);
		view.app.workspace.getLeaf("tab").openFile(file, {
			active: true,
		});
	};

	let grid: unknown;
</script>

<div use:search></div>
<div class="searchMenuBar">
	<div>
		{#await files}
			...
		{:then f}
			{f.length} results
		{/await}
	</div>
	<div class="buttonBar">
		<div>
			<div use:columnWidthSetting>column width</div>
			<div use:rowHeightSetting>row height</div>
		</div>
		<button use:layoutSetting on:click={showLayoutMenu}></button>
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
	{#await files}
		Searching...
	{:then f}
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
			<!-- <div>grid rows: {gridProps.rows}</div> -->
			<Grid
				bind:this={grid}
				columnCount={gridProps.columns}
				columnWidth={columnWidth + gutter}
				height={childHeight ?? 500}
				rowCount={gridProps.rows}
				rowHeight={rowHeight + gutter}
				width={childWidth ?? 500}
				useIsScrolling
				let:items
			>
				{#each items as it}
					<!-- {it.isScrolling ? 'Scrolling' : `Row ${it.rowIndex} - Col ${it.columnIndex}`} -->

					{#if index(it, gridProps.columns, f.length) !== null}
						<PrepareLoad
							{view}
							source={f[
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
		</ComputeLayout>
	{/await}
</AutoSizer>

<style>
	.searchMenuBar,
	.buttonBar {
		display: flex;
		align-items: end;
	}
	.searchMenuBar {
		justify-content: space-between;
	}
	.buttonBar {
		align-items: center;
		justify-content: space-evenly;
	}
</style>

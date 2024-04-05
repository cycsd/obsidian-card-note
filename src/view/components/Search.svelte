<script lang="ts" context="module">

</script>

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

	export let view: CardSearchView;
	//export let renderMethod:()=>(node:HTMLElement,file:TFile,content:string)=>void

	let columnWidth = 250;
	let rowHeight = 250;
	const gap = 20;

	let originFiles: TFileContainer[] = [];
	let matchFiles: FileMatch[] = [];
	let query = "";

	$: files = query.length === 0 ? [...originFiles] : [...matchFiles];
	$: totalCount = files.length;

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
		new SearchComponent(ele).onChange(debounce(fuzzySearch, 1000));
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
	const icon = (ele:HTMLElement,icon:string)=>{
		new ButtonComponent(ele)
		.setIcon(icon)
		// .setCta()
		.setTooltip('asc')
//.setDisabled(true)
		
		// setIcon(ele,icon);
	}

	const index = (com: GridChildComponentProps, columnCount: number) => {
		const dataBefore = com.rowIndex * columnCount,
			columOffest = com.columnIndex + 1,
			dataCount = dataBefore + columOffest;
		//console.log("row:", com.rowIndex, "column:", com.columnIndex, "data index", dataCount, 'files lenght', files.length)
		return dataCount <= files.length ? dataCount - 1 : null;
	};

	const computeGapStyle = (
		style: StyleObject,
		component: GridChildComponentProps,
	): StyleObject => {
		const top = (style.top ?? 0) + gap,
			left = (style.left ?? 0) + gap,
			width =
				typeof style.width === "number"
					? style.width - gap
					: style.width,
			height =
				typeof style.height === "number"
					? style.height - gap
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
	<div>{totalCount} results</div>
	<div class="buttonBar">
		<div>
			<div use:columnWidthSetting>column width</div>
			<div use:rowHeightSetting>row height</div>
		</div>	
		<button use:layoutSetting on:click={showLayoutMenu}></button>
		<div use:icon={"clock"}></div>
		<div use:icon={"file-search"}></div>
		<div use:icon={"arrow-down-narrow-wide"}></div>
		<div use:icon={"arrow-up-narrow-wide"}></div>
	</div>
</div>
<!-- <div>query: {query}</div>
<div>show total count in search {totalCount}</div> -->
<AutoSizer let:width={childWidth} let:height={childHeight}>
	<!-- <p on:click={e=>{console.log(grid)}}>width:{childWidth} height:{childHeight}</p> -->
	<ComputeLayout
		viewHeight={childHeight ?? 1000}
		viewWidth={childWidth ?? 1000}
		{columnWidth}
		{gap}
		{totalCount}
		let:gridProps
	>
		<!-- <div>grid rows: {gridProps.rows}</div> -->
		<Grid
			bind:this={grid}
			columnCount={gridProps.columns}
			columnWidth={columnWidth + gap}
			height={childHeight ?? 500}
			rowCount={gridProps.rows}
			rowHeight={rowHeight + gap}
			width={childWidth ?? 500}
			useIsScrolling
			let:items
		>
			{#each items as it}
				<!-- {it.isScrolling ? 'Scrolling' : `Row ${it.rowIndex} - Col ${it.columnIndex}`} -->

				{#if index(it, gridProps.columns) !== null}
					<PrepareLoad
						{view}
						source={files[index(it, gridProps.columns) ?? 0]}
						let:item
					>
						<DisplayCard
							file={item.file}
							{view}
							cellStyle={computeGapStyle(it.style, it)}
							onOpenFile={openFile}
							data={item.data}
						></DisplayCard>
					</PrepareLoad>
				{:else}
					{it.isScrolling
						? "Scrolling"
						: `Row ${it.rowIndex} - Col ${it.columnIndex}`}
				{/if}
			{/each}
		</Grid>
	</ComputeLayout>
</AutoSizer>

<style>
	.searchMenuBar, .buttonBar{
		display:flex;
		align-items:end;
	}
	.searchMenuBar {
		justify-content: space-between;
	}
	.buttonBar {
		align-items: center;
		justify-content: space-evenly;
	}
</style>

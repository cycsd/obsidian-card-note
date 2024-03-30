<script lang="ts">
	import { MarkdownRenderer, SliderComponent, type TFile } from "obsidian";
	import { onMount } from "svelte";
    import { FixedSizeGrid as Grid, styleString as sty, type GridChildComponentProps, type StyleObject } from 'svelte-window'
    import AutoSizer from 'svelte-virtualized-auto-sizer'
	import DisplayCard from "./DisplayCard.svelte";
	import type { CardSearchView } from "../cardSearchView";
	import ComputeLayout from "./ComputeLayout.svelte";

    export let view:CardSearchView
    //export let renderMethod:()=>(node:HTMLElement,file:TFile,content:string)=>void
    
    let columnWidth = 250;
    let rowHeight = 250;
    const gap = 20;

    let files:TFile[];
    let detailContent:string;
    let detailPlane:HTMLElement;
    let rowCount:number;
    onMount(()=>{
        files = view.app.vault.getMarkdownFiles();
    })
    const columnWidthSetting =(ele:HTMLElement)=>{
        new SliderComponent(ele)
        .setLimits(200,1000,10)
        .setDynamicTooltip()
        .onChange(value=>{
            columnWidth = value;
        }
        )
    }
    const rowHeightSetting = (ele:HTMLElement)=>{
        new SliderComponent(ele)
        .setLimits(200,1000,10)
        .setDynamicTooltip()
        .onChange(value=>{
            rowHeight = value;
        }
        )
    }
    const index = (com:GridChildComponentProps,columnCount:number)=>{
        const dataBefore = com.rowIndex*columnCount,
        columOffest = com.columnIndex+1,
        dataCount = dataBefore+columOffest;
        // console.log("row:",com.rowIndex,"column:",com.columnIndex,"data index",dataCount)
        return dataCount<files.length?dataCount:null
    }
    const showDetail = async (content:string,file:TFile,width:number|undefined)=>{
        detailContent = content;
        detailPlane.style.width = `${width??250}px`
        await MarkdownRenderer.render(
            view.app,
            content,
            detailPlane,
            file.path,
            view
        )
    }
    const computeGapStyle = (style:StyleObject,component:GridChildComponentProps):StyleObject=>{
    const rows = component.rowIndex,
    columns = component.columnIndex,
    top = (style.top??0) + gap,
    left = (style.left??0)+gap,
    width = typeof style.width === "number"?style.width -gap:style.width,
    height = typeof style.height === "number"?style.height-gap:style.height;


return {
    ...style,
    top,
    left,
    width,
    height,
}

    }

    let grid:unknown;
    
</script>

<div use:columnWidthSetting> column width</div>
<div use:rowHeightSetting> row height</div>
    <AutoSizer let:width={childWidth} let:height={childHeight}>
         <!-- <p on:click={e=>{console.log(grid)}}>width:{childWidth} height:{childHeight}</p> -->
         <div bind:this={detailPlane} style:position='fixed'></div>
         <ComputeLayout
         viewHeight={childHeight??1000} 
         viewWidth={childWidth??1000} 
         {columnWidth} 
         {gap}
         totalCount={files.length-1}
         let:gridProps>
<Grid
  bind:this={grid}
  columnCount={gridProps.columns}
  columnWidth={columnWidth+gap}
  height={childHeight??500}
  rowCount={gridProps.rows}
  rowHeight={rowHeight+gap}
  width={childWidth??500}
  useIsScrolling
  let:items>
  {#each items as it (it.key)}
      <!-- {it.isScrolling ? 'Scrolling' : `Row ${it.rowIndex} - Col ${it.columnIndex}`} -->
      {#if index(it,gridProps.columns)}
      <DisplayCard 
      file={files[index(it,gridProps.columns)??0]} 
      {view} 
      cellStyle={computeGapStyle(it.style,it)}
      onShowDetail={(c,f)=>showDetail(c,f,childWidth)}></DisplayCard>
      {:else}
      {it.isScrolling ? 'Scrolling' : `Row ${it.rowIndex} - Col ${it.columnIndex}`}
      {/if}
  {/each}
</Grid>
</ComputeLayout>
</AutoSizer>





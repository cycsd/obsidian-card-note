<script lang="ts">
	import type CardNote from "main";
	import { MarkdownRenderer, TFile } from "obsidian";
	import { onMount } from "svelte";
	import type { CardSearchView } from "../cardSearchView";
	import type {  StyleObject } from "svelte-window";
    import {styleString as sty} from "svelte-window"


    export let file:TFile;
    export let view:CardSearchView;
    export let cellStyle:StyleObject;
    export let onShowDetail:(cont:string,f:TFile)=>void;
    let contentEl:HTMLElement;
    let content:string
    let showScroll = false;

    onMount(async()=>{
         content =await view.app.vault.cachedRead(file);
            MarkdownRenderer.render(
            view.app,
            content,
            contentEl,
            file.path,
            view,
        )
    })
    
</script>
    <div style={sty(cellStyle)} class={showScroll?"showScroll":"hiddenContent"} draggable="true">
<h2>{file.basename}</h2>
<div bind:this={contentEl} 
on:click={e=>{onShowDetail(content,file)}} 
on:mouseenter={e=>showScroll=true} 
on:mouseleave={e=>showScroll=false}>
</div>
</div>

<style>
    .showScroll, .hiddenContent{
        border: 1px solid white;
        border-radius: 15px;
        padding: 10px;
    }
    .hiddenContent{
        overflow: hidden;
    }
    .showScroll{
        overflow: scroll;
    }
</style>
<script lang="ts">
	import type CardNote from "main";
	import { MarkdownRenderer, TFile, setIcon } from "obsidian";
	import { onMount } from "svelte";
	import type { CardSearchView } from "../cardSearchView";
	import type {  StyleObject } from "svelte-window";
    import {styleString as sty} from "svelte-window"
	import { isObsidianCanvasView } from "src/adapters/obsidian";


    export let file:TFile;
    export let view:CardSearchView;
    export let cellStyle:StyleObject;
    export let onShowDetail:(cont:string,f:TFile)=>void;
    let contentEl:HTMLElement;
    let content:string
    let showScroll = false;

    let listener:{
        reset:()=>void
    };
    let dragSymbol:HTMLElement;
    const dragCard = (dragStart:DragEvent)=>{
        const createFileInView = (drop:DragEvent)=>{
            const drawView = view.plugin.getDropView(drop);
            console.log("drawView:",drawView,"isObsidian:",isObsidianCanvasView(drawView));
            if(isObsidianCanvasView(drawView)){
                console.log("draw the file",file)
                const pos = drawView.canvas.posFromEvt(drop);
                drawView.canvas.createFileNode({
                    file,
                    pos,
                    save:true,
                })
            }
        }
        // the default drag img will drag sibling elements...
        // const canvas = new HTMLCanvasElement(),
        // ctx = canvas.getContext('2d');
        const img = new Image();
        setIcon(img,'file-text')
         //img.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtdGV4dCI+PHBhdGggZD0iTTE1IDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY3WiIvPjxwYXRoIGQ9Ik0xNCAydjRhMiAyIDAgMCAwIDIgMmg0Ii8+PHBhdGggZD0iTTEwIDlIOCIvPjxwYXRoIGQ9Ik0xNiAxM0g4Ii8+PHBhdGggZD0iTTE2IDE3SDgiLz48L3N2Zz4="
         //img.TEXT_NODE =
         //img.textContent = file.path;
        img.onload = ((e:Event)=>{
            console.log("src",img)
            // ctx?.drawImage(img,0,0);
        })
        dragSymbol = view.containerEl.createDiv();
        const icon = dragSymbol.createDiv(),
        filInfoEl = dragSymbol.createSpan();
        icon.style.display="inline-block"
        setIcon(icon,'file-text');
        filInfoEl.textContent = " "+file.path;
        dragSymbol.setCssStyles({
            position:'absolute',
            transform:'translate(-1000px,-1000px)',
        })
        console.log(dragSymbol);
        // dragSymbol.textContent = file.path;
        // detailDiv.hidden=true;
        // setIcon(detailDiv,'file-text');
        dragStart.dataTransfer?.setDragImage(dragSymbol,0,30);
        setTimeout(() => {
             listener = view.plugin.listenDragAndDrop(dragStart,content,createFileInView)
        });
    }
    const reset = (dragEnd:DragEvent)=>{
        listener.reset()
        view.containerEl.removeChild(dragSymbol);
    }
    onMount(async()=>{``
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
    <div 
    on:dragstart={dragCard} 
    on:dragend={reset}
    style={sty(cellStyle)} class={showScroll?"showScroll":"hiddenContent"} draggable="true">
<h2>{file.basename}</h2>
<div bind:this={contentEl} 
on:click={e=>{onShowDetail(content,file)}} 
on:mouseenter={e=>showScroll=true} 
on:mouseleave={e=>showScroll=false}>
</div>
</div>

<style>
    .showScroll, .hiddenContent{
        border: 2px solid;
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
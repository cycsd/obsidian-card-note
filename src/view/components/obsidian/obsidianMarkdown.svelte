<script lang="ts">
	import { MarkdownRenderer, type App, type Component } from "obsidian";
	import { ObsidianMarkdownRender } from "src/file";
	import { onMount } from "svelte";


export let app:App;
export let component:Component;
export let markdown:string;
export let sourcePath:string;
// let container : HTMLDivElement;
onMount(()=>{
    // console.log("on mount",sourcePath,"mark",markdown)
    // console.log("div",container)
    // MarkdownRenderer.render(
    //     app,
    //     markdown,
    //     container,
    //     sourcePath,
    //     component
    // )
    // return ()=>{
    //     console.log("destroy div",container,"source",sourcePath)
    // }
})
</script>

<div use:ObsidianMarkdownRender={{
    app,
    markdown,
    sourcePath,
    component,
}} 
>
<!-- style="display: none;" -->
</div>


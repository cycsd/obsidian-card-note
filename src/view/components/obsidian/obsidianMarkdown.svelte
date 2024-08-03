<script lang="ts">
	import { type App, type Component } from "obsidian";
	import { ObsidianMarkdownRender } from "src/file";


export let app:App;
export let component:Component;
export let markdown:string;
export let sourcePath:string;
</script>

<div use:ObsidianMarkdownRender={{
    app,
    markdown,
    sourcePath,
    component,
}} 
>
</div>


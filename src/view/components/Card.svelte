<script lang="ts">
	import type { App, Component } from "obsidian";
	import type { FileMatch } from "src/file.ts";
	import { writable } from "svelte/store";
	import { onMount } from "svelte";
	import ObsidianMarkdown from "./obsidian/obsidianMarkdown.svelte";
	import { styleString, type StyleObject } from "svelte-window";

	export let app: App;
	export let component: Component;
	export let fileMatch: FileMatch;
	export let cellStyle: StyleObject;

	let contents: string[] = [];
	let loaded = false;
	let onHover = false;
	const setContent = () => {
		const getContent = fileMatch.content
			? Promise.resolve(fileMatch.content)
			: // :Promise.resolve(fileMatch.file.name+"content")
				app.vault.cachedRead(fileMatch.file);

		getContent.then((cont) => {
			// console.log("note:",fileMatch,"content",cont);
			contents = [cont];
			return [cont];
		});
		// $contents = fileMatch.content ?? "";
	};
	onMount(() => {
		// console.log("create new",fileMatch)
		setContent();
		loaded = true;
	});
</script>

<div
	on:mouseenter={(e) => (onHover = true)}
	on:mouseleave={(e) => (onHover = false)}
	class={onHover ? "fullContent" : "fewContent"}
	style={styleString(cellStyle)}
	draggable={true}
>
	<h2>{fileMatch.file.basename}</h2>
	{#if fileMatch.file.parent && fileMatch.file.parent.path !== "/"}
		<strong>{fileMatch.file.parent?.path}</strong>
	{/if}

	{#each contents as cont}
		<ObsidianMarkdown
			{app}
			{component}
			sourcePath={fileMatch.file.path}
			markdown={cont}
		></ObsidianMarkdown>
	{/each}
</div>

<style>
	.fullContent,
	.fewContent {
		border: 2px solid;
		border-radius: 15px;
		padding: 10px;
	}
	.fewContent {
		overflow: hidden;
	}
	.fullContent {
		overflow: scroll;
	}
</style>

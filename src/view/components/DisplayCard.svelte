<script lang="ts" context="module">
	export type NoteMatchCache = {
		section: SectionCache;
		matchResult?: SearchResult;
	};
	export type NoteContent = {
		content: string;
		matchCache?: NoteMatchCache[];
	};
</script>

<script lang="ts">
	import type CardNote from "main";
	import {
		MarkdownRenderer,
		TFile,
		renderMatches,
		setIcon,
		type SectionCache,
		renderResults,
		type SearchResult,
		type CacheItem,
	} from "obsidian";
	import { afterUpdate, onMount } from "svelte";
	import type { CardSearchView } from "../cardSearchView";
	import type { GridChildComponentProps, StyleObject } from "svelte-window";
	import { styleString as sty } from "svelte-window";
	import { isObsidianCanvasView } from "src/adapters/obsidian";
	import { getCacheOffset, markdownParser } from "src/utility";

	export let file: TFile;
	export let view: CardSearchView;
	export let cellStyle: StyleObject;
	export let onOpenFile: (f: TFile) => void;
	export let data: Promise<NoteContent>;
	// export let noteCaches: NoteMatchCache[];
	//export let testProps:GridChildComponentProps;
	//export let index:number|null;
	//let contentEl:HTMLElement;
	let showScroll = false;

	let listener: {
		reset: () => void;
	};
	let dragSymbol: HTMLElement;
	const dragCard = (dragStart: DragEvent) => {
		const createFileInView = (drop: DragEvent) => {
			const drawView = view.plugin.getDropView(drop);

			if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(drop);
				drawView.canvas.createFileNode({
					file,
					pos,
					save: true,
				});
			}
		};
		// the default drag img will drag sibling elements...
		// const canvas = new HTMLCanvasElement(),
		// ctx = canvas.getContext('2d');
		const img = new Image();
		setIcon(img, "file-text");
		//img.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtdGV4dCI+PHBhdGggZD0iTTE1IDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY3WiIvPjxwYXRoIGQ9Ik0xNCAydjRhMiAyIDAgMCAwIDIgMmg0Ii8+PHBhdGggZD0iTTEwIDlIOCIvPjxwYXRoIGQ9Ik0xNiAxM0g4Ii8+PHBhdGggZD0iTTE2IDE3SDgiLz48L3N2Zz4="
		//img.TEXT_NODE =
		//img.textContent = file.path;
		img.onload = (e: Event) => {
			console.log("src", img);
			// ctx?.drawImage(img,0,0);
		};
		dragSymbol = view.containerEl.createDiv();
		const icon = dragSymbol.createDiv(),
			filInfoEl = dragSymbol.createSpan();
		icon.style.display = "inline-block";
		setIcon(icon, "file-text");
		filInfoEl.textContent = " " + file.path;
		dragSymbol.setCssStyles({
			position: "absolute",
			transform: "translate(-1000px,-1000px)",
		});
		// console.log(dragSymbol);
		// dragSymbol.textContent = file.path;
		// detailDiv.hidden=true;
		// setIcon(detailDiv,'file-text');
		dragStart.dataTransfer?.setDragImage(dragSymbol, 0, 30);
		setTimeout(async () => {
			listener = view.plugin.listenDragAndDrop(
				dragStart,
				(await data).content,
				createFileInView,
			);
		});
	};
	const reset = (dragEnd: DragEvent) => {
		listener.reset();
		view.containerEl.removeChild(dragSymbol);
	};
	// const loading = async ()=>{
	//      console.log("mount file: ",file)
	//      content =await view.app.vault.cachedRead(file);
	//         MarkdownRenderer.render(
	//         view.app,
	//         content,
	//         contentEl,
	//         file.path,
	//         view,
	//     )
	// }
	// loading();
	const parseMatchContent = (
		content: string,
		section: CacheItem,
		sr: SearchResult | undefined,
	) => {
		const [sectionStart, sectionEnd] = getCacheOffset(section),
			originContent = content.substring(sectionStart, sectionEnd);
		if (sr === undefined) {
			return originContent;
		}
		const offset = sectionStart;
		let newContent = "";
		let prevEnd = 0;
		// console.log("file: ", source.file, "matches: ", match.matchResult);
		sr.matches.forEach((m) => {
			const [startOffset, endOffset] = m;
			const [start, end] = [startOffset - offset, endOffset - offset];
			const fragment = originContent.substring(prevEnd, start),
				cut = originContent.substring(start, end),
				hightlight = `==${cut}==`;

			console.log("match cut: ", cut);
			newContent += fragment + hightlight;
			prevEnd = end;
		});
		const residue = originContent.substring(prevEnd);
		// //console.log('new content:',newContent+residue)
		return newContent + residue;
	};
	const loading = (ele: HTMLElement, da: NoteContent) => {
		console.log("use: ", file);
		if (da.matchCache && da.matchCache.length !== 0) {
			//renderMatches(ele,cont,[[20,30]],-10)
			//renderResults(ele,cont,{score:5,matches:[[20,30]]})
			//const cache = view.app.metadataCache.getFileCache(file);
			da.matchCache?.forEach(async (noteChache) => {
				const container = ele.createDiv(),
					section = noteChache.section,
					sr = noteChache.matchResult; // new DocumentFragment();
				//const sectionContainer = document.createDiv(),
				const renderContent = parseMatchContent(
					da.content,
					section,
					sr,
				);

				MarkdownRenderer.render(
					view.app,
					renderContent,
					container,
					file.path,
					view,
				);

				// container.appendChild(sectionContainer);
			});
		} else {
			MarkdownRenderer.render(view.app, da.content, ele, file.path, view);
		}
	};
	// onMount(()=>{
	//     console.log("mount file: ",file)
	//      view.app.vault.cachedRead(file)
	//      .then(content=>{
	//         MarkdownRenderer.render(
	//         view.app,
	//         content,
	//         contentEl,
	//         file.path,
	//         view,
	//     )
	//      });

	//    return ()=>{contentEl.replaceChildren();}
	// })

	// $:{
	//     //console.log("update file: in card",file)
	//     view.app.vault.cachedRead(file)
	//     .then(content=>{
	//         if(contentEl !== null || contentEl !== undefined){
	//             contentEl.replaceChildren();
	//             MarkdownRenderer.render(
	//                 view.app,
	//                 content,
	//                 contentEl,
	//                 file.path,
	//                 view,
	//                 )
	//             }
	//     })
	// }

	// afterUpdate(async()=>{
	//     console.log("update file: ",file)
	//      content =await view.app.vault.cachedRead(file);
	//         MarkdownRenderer.render(
	//         view.app,
	//         content,
	//         contentEl,
	//         file.path,
	//         view,
	//     )
	// })
</script>

<div
	on:dragstart={dragCard}
	on:dragend={reset}
	on:click={(e) => onOpenFile(file)}
	style={sty(cellStyle)}
	class={showScroll ? "showScroll" : "hiddenContent"}
	draggable="true"
>
	<h2>{file.basename}</h2>
	<!-- <h6>{`Row ${testProps.rowIndex} - Col ${testProps.columnIndex}`} : {index}</h6> -->
	{#await data}
		<div>loading...</div>
	{:then cont}
		<div
			use:loading={cont}
			on:mouseenter={(e) => (showScroll = true)}
			on:mouseleave={(e) => (showScroll = false)}
		></div>
	{/await}
</div>

<style>
	.showScroll,
	.hiddenContent {
		border: 2px solid;
		border-radius: 15px;
		padding: 10px;
	}
	.hiddenContent {
		overflow: hidden;
	}
	.showScroll {
		overflow: scroll;
	}
</style>

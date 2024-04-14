<script lang="ts" context="module">
	export type MatchWithType = {
		match: SearchMatchPart;
		type?: "embeds";
	};
	export type SearchResultWithType = Omit<SearchResult, "matches"> & {
		matches: MatchWithType[];
	};
	export type NoteMatchCache = {
		section: SectionCache;
		matchResult?: SearchResultWithType;
	};
	export type NoteContent = {
		content: string;
		matchCache?: NoteMatchCache[];
	};
</script>

<script lang="ts">
	import {
		MarkdownRenderer,
		TFile,
		setIcon,
		type SectionCache,
		renderResults,
		type SearchResult,
		type CacheItem,
		Menu,
		type SearchMatchPart,
	} from "obsidian";
	import type { CardSearchView } from "../cardSearchView";
	import type { StyleObject } from "svelte-window";
	import { styleString as sty } from "svelte-window";
	import { isObsidianCanvasView } from "src/adapters/obsidian";
	import { getCacheOffset } from "src/utility";
	import {
		insertEmbeddableOnDrawing,
		isExcalidrawView,
	} from "src/adapters/obsidian-excalidraw-plugin";
	
	export let file: TFile;
	export let view: CardSearchView;
	export let cellStyle: StyleObject;
	export let data: Promise<NoteContent>;

	let onHover = false;

	let listener: {
		reset: () => void;
	};
	let dragSymbol: HTMLElement;
	const moveFileToTrashFolder = (e: MouseEvent) => {
		const mn = new Menu().addItem((item) => {
			item.setIcon("trash-2")
				.setTitle("delete file")
				.onClick((c) => {
					view.app.vault.trash(file, false);
				});
		});
		mn.showAtMouseEvent(e);
	};
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
			if (isExcalidrawView(drawView)) {
				const link = view.app.fileManager.generateMarkdownLink(
					file,
					drawView.file?.path ?? "",
				);
				insertEmbeddableOnDrawing(
					drop,
					drawView,
					link,
					file,
					view.plugin,
				);
			}
		};
		// the default drag img will drag sibling elements...
		const img = new Image();
		setIcon(img, "file-text");
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

	const getContent = (
		content: string,
		section: CacheItem,
	): [string, number, number] => {
		const [sectionStart, sectionEnd] = getCacheOffset(section);
		return [
			content.substring(sectionStart, sectionEnd),
			sectionStart,
			sectionEnd,
		];
	};
	const parseMatchContent = (
		content: string,
		section: CacheItem,
		sr: SearchResultWithType | undefined,
	) => {
		const [originContent, sectionStart, sectionEnd] = getContent(
			content,
			section,
		);
		if (sr === undefined) {
			return originContent;
		}
		const offset = sectionStart;
		let newContent = "";
		let prevEnd = 0;

		sr.matches.forEach((m) => {
			const [startOffset, endOffset] = m.match;
			const [start, end] = [startOffset - offset, endOffset - offset];
			//對應的段落因為有對 embededs, links 作延伸,故可能有重複
			if (start >= prevEnd) {
				const fragment = originContent.substring(prevEnd, start),
					cut = originContent.substring(start, end),
					highlight = (origin: string) => `==${origin}==`;

				const append =
					m.type === "embeds"
						? fragment + highlight(cut.substring(1)) + cut //highlight without symbol '!'
						: fragment + highlight(cut);

				newContent += append;
				prevEnd = end;
			}
		});
		const residue = originContent.substring(prevEnd);
		return newContent + residue;
	};
	const loading = (ele: HTMLElement, da: NoteContent) => {
		if (da.matchCache && da.matchCache.length !== 0) {
			da.matchCache?.forEach(async (noteChache) => {
				const container = ele.createDiv(),
					section = noteChache.section,
					sr = noteChache.matchResult; 
				if (sr) {
					const openFileOnMatch = async (e: MouseEvent) => {
						if (e.target instanceof HTMLAnchorElement) {
							//do nothing
							//handle by container
						} else {
							view.plugin.onClickOpenFile(e, file, {
								eState: {
									match: {
										content: (await data).content,
										matches: sr.matches.map(m=>m.match),
									},
								},
							});
							e.stopPropagation();
						}
					};
					container.onclick = openFileOnMatch;
					if (section.type === "code") {
						const [renderContent, sectionStart] = getContent(
							da.content,
							section,
						);
						renderResults(
							container,
							renderContent,
							{
								score: sr.score,
								matches: sr.matches.map((m) => m.match),
							},
							-sectionStart,
						);
						return;
					}
				}
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
			});
		} else {
			MarkdownRenderer.render(view.app, da.content, ele, file.path, view);
		}
	};
	const onOpenFile = (e: MouseEvent) => {
		const target = e.target;
		if (target instanceof HTMLAnchorElement) {
			if (target.classList.contains("internal-link")) {
				const linktext = target.getAttribute("data-href");
				if (linktext) {
					view.app.workspace.openLinkText(linktext, file.path);
				}
			}
			//have nothing to do
			//do the HtmlAnchor default action
			return;
		} else {
			view.plugin.onClickOpenFile(e, file);
		}
	};
</script>

<div
	on:dragstart={dragCard}
	on:dragend={reset}
	on:click={onOpenFile}
	on:contextmenu={moveFileToTrashFolder}
	on:mouseenter={(e) => (onHover = true)}
	on:mouseleave={(e) => (onHover = false)}
	style={sty(cellStyle)}
	class={onHover ? "showScroll" : "hiddenContent"}
	draggable="true"
>
	{#if onHover && file.parent && file.parent.path !== "/"}
		<h2>{`${file.parent.path}/${file.basename}`}</h2>
	{:else}
		<h2>{file.basename}</h2>
	{/if}
	{#await data}
		<div>loading...</div>
	{:then cont}
		<div use:loading={cont}></div>
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

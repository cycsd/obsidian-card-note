<script lang="ts" context="module">
	export type SectionContent = {
		content: string;
		matches?: SearchMatches;
		cache?: SectionCache;
		offset?: number;
	};
	const extendMatchRange = (
		result?: SearchResult,
		cache?: CachedMetadata | null,
	) => {
		return (
			result?.matches.map((match) => {
				const matchInternalLink =
					cache?.embeds?.map(getCacheOffset).find(Touch(match)) ??
					cache?.links?.map(getCacheOffset).find(Touch(match));
				return matchInternalLink
					? ([
							Math.min(matchInternalLink[0], match[0]),
							Math.max(matchInternalLink[1], match[1]),
						] as SearchMatchPart)
					: match;
			}) ?? []
		);
	};
</script>

<script lang="ts">
	import {
		Menu,
		setIcon,
		type CachedMetadata,
		type Component,
		type SearchMatches,
		type SearchMatchPart,
		type SearchResult,
		type SectionCache,
	} from "obsidian";
	import { onMount } from "svelte";
	import ObsidianMarkdown from "./obsidian/obsidianMarkdown.svelte";
	import { styleString, type StyleObject } from "svelte-window";
	import { getCacheOffset } from "src/utility";
	import {
		validCacheReadFilesExtension,
		Touch,
		type FileMatch,
		InRange,
		SectionCacheType,
	} from "src/file";
	import { curryRight, take, uniqWith } from "lodash";
	import type { CardSearchView } from "../cardSearchView";
	import { isObsidianCanvasView } from "src/adapters/obsidian";
	import {
		insertEmbeddableOnDrawing,
		isExcalidrawView,
	} from "src/adapters/obsidian-excalidraw-plugin";

	export let view: CardSearchView;
	export let component: Component;
	export let files: FileMatch[];
	export let index: number;
	export let cellStyle: StyleObject;
	let fileMatch: FileMatch = files[index];
	let app = view.app;
	let data: string | undefined;
	let contents: SectionContent[] = [];
	let onHover = false;
	let showContentCounts = 3;
	let listener: {
		reset: () => void;
	};
	let dragSymbol: HTMLElement;
	const moveFileToTrashFolder = (e: MouseEvent) => {
		const mn = new Menu().addItem((item) => {
			item.setIcon("trash-2")
				.setTitle("delete file")
				.onClick((c) => {
					view.app.vault.trash(fileMatch.file, false);
				});
		});
		mn.showAtMouseEvent(e);
	};

	const parsing = (data?: string) => {
		if (data) {
			const cache = app.metadataCache.getFileCache(fileMatch.file);
			const matches = uniqWith(
				extendMatchRange(fileMatch.match, cache),
				(a, b) => Touch(a)(b),
			);
			return cache?.sections?.map((section) => {
				const sectionPostion = getCacheOffset(section);
				const [start, end] = sectionPostion;
				const matchInSection = matches.filter(InRange(sectionPostion));
				const sectionContent = data.substring(start, end);
				const offset = start;
				if (section.type === SectionCacheType.code) {
					return {
						content: sectionContent,
						matches: matchInSection,
						cache: section,
						offset,
					};
				}
				const highlightParsing: [string, number] =
					matchInSection.reduce(
						(prev, match) => {
							const [prevContent, prevEnd] = prev;
							const [matchStart, matchEnd] = [
								match[0] - offset,
								match[1] - offset,
							];
							const prevSection = sectionContent.substring(
								prevEnd,
								matchStart,
							);
							const highlightMatch = `==${sectionContent.substring(matchStart, matchEnd)}==`;

							return [
								prevContent + prevSection + highlightMatch,
								matchEnd,
							];
						},
						["", 0] as [string, number],
					);
				const [highlightContensts, parseEnd] = highlightParsing;
				return {
					content:
						parseEnd <= end
							? highlightContensts +
								sectionContent.substring(parseEnd, end)
							: highlightContensts,
					matches: matchInSection,
					cache: section,
				};
			});
		}
	};
	const openFileOnMatch = (e: MouseEvent, matches: SearchMatches) => {
		if (e.target instanceof HTMLAnchorElement) {
			//do nothing
			//handle by container
			return;
		}
		if (matches) {
			view.plugin.onClickOpenFile(e, fileMatch.file, {
				eState: {
					match: {
						content: data ?? "",
						matches,
					},
				},
			});
			e.stopPropagation();
		}
	};
	const onOpenFile = (e: MouseEvent) => {
		const target = e.target;
		if (target instanceof HTMLAnchorElement) {
			if (target.classList.contains("internal-link")) {
				const linktext = target.getAttribute("data-href");
				if (linktext) {
					view.app.workspace.openLinkText(
						linktext,
						fileMatch.file.path,
					);
				}
			}
			//have nothing to do
			//do the HtmlAnchor default action
			return;
		} else {
			view.plugin.onClickOpenFile(e, fileMatch.file);
		}
	};
	const setContent = async () => {
		const content = validCacheReadFilesExtension.contains(
			fileMatch.file.extension,
		)
			? fileMatch.content
				? Promise.resolve(fileMatch.content)
				: app.vault.cachedRead(fileMatch.file)
			: Promise.resolve(fileMatch.content);
		data = await content;
		contents = parsing(data) ?? [
			{
				content: app.fileManager.generateMarkdownLink(
					fileMatch.file,
					"",
				),
			},
		];
	};
	const dragCard = (dragStart: DragEvent) => {
		const createFileInView = (drop: DragEvent) => {
			const drawView = view.plugin.getDropView(drop);

			if (isObsidianCanvasView(drawView)) {
				const pos = drawView.canvas.posFromEvt(drop);
				drawView.canvas.createFileNode({
					file: fileMatch.file,
					pos,
					save: true,
				});
			}
			if (isExcalidrawView(drawView)) {
				const link = view.app.fileManager.generateMarkdownLink(
					fileMatch.file,
					drawView.file?.path ?? "",
				);
				insertEmbeddableOnDrawing(
					drop,
					drawView,
					link,
					fileMatch.file,
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
		filInfoEl.textContent = " " + fileMatch.file.path;
		dragSymbol.setCssStyles({
			position: "absolute",
			transform: "translate(-1000px,-1000px)",
		});
		dragStart.dataTransfer?.setDragImage(dragSymbol, 0, 30);
		setTimeout(async () => {
			listener = view.plugin.listenDragAndDrop(
				dragStart,
				data ?? "",
				createFileInView,
			);
		});
	};
	const reset = (dragEnd: DragEvent) => {
		listener.reset();
		view.containerEl.removeChild(dragSymbol);
	};
	onMount(() => {
		setContent();
	});
</script>

<div
	on:mouseenter={(e) => (onHover = true)}
	on:mouseleave={(e) => (onHover = false)}
	on:contextmenu={moveFileToTrashFolder}
	on:dragstart={dragCard}
	on:dragend={reset}
	class={onHover ? "fullContent" : "fewContent"}
	style={styleString(cellStyle)}
	draggable={true}
	on:click={onOpenFile}
>
	{#if fileMatch?.file}
		<h2>{fileMatch.file.basename}</h2>
		<h6 class="nav-file-tag" style:font-size={"12px"}>
			{fileMatch.file.extension !== "md" ? fileMatch.file.extension : ""}
		</h6>
		{#if fileMatch.file.parent && fileMatch.file.parent.path !== "/"}
			<strong>{fileMatch.file.parent?.path}</strong>
		{/if}
	{/if}
	{#each onHover ? contents : take(contents, showContentCounts) as cont, index (index)}
		{#if cont.matches && cont.matches.length !== 0}
			<!-- {#if cont.cache?.type === SectionCacheType.code}
				<div
					use:ObsidianResultRender={{
						text: cont.content,
						result: cont.matches,
						offset: -(cont.offset ?? 0),
					}}
				></div>
			{/if} -->
			<div on:click={curryRight(openFileOnMatch)(cont.matches)}>
				<ObsidianMarkdown
					{app}
					{component}
					sourcePath={fileMatch.file.path}
					markdown={cont.content}
				></ObsidianMarkdown>
			</div>
		{:else}
			<ObsidianMarkdown
				{app}
				{component}
				sourcePath={fileMatch.file.path}
				markdown={cont.content}
			></ObsidianMarkdown>
		{/if}
	{/each}
	{#if contents.length > showContentCounts && !onHover}
		...
	{/if}
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

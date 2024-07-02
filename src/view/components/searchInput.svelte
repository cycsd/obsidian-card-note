<script lang="ts" context="module">
	export type SearchSettings ={
		showSearchDetail: boolean;
		useRegex:boolean,
	}
</script>

<script lang="ts">
	import { debounce, SearchComponent } from "obsidian";
	import {
	obsdianToggleButton as obsidianToggleButton,
		obsidianButton,
		obsidianSearch,
		obsidianText,
		obsidianToggle,
		type useButton,
		type useSearch,
		type useText,
		type useToggle,
	} from "./obsidian/useComponent";
	import { writable, type Writable } from "svelte/store";

	export let query: Writable<string>;
	export let debounceTime = 0;
	export let include = writable("");
	export let exclude = writable("");
	export let settings: Writable<SearchSettings>;

	const bindInput: useSearch = (comp) => {
		comp.onChange(
			debounce((text) => {
				$query = text;
			}, debounceTime),
		);
		// .inputEl.addClass("no-border-search-input")
	};
	const regexButton: useButton = (comp) => {
		$settings.useRegex && comp.setCta();
		comp.setIcon("regex")
			.setTooltip("Use Regular Expression")
			.onClick((e) => {
				const current = $settings;
				if (current.useRegex) {
					comp.removeCta();
				} else {
					comp.setCta();
				}
				$settings.useRegex = !current.useRegex ;
			})
	};
	const showSearchDetail:useButton=(button)=>{
		// $settings.showSearchDetail && button.setCta()
		button.setButtonText("...")
		.setTooltip("Toggle Search Detail")
		.onClick(()=>{
			$settings.showSearchDetail = !$settings.showSearchDetail
		})
	}
	const setTexInputStyle = (inputEl: HTMLInputElement) => {
		inputEl.setCssStyles({ width: "100%" });
	};
	const includeText: useText = (comp) => {
		setTexInputStyle(
			comp.onChange(
				debounce((text) => {
					$include = text;
				}, debounceTime),
			).inputEl,
		);
	};
	const excludeText: useText = (comp) => {
		setTexInputStyle(
			comp.onChange(
				debounce((text) => {
					$exclude = text;
				}, debounceTime),
			).inputEl,
		);
	};
</script>

<div class="searchBar">
	<div use:obsidianSearch={bindInput} style:width="100%"></div>
	<div style:position="absolute" style:inset-inline-end="50px">
		<div use:obsidianToggleButton={{buttonSetting:regexButton,toggle:()=>$settings.useRegex}}></div>
	</div>
</div>
<div use:obsidianToggleButton={{buttonSetting: showSearchDetail,toggle:()=>$settings.showSearchDetail}}></div>
{#if $settings.showSearchDetail}
	<div use:obsidianText={includeText}></div>
	<div use:obsidianText={excludeText}></div>
{/if}

<style>
	.searchBar {
		border-width: 0px;
		display: flex;
		justify-content: space-around;
		outline-width: 1px;
	}
</style>

<script lang="ts" context="module">
	export type SearchSettings = {
		showSearchDetail: boolean;
		useRegex: boolean;
		matchCase: boolean;
	};
</script>

<script lang="ts">
	import { debounce } from "obsidian";
	import {
		obsdianToggleButton as obsidianToggleButton,
		obsidianSearch,
		obsidianText,
		type useButton,
		type useSearch,
		type useText,
	} from "./obsidian/useComponent";
	import { writable, type Writable } from "svelte/store";

	export let query: Writable<string>;
	export let debounceTime = 0;
	export let include = writable("");
	export let exclude = writable("");
	export let settings: Writable<SearchSettings>;

	const bindInput: useSearch = (comp) => {
		comp.setValue($query).onChange(
			debounce((text) => {
				$query = text;
			}, debounceTime),
		);
		// .inputEl.addClass("no-border-search-input")
	};
	const regexButton: useButton = (comp) => {
		comp.setIcon("regex")
			.setTooltip("Use Regular Expression")
			.onClick((e) => {
				$settings.useRegex = !$settings.useRegex;
			});
	};
	const matchCaseButton: useButton = (comp) => {
		comp.setIcon("case-sensitive")
			.setTooltip("Match Case")
			.onClick((e) => {
				$settings.matchCase = !$settings.matchCase;
			});
	};
	const showSearchDetail: useButton = (button) => {
		button
			.setButtonText("...")
			.setTooltip("Toggle Search Detail")
			.onClick(() => {
				$settings.showSearchDetail = !$settings.showSearchDetail;
			});
	};
	const setTexInputStyle = (inputEl: HTMLInputElement) => {
		inputEl.setCssStyles({ width: "100%" });
	};
	const includeText: useText = (comp) => {
		setTexInputStyle(
			comp
				.setValue($include)
				.onChange(
					debounce((text) => {
						$include = text;
					}, debounceTime),
				)
				.setPlaceholder("e.g. .*\\.md").inputEl,
		);
	};
	const excludeText: useText = (comp) => {
		setTexInputStyle(
			comp
				.setValue($exclude)
				.onChange(
					debounce((text) => {
						$exclude = text;
					}, debounceTime),
				)
				.setPlaceholder("e.g. .*\\.png").inputEl,
		);
	};
</script>

<div class="searchBar">
	<div use:obsidianSearch={bindInput} style:width="100%"></div>
	<div
		style:position="absolute"
		style:inset-inline-end="50px"
		style:display="flex"
	>
		<div
			use:obsidianToggleButton={{
				buttonSetting: matchCaseButton,
				toggle: () => $settings.matchCase,
			}}
		></div>
		<div
			use:obsidianToggleButton={{
				buttonSetting: regexButton,
				toggle: () => $settings.useRegex,
			}}
		></div>
	</div>
</div>
<div
	use:obsidianToggleButton={{
		buttonSetting: showSearchDetail,
		toggle: () => $settings.showSearchDetail,
	}}
></div>
{#if $settings.showSearchDetail}
	<div>files to include</div>
	<div use:obsidianText={includeText}></div>
	<div>files to exclude</div>
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

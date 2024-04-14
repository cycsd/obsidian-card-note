<script lang="ts" context="module">
	export type Button<T> = {
		icon: string;
		toolTip: string;
		value: T;
		active?: boolean;
	};
</script>

<script lang="ts" generics="T">
	import { ButtonComponent } from "obsidian";

	export let buttons: Button<T>[] = [];
	export let onclick: (e: MouseEvent, value: T) => void;
	let active = "";
	let unActive = () => {};
	const setUnActiveButton = (butt: ButtonComponent) => {
		unActive = () => {
			butt.removeCta();
		};
	};
	const renderIcon = (el: HTMLElement, but: Button<T>) => {
		const b = new ButtonComponent(el)
			.setIcon(but.icon)
			.setTooltip(but.toolTip)
			.onClick((e) => {
				if (active !== but.icon) {
					b.setCta();
					unActive();
					onclick(e, but.value);
					active = but.icon;
					setUnActiveButton(b);
				}
			});
		if (but.active) {
			b.setCta();
			active = but.icon;
			setUnActiveButton(b);
		}
	};
</script>

{#each buttons as but}
	<div use:renderIcon={but}></div>
{/each}

<script lang="ts">
	import type { GridChildComponentProps } from "svelte-window";

	export let items: GridChildComponentProps[];
	export let columnCount: number;
	const computeIndex = (item: GridChildComponentProps) => {
		const dataBefore = item.rowIndex * columnCount,
			columOffest = item.columnIndex,
			dataIndex = dataBefore + columOffest;
            return dataIndex
	};
</script>
{#each items as prop (computeIndex(prop))}
    <slot item={{gridProps:prop,index:computeIndex(prop)}}></slot>
{/each}

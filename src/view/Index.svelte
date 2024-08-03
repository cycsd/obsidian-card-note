<script lang="ts">
	import type { GridChildComponentProps } from "svelte-window";

	export let items: GridChildComponentProps[];
	export let columnCount: number;
	// export let files:FileMatch[];
	const computeIndex = (item: GridChildComponentProps) => {
		const dataBefore = item.rowIndex * columnCount,
			columOffest = item.columnIndex,
			dataIndex = dataBefore + columOffest;
            return dataIndex
	};
</script>
<!-- {#each items as prop (files[computeIndex(prop)].file.path)} -->
    <slot item={items.map(it=>({...it,index:computeIndex(it)}))}></slot>
<!-- {/each} -->

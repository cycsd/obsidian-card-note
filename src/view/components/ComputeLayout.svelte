<script lang="ts">
	export let viewHeight: number;
	export let viewWidth: number;
	export let columnWidth: number;
	export let gap: number;
	export let totalCount: number;

	let columns: number,
		rows: number,
		residueSpace: number = 0;

	$: {
		const acutualColumnWidth = columnWidth + gap;
		const col = Math.floor(viewWidth / acutualColumnWidth);
		columns = col === 0 ? 1 : col;
		rows = Math.ceil(totalCount / columns);
		residueSpace = (viewWidth - columns * acutualColumnWidth) / 2;
	}

</script>


<slot
	gridProps={{
		columns,
		rows,
		viewHeight,
		padding: residueSpace >= 0 ? residueSpace : 0,
	}}
/>

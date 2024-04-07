<script lang="ts">
	export let viewHeight: number;
	export let viewWidth: number;
	export let columnWidth: number;
	export let gap: number;
	export let totalCount: number;

	let columns: number, rows: number, residueSpace: number=0;

	$: {
		const acutualColumnWidth = columnWidth + gap;
		columns = Math.floor(viewWidth / acutualColumnWidth);
		rows = Math.ceil(totalCount / columns);
		// console.log('compute layout',viewWidth,columns*acutualColumnWidth)

		residueSpace = (viewWidth - columns * acutualColumnWidth) / 2;
		// console.log("reactive columns:", columns,"reactive rows:",rows)
	}
	// $: columns =Math.floor(viewWidth/(columnWidth+gap));
	// $:rows = Math.ceil(totalCount/columns);
	// const gridProps = {
	//     columns:Math.floor(width/columnWidth),

	//     };
</script>

<!-- <div>show totol count in compute:{totalCount}</div> -->
<slot
	gridProps={{
		columns: columns === 0 ? 1 : columns,
		rows,
		viewHeight,
		padding: residueSpace,
	}}
/>

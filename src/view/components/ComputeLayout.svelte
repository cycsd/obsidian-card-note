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
<div>view width {viewWidth} col: {columns} residuw={residueSpace} column width {columnWidth+gap} show totol count in compute:{totalCount}</div>
<slot
	gridProps={{
		columns,
		rows,
		viewHeight,
		padding: residueSpace >= 0 ? residueSpace : 0,
	}}
/>

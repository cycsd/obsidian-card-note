<script lang="ts">
	import { derived, writable} from "svelte/store";

    export let width:number;
    $: colums=width/100;
</script>
<div>width:{width} columsCount:{colums}</div>
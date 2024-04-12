<script lang="ts">
	import type { FileMatch, TFileContainer } from "./PrepareLoad.svelte";
	import { descending, type SEQ, type SortMethod } from "./SearchUtil.svelte";

	export let files: TFileContainer[] | FileMatch[];
	export let sortMethod: SortMethod;
	export let seq: SEQ;


</script>

<slot files={files.sort(seq===descending?(a,b)=>-sortMethod(a,b):sortMethod)} />

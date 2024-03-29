<script lang="ts">
    export let viewHeight:number;
    export let viewWidth:number;
    export let columnWidth:number;
    export let gap:number;
    export let totalCount:number;

    let columns:number,
    rows:number;
    $: {
        columns =Math.floor(viewWidth/(columnWidth+gap));
        rows = Math.ceil(totalCount/columns);
        console.log("reactive columns:", columns,"reactive rows:",rows)
    }
    // $: columns =Math.floor(viewWidth/(columnWidth+gap));
    // $:rows = Math.ceil(totalCount/columns);
    // const gridProps = {
    //     columns:Math.floor(width/columnWidth),

    //     };
</script>
<slot  gridProps={{columns,rows,viewHeight}}></slot>
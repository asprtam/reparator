<script>
    import ImgBg from "../imgBg/ImgBg.svelte";
    export let bg;
</script>

<style lang="scss">
    :global(.segmentedElement:first-of-type) {
        margin-top: 11vw;
    }
    .segmentedElement {
        height: 25vw;
        overflow: hidden;
        position: relative;
        div {
            z-index: 3;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: center;
        }
    }
</style>

<section class="segmentedElement">
    {#if bg}
    <ImgBg src={bg}></ImgBg>
    {/if}
    <div>
        <slot />
    </div>
</section>
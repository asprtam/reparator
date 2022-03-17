<script>
    import ImgBg from "../imgBg/ImgBg.svelte";
    export let type;
    export let bg;
</script>

<style lang="scss">
    :global(.segmentedElement:first-of-type) {
        margin-top: 11vw;
        @media (max-width: 767.98px) {
            margin-top: 15vw;
        }
    }
    .segmentedElement {
        height: 22vw;
        overflow: hidden;
        position: relative;
        @media (max-width: 767.98px) {
            height: unset;
            padding: 4vw 0 4vw;
        }
        div {
            z-index: 3;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: center;
            @media (max-width: 767.98px) {
                margin: 10vw 0 5vw;
            }
        }
    }
    .gallery {
        height:unset !important;
        padding: 4vw 0 4vw;
        div {
            flex-direction: row;
        }
    }
</style>

<section class="segmentedElement {type}">
    {#if bg}
    <ImgBg src={bg}></ImgBg>
    {/if}
    <div>
        <slot />
    </div>
</section>
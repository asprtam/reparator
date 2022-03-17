<style lang="scss">
    section {
        width: 100vw;
        overflow: hidden;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        @media (max-width: 767.98px) {
            flex-direction: column;
            padding: 5vw 0 0vw;
        }
        img {
            width: 20vw;
            @media (max-width: 767.98px) {
                width: unset;
                height: 360px;
                display: none;
            }
        }
    }
    .textContainer {
        width: 800px;
        max-width: 40vw;
        margin-right: 1vw;
        padding: 2vw 0;
        @media (max-width: 767.98px) {
            margin-right: 5vw;
            width: 90vw;
            padding: 2vw 0 0;
            max-width: unset;
        }
    }
    :global(.textContainer h4) {
        color: #1458bf;
        font-size: 1.15em;
        margin-bottom: 1.4em;
        width: 100%;
        font-family: Poppins;
    }
    :global(.textContainer p) {
        color: #1458bf;
        font-size: 1.05em;
        width: 100%;
        line-height: 1.4em;
        font-weight: 500;
        font-family: Ubuntu;
        margin-bottom: 1.4em;
    }
</style>

<script>
    export let className;
</script>

<section class="{className}">
    <div class="textContainer">
        <slot />
    </div>
    <img src="./media/pants.jpg"/>
</section>
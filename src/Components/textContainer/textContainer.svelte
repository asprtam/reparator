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
        max-width: 50vw;
        margin-right: 1vw;
        padding: 3.5vw 0;
        display: flex;
        @media (max-width: 767.98px) {
            margin-bottom: 5vw;
            width: 90vw;
            padding: 2vw 0 6vw;
            max-width: unset;
            flex-direction: column;
        }
    }
    :global(.textContainer h4) {
        color: #1458bf;
        font-size: 2.1em;
        letter-spacing: 0.01em;
        width: 80%;
        font-family: Lato;
        @media (max-width: 767.98px) {
            width: unset;
            margin-bottom: 6vw;
        }
    }
    :global(.textContainer div) {
        margin-left: 5vw;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-between;
    }
    :global(.textContainer div p) {
        text-align: right;
        font-weight: 400 !important;
    }
    :global(.textContainer div h5) {
        text-align: right;
        font-size: 1.6em;
        width: 70%;
        color: #1458bf;
        font-family: Poppins;
        text-transform: uppercase;
        letter-spacing: 0.01em;
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
</section>
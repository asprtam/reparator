<style lang="scss">
    .zoomableItem {
        width: 25.2vw;
        height: 18vw;
        overflow: hidden;
        position: relative;
        margin: 1vw;
        @media (max-width: 767.98px) {
            width: 100%;
            height: 64vw;
            margin: 3vw 0;
        }
        img {
            width: 103%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            transition: 0.2s all ease-in-out;
            position: absolute;
            z-index: 1;
        }
    }
    .zoomableItem > div:last-of-type {
            top: 0%;
            left: 0%;
            position: absolute;
            width: 100%;
            height: 100%;
            background: #0052cc;
            z-index: 2;
            opacity: 70%;
        }
    .zoomableItem:hover {
        img {
            width: 106%;
        }
    }
    :global(.clicked) {
        @media (max-width: 767.98px) {
            img {
                width: 106%;
            }
        }
    }
    :global(.zoomableItem > div:first-of-type svg) {
        width: 8vw;
        height: 8vw;
        position: absolute;
        z-index: 3;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        @media (max-width: 767.98px) {
            width: 30vw;
            height: 30vw;
        }
    }
    :global(.zoomableItem > div:first-of-type p) {
        width: 10vw;
        height: 10vw;
        position: absolute;
        z-index: 3;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) translateY(6.8vw);
        font-size: 1.2em;
        letter-spacing: 0.02em;
        color: #fbd232;
		text-align: center;
		font-family: Poppins;
        @media (max-width: 767.98px) {
            font-size: 1em;
            width: 30vw;
            height: 30vw;
            transform: translate(-50%, -50%) translateY(21.3vw);
        }
    }
    :global(.zoomableItem > div:first-of-type p, .zoomableItem > div:first-of-type svg) {
        opacity: 1;
        transition: 0.2s all ease-in-out;
    }
    :global(.zoomableItem:hover > div:first-of-type p, .zoomableItem:hover > div:first-of-type svg) {
        opacity: 0;
    }
    :global(.clicked > div:first-of-type p, .clicked > div:first-of-type svg) {
        @media (max-width: 767.98px) {
            opacity: 0;
        }
    }
    :global(.zoomableItem > div:nth-last-of-type(2)) {
        display: flex;
        position: absolute;
        flex-wrap: wrap;
        justify-content: space-between;
        z-index: 4;
        width: 100%;
        height: 100%;
        align-items: center;
    }
    :global(.zoomableItem > div:nth-last-of-type(2) div) {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex-basis: 50%;
    }
    // :global(.zoomableItem > div:nth-last-of-type(2) div:nth-of-type(2)) {
    //     flex-basis: 100%;
    // }
    :global(.zoomableItem > div:nth-last-of-type(2) div svg) {
        width: 4vw;
        margin-bottom: 0.5vw;
        @media (max-width: 767.98px) {
            width: 15vw;
            margin-bottom: 1.5vw;
        }
    }
    :global(.zoomableItem > div:nth-last-of-type(2) div p) {
        width: 9vw;
        font-size: 0.9em;
        line-height: 1.2em;
        letter-spacing: 0.01em;
        color: #fbd232;
		text-align: center;
		font-family: Poppins;
        @media (max-width: 767.98px) {
            width: 40vw;
            font-size: 0.8em;
        }
    }
    :global(.zoomableItem > div:nth-last-of-type(2) p, .zoomableItem > div:nth-last-of-type(2) svg) {
        opacity: 0;
        transition: 0.2s all ease-in-out;
    }
    :global(.zoomableItem:hover > div:nth-last-of-type(2) p, .zoomableItem:hover > div:nth-last-of-type(2) svg) {
        opacity: 1;
    }
    :global(.clicked > div:nth-last-of-type(2) p, .clicked > div:nth-last-of-type(2) svg) {
        @media (max-width: 767.98px) {
            opacity: 1;
        }
    }
</style>

<script>
    export let src; 
</script>

<div class="zoomableItem">
    <slot />
    <div></div>
    <img alt="bg" src={src} />
</div>
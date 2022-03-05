<style lang="scss">
    section {
        width: 100vw;
        overflow: hidden;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        img {
            height: 360px;
        }
    }
    .textContainer {
        width: 800px;
        max-width: 40vw;
        margin-right: 1vw;
        padding: 2vw 0;
    }
    :global(.textContainer h4) {
        color: #1458bf;
        font-size: 1.2em;
        margin-bottom: 1.4em;
        font-family: Poppins;
    }
    :global(.textContainer p) {
        color: #1458bf;
        font-size: 1.1em;
        line-height: 1.4em;
        font-weight: 500;
        font-family: Ubuntu;
        margin-bottom: 1.4em;
    }
</style>

<section>
    <div class="textContainer">
        <slot />
    </div>
    <img src="./media/pants.jpg"/>
</section>
<style lang="scss">
    section {
        width: 100vw;
        overflow: hidden;
        position: relative;
        display: flex;
        padding: 4vw 0 3vw;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        background: #0052cc;
        margin-top: 17vh;
        @media (max-width: 767.98px) {
            padding: 12vw 0 9vw;
            margin-top: 9vh;
        }
        img {
            width: 1000px;
            margin-top: 1vw;
            margin-bottom: 2vw;
            max-width: 60vw;
            @media (max-width: 767.98px) {
                width: 80vw;
                margin-top: 3vw;
                margin-bottom: 6vw;
                max-width: unset; 
            }
        }
    }
    .textContainer2 {
        width: 1000px;
        max-width: 60vw;
        @media (max-width: 767.98px) {
            width: 90vw;
            max-width: unset;
        }
    }
    :global(.textContainer2 p) {
        font-family: Ubuntu;
        font-weight: 500;
        letter-spacing: 0.02em;
        margin-bottom: 0.5vw;
        line-height: 1.3em;
        font-size: 1.05em;
        color: #fbd232;
        @media (max-width: 767.98px) {
            margin-bottom: 1.5vw;
        }
    }
    ul {
        list-style-type: none;
        display: flex;
        width: 1000px;
        max-width: 60vw;
        justify-content: space-between;
        margin-bottom: 0.5vw;
        @media (max-width: 767.98px) {
            width: 90vw;
            max-width: unset;
            flex-wrap: wrap;
        }
        li {
            display: flex;
            justify-content: center;
            align-items: center;
            @media (max-width: 767.98px) {
                flex-basis: 50%;
                margin: 2vw 0;
            }
            a {
                text-decoration: none;
                font-family: Ubuntu;
                font-weight: 400;
                letter-spacing: 0.03em;
                font-size: 1.05em;
                color: #fbd232;
                white-space: nowrap;
                transition: all 0.2s ease-in-out;
            }
            a:hover {
                letter-spacing: 0.06em;
            }
        }
    }
    :global(.dzialalnosc a) {
        text-decoration: none;
        font-family: Ubuntu;
        font-weight: 400;
        letter-spacing: 0.03em;
        font-size: 1.05em;
        color: #fbd232;
        white-space: nowrap;
        transition: all 0.2s ease-in-out;
    }
    :global(.dzialalnosc a:hover) {
        letter-spacing: 0.06em;
    }
</style>

<script>
    import { Link } from "svelte-navigator";
    export let className;
</script>

<section class="{className}">
    <ul>
        <li data-animation="fadeDown" data-delay="{0.0}"><Link to="/cennikUslug/sciany">Cennik ściany i sufity</Link></li>
        <li data-animation="fadeDown" data-delay="{0.1}"><Link to="/cennikUslug/wodKan">Cennik wod - kan</Link></li>
        <li data-animation="fadeDown" data-delay="{0.2}"><Link to="/cennikUslug/elektryka">Cennik elektryka</Link></li>
        <li data-animation="fadeDown" data-delay="{0.3}"><Link to="/cennikUslug/inne">Cennik inne prace</Link></li>
    </ul>
    <img src="./media/wycena.webp"/>
    <div class="textContainer2">
        <slot />
    </div>
</section>
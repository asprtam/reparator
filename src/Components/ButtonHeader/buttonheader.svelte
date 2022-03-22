<style lang="scss">
    a:hover {
        cursor: pointer;
        letter-spacing: 0.10em;
    }
    .noLink:hover {
        cursor: default !important;
        letter-spacing: 0.05em;
    }
    ul {
        width: 100%;
        position: relative;
    }
    li {
        background: #fbd232;
        position: absolute;
        display: flex;
        justify-content: center;
        left: 50%;
        list-style-type: none;
        transform: translateX(-50%);
        padding: 0.55vw 0vw 0.55vw;
        @media (max-width: 767.98px) {
            padding: 2vw 0vw 2vw;
            display: none;
            width: 30vw !important;
        }
    }
    a {
        font-family: Lato;
        font-weight: 900;
        text-transform: uppercase;
        padding: 0vw 1.2vw;
        color: #0844a3;
        font-size: 1.1em;
        letter-spacing: 0.05em;
        transform: none !important;
        text-decoration: none;
        transition: all 0.2s ease-in-out;
        @media (max-width: 767.98px) {
            display: none;
        }
    }
    .low {
        transform: translate(-50%, 40%);
    }
    .noLink {
        transform: translate(-50%, -50%) translateY(-4vw);
        @media (max-width: 767.98px) {
            display: flex;
            transform: translate(-50%, -50%) translateY(-8vw);
        }
    }
</style>

<script>
    export let to;
    let className = "";
    if(!to) {
        className = "noLink";
    }
    else {
        className= "low";
    }
</script>

<ul class="buttonHeader">
    <li class={className}><a href={to} class={className}><slot></slot></a></li>
</ul>
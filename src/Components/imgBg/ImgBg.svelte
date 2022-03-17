<script>
    import Image from "svelte-image";
    export let src; 
</script>

<style lang="scss">
    img {
        position: absolute;
        top: -15vw;
        width: 100vw;
        z-index: 1;
        @media (max-width: 767.98px) {
            top: 0vw;
            width: unset;
            height: 100vh;
        }
    }
    div {
        width: 100%;
        height: 100%;
        position: absolute;
        background: #0052cc;
        z-index: 2;
        top:0;
        opacity: 80%;
    }
</style>
<div></div>
<img src={src} data-parallax={0.5}/>
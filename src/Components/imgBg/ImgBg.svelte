<script>
    import Image from "svelte-image";
    export let src; 
</script>

<style>
    img {
        position: absolute;
        top: -10vw;
        width: 100vw;
        z-index: 1;
    }
    div {
        width: 100%;
        height: 100%;
        position: absolute;
        background: #0052cc;
        z-index: 2;
        opacity: 80%;
    }
</style>
<div></div>
<img src={src} data-parallax={0.5}/>
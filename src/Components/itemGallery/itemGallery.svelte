<style lang="scss">
section {
    width: 80%;
    padding: 4vw 10% 4vw 10%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    position: relative;
    z-index: 5;
    @media (max-width: 767.98px) {
        width: 90%;
        padding: 8vw 5% 8vw 5%;
        flex-direction: column;
    }
}
.uslugi2 {
    background: #0052cc;
    margin-top: 17vh;
    @media (max-width: 767.98px) {
        margin-top: 9vh;
    }
}
</style>

<script>
    export let type;
</script>

<section class="{type}">
    <slot />
</section>
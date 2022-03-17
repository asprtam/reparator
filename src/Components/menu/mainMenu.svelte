<style lang="scss">
    .menu {
        transform: translateY(-50%);
        width: 65.5vw;
        overflow: hidden;
        @media (max-width: 767.98px) {
            width: 100vw;
        }
    }
    .menu::after {
        content: '';
        height: 2vw;
        width: 2vw;
        position:absolute;
        background: #fbd232;
        top: 50%;
        right: 1vw;
        transform: rotateZ(45deg) skew(20deg, 20deg) translateY(-50%);
        @media (max-width: 767.98px) {
            display: none;
        }
    }
    .menuList {
        list-style-type: none;
        display: flex;
        background: #fbd232;
        padding: 0.5vw 12vw;
        width: 40vw;
        justify-content: space-between;
        @media (max-width: 767.98px) {
            width: 96vw;
            padding: 0.5vw 2vw;
        }
    }
    :global(.menuList li) {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    :global(.menuList li a) {
        color: #0844a3;
        text-decoration: none;
        font-family: Poppins;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
        font-size: 1.2em;
        @media (max-width: 767.98px) {
            font-size: 0.9em;
        }
    }
    :global(.menuList li a:hover) {
        color: #0844a3;
        text-decoration: none;
        font-family: Poppins;
        font-weight: 500;
        letter-spacing: 0.05em;
        font-size: 1.2em;
    }
</style>

<script>
    import { Link } from "svelte-navigator";
</script>

<div class="menu">
    <ul class="menuList">
        <li><a href="#dzialalnosc">Działalność</a></li>
        <li><a href="#uslugi">Usługi</a></li>
        <li><Link to="/realizacje">Realizacje</Link></li>
        <li><Link to="/cennik">Cennik</Link></li>
        <li><a href="#kontakt">Kontakt</a></li>
    </ul>
</div>
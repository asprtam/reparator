<style lang="scss">
    .menu {
        transform: translateY(-50%);
        width: 65.5vw;
        overflow: hidden;
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
    }
    ul {
        list-style-type: none;
        display: flex;
        background: #fbd232;
        padding: 0.5vw 12vw;
        width: 40vw;
        justify-content: space-between;
        li {
            a {
                color: #0844a3;
                text-decoration: none;
                font-family: Poppins;
                font-weight: 500;
                font-size: 1.1vw;
            }
        }
    }
</style>

<div class="menu" data-animation="slideLeft">
    <ul>
        <li><a href="">Działalność</a></li>
        <li><a href="">Usługi</a></li>
        <li><a href="">Realizacje</a></li>
        <li><a href="">Cennik</a></li>
        <li><a href="">Kontakt</a></li>
    </ul>
</div>
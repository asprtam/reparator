<style lang="scss">
    * {
        margin: 0;
    }
    h1 {
        font-family: Ubuntu;
        font-weight: 500;
        color: #0844a3;
        font-size: 2.7vw;
        @media (max-width: 767.98px) {
            font-size: 8vw;
        }
    }
    h2 {
        font-family: Ubuntu;
        font-weight: 400;
        font-size: 0.85vw;
        color: #0844a3;
    }
    header {
        width: 100%;
        position: fixed;
        top: 0vh;
        margin-top: 0;
        z-index: 10;
    }
    header .container {
       width: 100%;
       background: #fff;
       display: flex;
       align-items: center;
       height: 4.5vw;
       padding: 2vw 0 2vw;
       @media (max-width: 767.98px) {
            height: 10vw;
            padding: 2vw 0 5vw;
       }
    }
    header svg {
        width: 4.5vw;
        margin-left: 20vw;
        margin-right: 1.3vw;
        @media (max-width: 767.98px) {
            width: 10vw;
            margin-left: 2vw;
        }
    }
    svg path {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        transition: stroke-dashoffset 5s ease-in-out, fill 0.5s ease-in-out 1s;
        fill:#fff;
    }
    .logoTexts {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        transform: translateY(-0.5vw);
        height: 90%;
    }
    .logoTexts div {
        display: flex;
        width: 100%;
        justify-content: space-between;
        @media (max-width: 767.98px) {
            display: none;
        }
    }
</style>

<script>
    import Menu from "../menu/Menu.svelte";
</script>

<header>
    <div class="container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 111.71 98.4" class="logo-svg-after">
            <g id="e8bdef0a-3dd8-40f2-814f-e713fe868088" data-name="Warstwa 2">
                <g id="f0f7ea7c-b89b-40dc-9d17-fb178b9436d2" data-name="Warstwa 1">
                    <path d="M22.57,37.32l7-5.3a.77.77,0,0,1,.81-.07.78.78,0,0,1,.43.69v.3a15.47,15.47,0,0,1-3.08,9.26,14.93,14.93,0,0,1-8.14,5.48l-.58.13V59.62h2.13a1.85,1.85,0,0,1,1,.31,2.74,2.74,0,0,1,1,1.19,4.13,4.13,0,0,1,.33,1.63,3.79,3.79,0,0,1-.58,2.09,2.35,2.35,0,0,1-.71.73,1.85,1.85,0,0,1-1,.31h-.42s0,.07,0,.11v22.4a7.86,7.86,0,0,1-2.24,5.51,7.49,7.49,0,0,1-10.78,0,7.86,7.86,0,0,1-2.24-5.51V66s0-.08,0-.11H5.05a1.85,1.85,0,0,1-1-.31,2.81,2.81,0,0,1-1-1.19,4.13,4.13,0,0,1-.33-1.63,4,4,0,0,1,.58-2.09A2.47,2.47,0,0,1,4,59.93a1.85,1.85,0,0,1,1-.31H6.89V45.05a15.24,15.24,0,0,1-5.43-8.37A15.66,15.66,0,0,1,1,32.92a15.41,15.41,0,0,1,3.09-9.26,14.8,14.8,0,0,1,8.14-5.48h0a14.59,14.59,0,0,1,8.29.28.8.8,0,0,1,.23,1.39l-7,5.3,1,8.69ZM7,66v22.4a6.25,6.25,0,0,0,1.77,4.39,6,6,0,0,0,8.6,0,6.26,6.26,0,0,0,1.78-4.39V65.88H7Zm-2-4.78a.31.31,0,0,0-.18.06,1.14,1.14,0,0,0-.38.5,2.55,2.55,0,0,0-.19,1A2.24,2.24,0,0,0,4.62,64a1,1,0,0,0,.25.28.42.42,0,0,0,.18.06H21.13a.42.42,0,0,0,.18-.06,1.33,1.33,0,0,0,.38-.51,2.55,2.55,0,0,0,.19-1,2.3,2.3,0,0,0-.32-1.22.78.78,0,0,0-.25-.26.31.31,0,0,0-.18-.06Zm7.41-37.06,6.07-4.59a12.73,12.73,0,0,0-2.62-.27,13.22,13.22,0,0,0-10.6,5.33A13.91,13.91,0,0,0,3,36.29,13.57,13.57,0,0,0,8.17,44a.79.79,0,0,1,.28.88v14.7h9V47.16a.79.79,0,0,1,.65-.78c.37-.07.73-.14,1.1-.24a13.25,13.25,0,0,0,7.29-4.9,13.77,13.77,0,0,0,2.69-7l-6.05,4.58a.76.76,0,0,1-.77.09l-8.67-3.84a.79.79,0,0,1-.46-.64l-1.08-9.59A.82.82,0,0,1,12.46,24.15Z" style="stroke:#0844a3;stroke-miterlimit:10;stroke-width:2px"/>
                    <path d="M110.05.5H12.17A1.16,1.16,0,0,0,11,1.65v9.59h2.31V2.8H108.9V82h-73v2.3h74.11a1.15,1.15,0,0,0,1.16-1.15V1.65A1.16,1.16,0,0,0,110.05.5Z" style="stroke:#0844a3;stroke-miterlimit:10"/>
                    <path d="M61.75.69a1.16,1.16,0,0,0-1.6.32L39.25,32.42H35.94v2.3h3.93a1.17,1.17,0,0,0,1-.51L62.07,2.29A1.16,1.16,0,0,0,61.75.69Z" style="stroke:#0844a3;stroke-miterlimit:10"/>
                    <path d="M110.05,34.72H82.35a1.17,1.17,0,0,1-1-.51L60.15,2.29A1.15,1.15,0,0,1,62.07,1L83,32.42h27.08a1.15,1.15,0,1,1,0,2.3" style="stroke:#0844a3;stroke-miterlimit:10"/>
                    <path d="M42.87,84.3a1.14,1.14,0,0,1-1.15-1.15V29.37a1.15,1.15,0,0,1,2.3,0V83.15a1.15,1.15,0,0,1-1.15,1.15" style="stroke:#0844a3;stroke-miterlimit:10"/>
                    <path d="M79.35,84.3a1.15,1.15,0,0,1-1.15-1.15V29.37a1.15,1.15,0,0,1,2.3,0V83.15a1.14,1.14,0,0,1-1.15,1.15" style="stroke:#0844a3;stroke-miterlimit:10"/><path d="M65.72,45.55H56.5a.57.57,0,0,1-.57-.58V22.39a.57.57,0,0,1,.57-.57h9.22a.57.57,0,0,1,.57.57V45a.57.57,0,0,1-.57.58m-8.64-1.16h8.06V23H57.08Z" style="stroke:#0844a3;stroke-miterlimit:10;stroke-width:2px"/><path d="M65.72,76H56.5a.56.56,0,0,1-.57-.57V52.8a.56.56,0,0,1,.57-.57h9.22a.56.56,0,0,1,.57.57V75.38a.56.56,0,0,1-.57.57M57.08,74.8h8.06V53.38H57.08Z" style="stroke:#0844a3;stroke-miterlimit:10;stroke-width:2px"/>
                    <path d="M100.39,68.69H89.1a.58.58,0,0,1-.58-.58V45a.58.58,0,0,1,.58-.58h11.29A.57.57,0,0,1,101,45V68.11a.57.57,0,0,1-.57.58M89.68,67.54H99.81v-22H89.68Z" style="stroke:#0844a3;stroke-miterlimit:10;stroke-width:2px"/>
                    <rect x="0.02" y="11.24" width="35.92" height="87.16" style="fill:none"/>
                </g>
            </g>
        </svg>
        <div class="logoTexts">
            <h1>REPARATOR</h1>
            <div>
                <h2>Twoja złota rączka</h2>
                <h2>Kontakt 796 777 435</h2>
            </div>
        </div> 
    </div>
    <Menu></Menu>
</header>
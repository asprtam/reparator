<script>
    import * as utils from '../../Scripts/utils.js';
    import ButtonHeader from '../ButtonHeader/buttonheader.svelte';
    export let itemNumber;
    let definedNumer = 5;
    const items = [];
    for(let i=1; i<=itemNumber; i++) {
        let temp;
        if(i>definedNumer) {
            temp = {full: `./media/gallery/po/${i}.webp`, thumb: '', id: i, className: "" };
        } else {
            temp = {full: `./media/gallery/po/${i}.webp`, thumb: `./media/gallery/przed/${i}.webp`, id: i, className: "" };
        }
        items.push(temp);
    }
    let currentPosition = 0;
    let imgCont;
    let thuCont;
    let visible = "visible";
    items[0].className = "active";

    function checkVisibility(number) {
        if(number>definedNumer) {
            return "invisible";
        } else {
            return "visible";
        }
    }

    function zoomTo(el) {
                currentPosition = el.target.dataset.value - 1;
                for(let i=0; i<itemNumber; i++) {
                    items[i].className="";
                }
                items[currentPosition].className = "active";
    }
    function prev(el) {
        currentPosition--;
        if(currentPosition<0) {
            console.log('dddd');
            for(let i=0; i<itemNumber; i++) {
                items[i].className="";
            }
            items[itemNumber - 1].className = "active";
            setTimeout(() => {
                currentPosition = itemNumber - 1;
                imgCont.classList.toggle("noMove");
                thuCont.classList.toggle("noMove");
                setTimeout(() => {
                    imgCont.classList.toggle("noMove");
                    thuCont.classList.toggle("noMove");
                }, 10)
            }, 500);
        } else {
            for(let i=0; i<itemNumber; i++) {
                items[i].className="";
            }
            items[currentPosition].className = "active";
        }
        visible = checkVisibility(currentPosition+1);
    }
    function next(el) {
        currentPosition++;
        if(currentPosition>=itemNumber) {
            console.log('dddd');
            for(let i=0; i<itemNumber; i++) {
                items[i].className="";
            }
            items[0].className = "active";
            setTimeout(() => {
                currentPosition = 0;
                visible = checkVisibility(currentPosition);
                imgCont.classList.toggle("noMove");
                thuCont.classList.toggle("noMove");
                setTimeout(() => {
                    imgCont.classList.toggle("noMove");
                    thuCont.classList.toggle("noMove");
                }, 10)
            }, 500);
        } else {
            for(let i=0; i<itemNumber; i++) {
                items[i].className="";
            }
            items[currentPosition].className = "active";
            visible = checkVisibility(currentPosition+1);
        }
    }
</script>

<style lang="scss">
    .gallery {
        position: relative;
        height: 36vw;
        width: 51vw;
    }
    .thumbs {
        width:21vw;
        height: 14vw;
        position: absolute;
        z-index: 3;
        left: -2vw;
        bottom: 0vw;
        background: #fbd232;
        padding: 0.17vw;
        .cont {
            overflow: hidden;
        }
        .thuCont {
            display: flex;
            transition: all 0.5s ease-in-out;
            img {
                width: 21vw;
                height: 14vw;
            }
            img:hover {
                cursor: pointer;
            }
            .active {
                width: 6.6vw !important;
                height: 6.6vw !important;
                border: 0.1vw #fbd232 solid;
            }
        }
    }
    :global(.noMove) {
        transition: unset !important;
    }
    .images {
        position: absolute;
        z-index: 2;
        width: 50.5vw;
        left: 0vw;
        top: 0vw;
        height: 31.5vw;
        overflow: hidden;
        div {
            display: flex;
            transition: all 0.5s ease-in-out;
            img {
                width: 51vw;
            }
        }
    }
    .invisible {
        opacity: 0;
        animation-duration: 0.3s;
        animation-name: hide;
    }
    @keyframes show {
        0% { opacity: 0; transform: scale(0.9); }
        70% { opacity: 0.8; transform: scale(1.1) }
        100% { opacity: 1; transform: scale(1) }
    }
    @keyframes hide {
        0% { opacity: 1; transform: scale(1); }
        30% { opacity: 0.8; transform: scale(1.1) }
        100% { opacity: 0; transform: scale(0.9) }
    }
    .visible {
        opacity: 1;
        animation-duration: 0.3s;
        animation-name: show;
    }
    .nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%) rotateZ(45deg);
        height: 1.5vw;
        width: 1.5vw;
        transition: 0.2s all ease-in-out;
    }
    .prev {
        left: -5vw;
        border-left: 0.2vw #fbd232 solid;
        border-bottom: 0.2vw #fbd232 solid;
    }
    .next {
        right: -5vw;
        border-right: 0.2vw #fbd232 solid;
        border-top: 0.2vw #fbd232 solid;
    }
    .nav:hover {
        cursor: pointer;
    }
    .prev:hover {
        left: -5.1vw;
        transform: translateY(-50%) rotateZ(45deg) scale(110%);
    }
    .next:hover {
        right: -5.1vw;
        transform: translateY(-50%) rotateZ(45deg) scale(110%);
    }
    :global(.thumbs .buttonHeader) {
        position: absolute !important;
        top: 0%;
    }
    :global(.thumbs .buttonHeader li) {
        transform: translate(-50%, -50%)  translateY(0.085vw) !important;
    }
</style>

<div class="gallery">
    <div class="nav prev" on:click={prev}></div>
    <div class="images">
        <div style="transform: translateX(-{(currentPosition+1) * 51}vw)" bind:this={imgCont}>
            <img src="{items[itemNumber - 1].full}"/>
            {#each items as item}
                <img src="{item.full}"/>
            {/each}
            <img src="{items[0].full}"/>
        </div>
    </div>
    <div class="thumbs {visible}">
        <div class="cont">
        <div class="thuCont" style="transform: translateX(-{(currentPosition+1) * 21}vw)" bind:this={thuCont}>
            <img src="{items[definedNumer - 1].thumb}"/>
            {#each items as item}
                {#if item.thumb}
                    <img src="{item.thumb}"/>
                {/if}
            {/each}
            <img src="{items[0].thumb}"/>
        </div>
        </div>
        <ButtonHeader>Przed</ButtonHeader>
    </div>
    <div class="nav next" on:click={next}></div>
</div>
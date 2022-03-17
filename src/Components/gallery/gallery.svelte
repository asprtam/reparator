<script>
    import * as utils from '../../Scripts/utils.js';
    export let itemNumber;
    const items = [];
    for(let i=1; i<=itemNumber; i++) {
        let temp = {full: `./media/gallery/po/${i}.webp`, thumb: `./media/gallery/przed/${i}.webp`, id: i, className: "" };
        items.push(temp);
    }
    let currentPosition = 0;
    let imgCont;
    let thuCont;
    items[0].className = "active";

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
    }
</script>

<style lang="scss">
    .gallery {
        position: relative;
        height: 42vw;
        width: 58vw;
    }
    .thumbs {
        width:20vw;
        position: absolute;
        z-index: 3;
        overflow: hidden;
        left: 0vw;
        bottom: 0vw;
        border: 0.3vw #fbd232 solid;
        div {
            display: flex;
            transition: all 0.5s ease-in-out;
            img {
                width: 20vw;
                height: 15vw;
            }
            img:hover {
                cursor: pointer;
            }
            .active {
                width: 6.6vw !important;
                height: 6.6vw !important;
                border: 0.2vw #fbd232 solid;
            }
        }
    }
    :global(.noMove) {
        transition: unset !important;
    }
    .images {
        position: absolute;
        z-index: 2;
        width: 50vw;
        left: 6vw;
        top: 0vw;
        height: 37.5vw;
        overflow: hidden;
        div {
            display: flex;
            transition: all 0.5s ease-in-out;
            img {
                width: 50vw;
            }
        }
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
</style>

<div class="gallery">
    <div class="nav prev" on:click={prev}></div>
    <div class="images">
        <div style="transform: translateX(-{(currentPosition+1) * 50}vw)" bind:this={imgCont}>
            <img src="{items[itemNumber - 1].full}"/>
            {#each items as item}
                <img src="{item.full}"/>
            {/each}
            <img src="{items[0].full}"/>
        </div>
    </div>
    <div class="thumbs">
        <div style="transform: translateX(-{(currentPosition+1) * 20}vw)" bind:this={thuCont}>
            <img src="{items[itemNumber - 1].thumb}"/>
            {#each items as item}
                <img src="{item.thumb}"/>
            {/each}
            <img src="{items[0].thumb}"/>
        </div>
    </div>
    <div class="nav next" on:click={next}></div>
</div>
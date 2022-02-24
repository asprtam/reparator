import AnimatedElement from './AnimatedElement.js';

class Page {
    yPos;
    animatedElements = [];

    constructor() {
        document.querySelectorAll("[data-animation]").forEach((el) => {
            this.animatedElements.push(new AnimatedElement(el));
        })
    }

    handleScroll() {
        this.yPos = window.pageYOffset;
        for(let i in this.animatedElements) {
            if(this.yPos>=this.animatedElements[i].yPos) {
                this.animatedElements[i].animate();
                this.animatedElements.slice(i);
            }
        }
    }

    init() {
        this.handleScroll();
        document.addEventListener('scroll', ()=> {
            this.handleScroll();
        });
    }
}

export default Page;
import AnimatedElement from './AnimatedElement.js';
import Parallax from './Parallax.js';

class Page {
    yPos;
    animatedElements = [];
    parallaxes = [];

    constructor() {
        document.querySelectorAll("[data-animation]").forEach((el) => {
            this.animatedElements.push(new AnimatedElement(el));
        });
        document.querySelectorAll("[data-parallax]").forEach((el) => {
            this.parallaxes.push(new Parallax(el));
        });
        console.log(this.parallaxes);
    }

    handleScroll() {
        this.yPos = window.pageYOffset;
        for(let i in this.animatedElements) {
            if(this.yPos>=this.animatedElements[i].yPos) {
                this.animatedElements[i].animate();
                this.animatedElements.slice(i);
            }
        }
        for(let i in this.parallaxes) {
            if(this.yPos>=this.parallaxes[i].yPos) {
                this.parallaxes[i].el.style.transform = `translateY(${(this.yPos - this.parallaxes[i].yPos)*this.parallaxes[i].ratio}px)`;
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
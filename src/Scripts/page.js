import AnimatedElement from './AnimatedElement.js';
import Parallax from './Parallax.js';
import * as utils from './utils.js';

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
        document.querySelectorAll('[href^="#"]').forEach((el) => {
            const target = `.${el.href.substr(window.location.href.length+1, el.href.length)}`;
            el.href = "javascript:void(0)";
            el.addEventListener('click', ()=> {
                utils.smoothScroll(target, 1);
            });
        });
        document.querySelectorAll('ul li').forEach((el) => {
            const style={
                width: el.offsetWidth + "px"
            }
            Object.assign(el.style,style);
        });
        document.querySelectorAll('.zoomableItem').forEach((el) => {
            el.addEventListener('click', ()=> {
                el.classList.toggle("clicked");
            });
        });
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
        window.scrollTo(0,0);
        this.handleScroll();
        document.addEventListener('scroll', ()=> {
            this.handleScroll();
        });
    }
}

export default Page;
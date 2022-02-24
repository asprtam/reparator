import * as utils from './utils.js';
import Animations from './Animations.js';

class AnimatedElement {
    isDone;
    constructor(el) {
        this.el = el;
        this.yPos = utils.naturalize(el.offsetTop - window.innerHeight*0.9);
        if(!this.yPos) {
            this.yPos = 0;
        }
        this.animation = Animations[el.dataset.animation](this.el);
        // if(el.dataset.animation!="draw") {
            this.animation.pause();
        // }
        this.isDone = false;
        this.el.classList.add('animated');
    }

    animate() {
        if(!this.isDone) {
            this.animation.play();
        }
        this.isDone = true;
        this.el.classList.remove('animated');
    }
}

export default AnimatedElement;
import * as utils from './utils.js';
import Animations from './Animations.js';

class AnimatedElement {
    isDone;
    yPos;
    el;
    constructor(el) {
        this.el = el;
        this.yPos = utils.naturalize(utils.getOffset(el).top - window.innerHeight*0.6);
        this.animation = Animations[el.dataset.animation](this.el, 0.6, el.dataset.delay);
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
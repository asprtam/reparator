import * as utils from './utils.js';

class Parallax {
    el;
    yPos;
    ratio;
    constructor(el) {
        this.el = el;
        this.yPos = utils.naturalize(utils.getOffset(el).top - window.innerHeight);
        this.ratio = Number(el.dataset.parallax);
        this.el.classList.add('parallax');
    }
}

export default Parallax;
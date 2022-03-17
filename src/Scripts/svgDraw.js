class svgDraw {
    el;
    className;
    delay;
    constructor(el, className, delay) {
        this.el = el;
        this.className = className;
        this.delay = delay;
    }
    pause() {

    }
    play() {
        if(this.delay) {
            setTimeout(() => {
                this.el.classList.add(this.className);
            }, this.delay*1000)
        } else {
            setTimeout(() => {
                this.el.classList.add(this.className);
            }, 10)
        }
    }
}

export default svgDraw;
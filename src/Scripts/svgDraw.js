class svgDraw {
    el;
    className;
    constructor(el, className) {
        this.el = el;
        this.className = className;
    }
    pause() {

    }
    play() {
        setTimeout(() => {
            console.log(this.className);
            this.el.classList.add(this.className);
        }, 10)
    }
}

export default svgDraw;
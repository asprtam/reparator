import gsap from 'gsap';
import svgDraw from './svgDraw.js';

const defaults = {
    "duration": 0.6,
    "ease": "sine.out",
    "delay": 0
}

const Animations = {
    "fade": (el, dur=defaults.duration, dl=defaults.delay, es=defaults.ease) => {
        const animation = gsap.fromTo(el, {opacity: 0}, {opacity: 1, duration:dur, ease:es, delay:dl});
        return animation;
    },
    "fadeUp": (el, dur=defaults.duration, dl=defaults.delay, es=defaults.ease) => {
        const animation = gsap.fromTo(el, {opacity: 0, y:+10}, {opacity: 1, y:+0, duration:dur, ease:es, delay:dl});
        return animation;
    },
    "fadeDown": (el, dur=defaults.duration, dl=defaults.delay, es=defaults.ease) => {
        const animation = gsap.fromTo(el, {opacity: 0, y:-10}, {opacity: 1, y:+0, duration:dur, ease:es, delay:dl});
        return animation;
    },
    "fadeLeft": (el, dur=defaults.duration, dl=defaults.delay, es=defaults.ease) => {
        const animation = gsap.fromTo(el, {opacity: 0, x:-10}, {opacity: 1, x:+0, duration:dur, ease:es, delay:dl});
        return animation;
    },
    "slideLeft": (el, dur=1, dl=defaults.delay, es=defaults.ease) => {
        const animation = gsap.fromTo(el, {opacity: 1, x:-400}, {opacity: 1, x:+0, duration:dur, ease:es, delay:dl});
        return animation;
    },
    "draw": (el, dur=defaults.duration, dl=defaults.delay, newClass=el.dataset.newclass) => {
        const animation = new svgDraw(el, newClass, el.dataset.delay);
        return animation;
    }
}
    

export default Animations;
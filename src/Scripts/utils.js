export function naturalize(number) {
    if(number < 0 || !number) {
        return 0;
    } else {
        return number;
    }
}

export function getOffset(element) {
    if (!element.getClientRects().length)
    {
      return { top: 0, left: 0 };
    }

    let rect = element.getBoundingClientRect();
    let win = element.ownerDocument.defaultView;
    return (
    {
      top: rect.top + win.pageYOffset,
      left: rect.left + win.pageXOffset
    });   
}

export function smoothScroll(tg, dur=1) {
  const target = document.querySelector(tg);
  const duration = dur*1000;
  const targetPosition = getOffset(target).top - window.innerHeight*0.17;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;

  function animation(currentTime) {
    if(startTime === null) {
      startTime = currentTime;
    }
    let timeElapsed = currentTime - startTime;
    const run = ease(timeElapsed,startPosition,distance,duration);
    window.scrollTo(0,run);
    if(timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  function ease(t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2*t*t + b;
    t--;
    return -c/2 * (t*(t-2) - 1) + b;
  }

  requestAnimationFrame(animation);
}

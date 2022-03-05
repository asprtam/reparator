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

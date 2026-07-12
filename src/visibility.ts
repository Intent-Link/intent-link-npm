/** Whether a registered target is currently available for visible interaction. */
export function isVisibleIntentTarget(element: HTMLElement): boolean {
    if (!element.isConnected || element.getClientRects().length === 0) return false;

    for (let current: HTMLElement | null = element; current; current = current.parentElement) {
        const style = window.getComputedStyle(current);
        const opacity = style.opacity === '' ? 1 : Number(style.opacity);
        if (style.display === 'none'
            || style.visibility === 'hidden'
            || style.visibility === 'collapse'
            || opacity <= 0
            || style.pointerEvents === 'none') {
            return false;
        }
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    return rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVisibleIntentTarget } from './visibility';

function target(rect: Partial<DOMRect>, style: Partial<CSSStyleDeclaration> = {}) {
    const element = document.createElement('a');
    document.body.appendChild(element);
    vi.spyOn(element, 'getClientRects').mockReturnValue([rect as DOMRect] as unknown as DOMRectList);
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        left: 100,
        right: 200,
        bottom: 150,
        width: 100,
        height: 50,
        x: 100,
        y: 100,
        toJSON: () => ({}),
        ...rect
    });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        pointerEvents: 'auto',
        ...style
    } as CSSStyleDeclaration);
    return element;
}

describe('isVisibleIntentTarget', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('accepts a target intersecting the viewport', () => {
        expect(isVisibleIntentTarget(target({ top: 100, bottom: 150 }))).toBe(true);
    });

    it('rejects a closed mobile drawer translated left of the viewport', () => {
        expect(isVisibleIntentTarget(target({ left: -375, right: -20 }))).toBe(false);
    });

    it('rejects a closed mobile drawer translated right of the viewport', () => {
        expect(isVisibleIntentTarget(target({
            left: window.innerWidth,
            right: window.innerWidth * 2
        }))).toBe(false);
    });

    it('rejects visually hidden and non-interactive targets', () => {
        expect(isVisibleIntentTarget(target({}, { visibility: 'hidden' }))).toBe(false);
        expect(isVisibleIntentTarget(target({}, { opacity: '0' }))).toBe(false);
        expect(isVisibleIntentTarget(target({}, { pointerEvents: 'none' }))).toBe(false);
    });

    it('rejects a target inside a hidden ancestor', () => {
        const element = target({});
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        parent.appendChild(element);
        vi.mocked(window.getComputedStyle).mockImplementation((current) => ({
            display: 'block',
            visibility: 'visible',
            opacity: current === parent ? '0' : '1',
            pointerEvents: 'auto'
        } as CSSStyleDeclaration));

        expect(isVisibleIntentTarget(element)).toBe(false);
    });
});

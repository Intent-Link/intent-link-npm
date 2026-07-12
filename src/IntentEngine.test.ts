import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntentEngine } from './IntentEngine';

class ObserverMock {
    static instance: ObserverMock;
    observed = new Set<Element>();
    constructor(private callback: IntersectionObserverCallback) {
        ObserverMock.instance = this;
    }
    observe = (element: Element) => this.observed.add(element);
    unobserve = (element: Element) => this.observed.delete(element);
    disconnect = () => this.observed.clear();
    trigger(elements: Element[], isIntersecting: boolean) {
        this.callback(elements.map((target) => ({
            target,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0
        } as IntersectionObserverEntry)), this as unknown as IntersectionObserver);
    }
}

function makeTarget(rectSpy = vi.fn()) {
    const element = document.createElement('a');
    document.body.appendChild(element);
    vi.spyOn(element, 'getClientRects').mockReturnValue([{} as DOMRect] as unknown as DOMRectList);
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
        rectSpy();
        return {
            top: 50, left: 50, right: 150, bottom: 150,
            width: 100, height: 100, x: 50, y: 50,
            toJSON: () => ({})
        };
    });
    return element;
}

describe('IntentEngine', () => {
    let animationFrame: FrameRequestCallback | undefined;

    afterEach(() => {
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
        animationFrame = undefined;
    });

    function startEngine() {
        vi.stubGlobal('IntersectionObserver', ObserverMock);
        vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
            animationFrame = callback;
            return 1;
        }));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        const engine = new IntentEngine();
        engine.start();
        return engine;
    }

    it('calculates only targets reported visible by IntersectionObserver', () => {
        const engine = startEngine();
        const rectSpies = Array.from({ length: 1000 }, () => vi.fn());
        const elements = rectSpies.map((spy, index) => {
            const element = makeTarget(spy);
            engine.registerTarget(String(index), element, {
                importance: 'medium', cost: 'low', onIntent: vi.fn()
            });
            return element;
        });
        ObserverMock.instance.trigger(elements.slice(0, 100), true);

        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
        animationFrame?.(performance.now() + 16);

        expect(engine.getTargetCounts()).toEqual({ registered: 1000, visible: 100 });
        expect(rectSpies.slice(0, 100).every((spy) => spy.mock.calls.length > 0)).toBe(true);
        expect(rectSpies.slice(100).every((spy) => spy.mock.calls.length === 0)).toBe(true);
        engine.dispose();
    });

    it('calls onIntent directly without publishing React state', () => {
        const engine = startEngine();
        const onIntent = vi.fn();
        const element = makeTarget();
        engine.registerTarget('target', element, { importance: 'high', cost: 'low', onIntent });
        ObserverMock.instance.trigger([element], true);

        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
        animationFrame?.(performance.now() + 16);

        expect(onIntent).toHaveBeenCalledTimes(1);
        engine.dispose();
    });
});

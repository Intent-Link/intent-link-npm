import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IntentContext from './IntentContext';
import type { IntentEngine, IntentTargetConfig } from './IntentEngine';
import { useIntentTarget } from './useIntentTarget';

describe('useIntentTarget', () => {
    afterEach(cleanup);

    it('registers the attached element and always invokes the latest callback', () => {
        let registeredConfig: IntentTargetConfig | undefined;
        const engine = {
            registerTarget: vi.fn((_id, _element, config) => { registeredConfig = config; }),
            updateTarget: vi.fn((_id, config) => { registeredConfig = config; }),
            unregisterTarget: vi.fn()
        } as unknown as IntentEngine;
        const firstCallback = vi.fn();
        const secondCallback = vi.fn();

        const Target = ({ onIntent }: { onIntent?: () => void }) => {
            const ref = useIntentTarget<HTMLButtonElement>({ onIntent });
            return <button ref={ref}>Target</button>;
        };
        const wrap = (onIntent?: () => void) => (
            <IntentContext.Provider value={engine}><Target onIntent={onIntent} /></IntentContext.Provider>
        );

        const view = render(wrap(firstCallback));
        expect(engine.registerTarget).toHaveBeenCalled();
        registeredConfig?.onIntent();
        expect(firstCallback).toHaveBeenCalledTimes(1);

        view.rerender(wrap(secondCallback));
        registeredConfig?.onIntent();
        expect(firstCallback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);

        view.unmount();
        expect(engine.unregisterTarget).toHaveBeenCalled();
    });

    it('does not register an element that has no action', () => {
        const engine = {
            registerTarget: vi.fn(),
            updateTarget: vi.fn(),
            unregisterTarget: vi.fn()
        } as unknown as IntentEngine;
        const Target = () => {
            const ref = useIntentTarget<HTMLButtonElement>();
            return <button ref={ref}>Target</button>;
        };

        render(<IntentContext.Provider value={engine}><Target /></IntentContext.Provider>);
        expect(engine.registerTarget).not.toHaveBeenCalled();
    });
});

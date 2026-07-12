import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IntentProvider from './IntentProvider';

describe('IntentProvider scheduling', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('does not start a continuous animation loop while idle', () => {
        const requestAnimationFrame = vi.fn(() => 1);
        vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        render(<IntentProvider><div>content</div></IntentProvider>);

        expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('wakes the engine in response to user input', () => {
        const requestAnimationFrame = vi.fn(() => 1);
        vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        render(<IntentProvider><div>content</div></IntentProvider>);

        fireEvent.mouseMove(window, { clientX: 100, clientY: 120 });

        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });
});

"use client";
import { useCallback, useContext, useEffect, useId, useRef } from 'react';
import IntentContext from './IntentContext';

export type IntentLevel = "high" | "medium" | "low";

export interface UseIntentTargetOptions {
    importance?: IntentLevel;
    cost?: IntentLevel;
    onIntent?: () => void;
}

/** Register any HTML element as an intent target without coupling it to next/link. */
export function useIntentTarget<T extends HTMLElement = HTMLElement>({
    importance = "medium",
    cost = "low",
    onIntent
}: UseIntentTargetOptions = {}) {
    const engine = useContext(IntentContext);
    const id = useId();
    const elementRef = useRef<T | null>(null);
    const onIntentRef = useRef(onIntent);
    onIntentRef.current = onIntent;

    const invokeLatestCallback = useCallback(() => onIntentRef.current?.(), []);
    const config = { importance, cost, onIntent: invokeLatestCallback } as const;
    const configRef = useRef(config);
    configRef.current = config;

    const intentRef = useCallback((element: T | null) => {
        if (elementRef.current && elementRef.current !== element) {
            engine?.unregisterTarget(id);
        }
        elementRef.current = element;
        if (element && onIntentRef.current) {
            engine?.registerTarget(id, element, configRef.current);
        }
    }, [engine, id]);

    useEffect(() => {
        if (!engine) {
            console.warn('[intent-link] useIntentTarget must be used inside IntentProvider.');
            return;
        }

        if (!onIntent) {
            engine.unregisterTarget(id);
        } else if (elementRef.current) {
            engine.registerTarget(id, elementRef.current, config);
            engine.updateTarget(id, config);
        }
    }, [engine, id, importance, cost, onIntent, invokeLatestCallback]);

    useEffect(() => () => engine?.unregisterTarget(id), [engine, id]);

    return intentRef;
}

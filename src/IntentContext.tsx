"use client";
import { createContext } from 'react';

export interface PhysicsState {
    probability: number;
    weight: number;
    kineticAgent: number;
    kineticTarget: number;
    potential: number;
}

export interface IntentContextType {
    probabilities: Record<string, PhysicsState>;
    registerLink: (id: string, element: HTMLElement) => void;
    unregisterLink: (id: string) => void;
}

// Create the context with safe default no-op functions
const IntentContext = createContext<IntentContextType>({
    probabilities: {},
    registerLink: () => { },
    unregisterLink: () => { }
});

export default IntentContext;
"use client";
import React, { useContext, useEffect, useState } from 'react';
import IntentContext from './IntentContext';
import { IntentEngine } from './IntentEngine';

export const IntentProvider = ({ children }: { children: React.ReactNode }) => {
    const parentEngine = useContext(IntentContext);
    const [engine] = useState(() => new IntentEngine());

    useEffect(() => {
        if (parentEngine) {
            console.warn('[intent-link] Nested IntentProvider detected. Mount only one provider.');
        }
        engine.start();
        return () => engine.dispose();
    }, [engine, parentEngine]);

    return <IntentContext.Provider value={engine}>{children}</IntentContext.Provider>;
};

export default IntentProvider;

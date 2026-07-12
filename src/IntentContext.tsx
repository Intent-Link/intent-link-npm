"use client";
import { createContext } from 'react';
import type { IntentEngine } from './IntentEngine';

const IntentContext = createContext<IntentEngine | null>(null);

export default IntentContext;

"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import IntentContext, { PhysicsState } from './IntentContext';
import { KalmanFilter1D, KalmanFilter2D } from './kalman';

export const IntentProvider = ({ children }: { children: React.ReactNode }) => {
    const [probabilities, setProbabilities] = useState<Record<string, PhysicsState>>({});

    // Engine State with strict types
    const linksRef = useRef<Map<string, HTMLElement>>(new Map());
    const cursorRef = useRef({ x: 0, y: 0, active: false });
    const scrollRef = useRef({ y: 0, active: false });

    // Kalman Instances
    const kalman2D = useRef(new KalmanFilter2D());
    const kalman1D = useRef(new KalmanFilter1D());
    const requestRef = useRef<number>(0);
    const isTouchDevice = useRef(false);

    useEffect(() => {
        isTouchDevice.current = window.matchMedia("(pointer: coarse)").matches;
    }, []);

    const registerLink = useCallback((id: string, element: HTMLElement) => {
        if (element) linksRef.current.set(id, element);
    }, []);

    const unregisterLink = useCallback((id: string) => {
        linksRef.current.delete(id);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            cursorRef.current = { x: e.clientX, y: e.clientY, active: true };
            if (!kalman2D.current.lastTime) {
                kalman2D.current.init(e.clientX, e.clientY, performance.now());
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            scrollRef.current = { y: window.scrollY, active: true };
            if (!kalman1D.current.lastTime) {
                kalman1D.current.init(window.scrollY, performance.now());
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const engineLoop = useCallback((timestamp: number) => {
        const c = cursorRef.current;
        const s = scrollRef.current;
        const isMobile = isTouchDevice.current;

        if (!isMobile && !c.active) {
            requestRef.current = requestAnimationFrame(engineLoop);
            return;
        }

        let Va = 0, Vt = 0, sigma = 0.0001;

        if (!isMobile && c.active) {
            const k2d = kalman2D.current.update(c.x, c.y, timestamp);
            Va = k2d.v;
            sigma += k2d.sigmaV;
        }

        if (isMobile && s.active) {
            const k1d = kalman1D.current.update(s.y, timestamp);
            Vt = Math.abs(k1d);
            sigma += kalman1D.current.getVelocityVariance();
        }

        const rawPhysics: Record<string, PhysicsState> = {};
        let Z = 1;
        const PI_E = Math.PI * Math.E;

        linksRef.current.forEach((el, id) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            const originX = isMobile ? window.innerWidth * 0.50 : c.x;
            const originY = isMobile ? window.innerHeight * 0.60 : c.y;

            const targetCenterX = rect.left + rect.width / 2;
            const targetCenterY = rect.top + rect.height / 2;

            let dx = originX - targetCenterX;
            const dy = originY - targetCenterY;

            if (isMobile) {
                dx = 0;
            }

            const d = Math.sqrt(dx * dx + dy * dy);
            const w = Math.max(rect.width, rect.height, 1);

            const kineticAgent = Math.exp(-(Va * Va) / (2 * sigma * sigma));
            const kineticTarget = Math.exp(-(Vt * Vt) / (2 * sigma * sigma));
            const potential = Math.exp(-(PI_E * d * d) / (w * w));

            const weight = kineticAgent * kineticTarget * potential;

            rawPhysics[id] = { probability: 0, weight, kineticAgent, kineticTarget, potential };

            if (!isMobile) {
                Z += weight;
            }
        });

        const finalStates: Record<string, PhysicsState> = {};
        for (const [id, physics] of Object.entries(rawPhysics)) {
            finalStates[id] = {
                probability: isMobile ? physics.weight : (physics.weight / Z),
                weight: physics.weight,
                kineticAgent: physics.kineticAgent,
                kineticTarget: physics.kineticTarget,
                potential: physics.potential
            };
        }

        setProbabilities(finalStates);
        requestRef.current = requestAnimationFrame(engineLoop);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(engineLoop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [engineLoop]);

    return (
        <IntentContext.Provider value={{ probabilities, registerLink, unregisterLink }}>
            {children}
        </IntentContext.Provider>
    );
};

export default IntentProvider;
"use client";
import React, { useContext, useEffect, useRef, useId } from 'react';
import IntentContext from './IntentContext';
import NextLink, { LinkProps } from "next/link";
import { useRouter } from 'next/navigation';

export interface IntentLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
    importance?: "high" | "medium" | "low";
    cost?: "high" | "medium" | "low";
    onIntent?: (data: { href: string; utility: number }) => void;
    children: React.ReactNode;
}

const IntentLink = ({
    href,
    children,
    importance = "medium",
    cost = "low",
    onIntent,
    ...props
}: IntentLinkProps) => {
    const { probabilities, registerLink, unregisterLink } = useContext(IntentContext);
    const triggerLock = useRef(false);
    const router = useRouter();
    const elementRef = useRef<HTMLAnchorElement>(null);
    const instanceId = useId();

    const IMPORTANCE_WEIGHTS = { high: 1.0, medium: 0.5, low: 0.2 };
    const COST_WEIGHTS = { high: 0.8, medium: 0.4, low: 0.1 };

    const exactId = typeof href === 'object' ? (href.pathname || '') : href.toString();

    const physicsState = probabilities[instanceId] || {
        probability: 0, weight: 0, kineticAgent: 0, kineticTarget: 0, potential: 0
    };

    // register link using unique physical ID
    useEffect(() => {
        const el = elementRef.current;
        if (!el) return;

        registerLink(instanceId, el);

        return () => {
            unregisterLink(instanceId);
        };
    }, [instanceId, registerLink, unregisterLink]);

    useEffect(() => {
        if (physicsState.probability > 0 && !triggerLock.current) {
            const B = IMPORTANCE_WEIGHTS[importance] || 0.5;
            const C = COST_WEIGHTS[cost] || 0.1;
            const Utility = (physicsState.probability * B) - C;

            if (Utility > 0) {
                triggerLock.current = true;

                if (onIntent) {
                    onIntent({ href: exactId, utility: Utility });
                }
            }
        }
    }, [physicsState, exactId, importance, cost, onIntent, router]);

    // Reset trigger if the user moves away
    useEffect(() => {
        if (triggerLock.current && physicsState.probability < 0.05) {
            triggerLock.current = false;
        }
    }, [physicsState.probability]);

    return (
        <NextLink href={href} prefetch={false} ref={elementRef} {...props}>
            {children}
        </NextLink>
    );
};

export default IntentLink;
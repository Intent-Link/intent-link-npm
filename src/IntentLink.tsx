"use client";
import React, { forwardRef, useMemo } from 'react';
import NextLink, { LinkProps } from "next/link";
import { useIntentTarget } from './useIntentTarget';

export interface IntentLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
    importance?: "high" | "medium" | "low";
    cost?: "high" | "medium" | "low";
    onIntent?: () => void;
    children: React.ReactNode;
}

function mergeRefs<T>(
    ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
    return (node: T) => {
        refs.forEach((ref) => {
            if (!ref) return;
            if (typeof ref === 'function') {
                ref(node);
            } else {
                (ref as React.MutableRefObject<T | null>).current = node;
            }
        });
    };
}

const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(
    (
        {
            href,
            children,
            importance = "medium",
            cost = "low",
            onIntent,
            ...props
        },
        forwardedRef
    ) => {
        const elementRef = useIntentTarget<HTMLAnchorElement>({
            importance,
            cost,
            onIntent
        });
        const combinedRef = useMemo(
            () => mergeRefs(elementRef, forwardedRef),
            [elementRef, forwardedRef]
        );

        return (
            <NextLink
                href={href}
                prefetch={false}
                ref={combinedRef}
                {...props}
            >
                {children}
            </NextLink>
        );
    }
);

IntentLink.displayName = "IntentLink";

export default IntentLink;

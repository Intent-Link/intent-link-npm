"use client";
import { useEffect, useRef, useState } from 'react';
import { IntentLink, useIntentTarget } from 'intent-link';

function TrackedLink({ index }: { index: number }) {
    const renders = useRef(0);
    renders.current += 1;
    const anchorRef = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        if (anchorRef.current) anchorRef.current.dataset.renders = String(renders.current);
    });
    return (
        <IntentLink
            ref={anchorRef}
            href={`/destination/${index}`}
            importance="low"
            cost="high"
            onIntent={() => undefined}
            data-testid={`dense-${index}`}
            className="dense-link"
        >
            Target {index}
        </IntentLink>
    );
}

export default function Page() {
    const [desktopCount, setDesktopCount] = useState(0);
    const [mobileCount, setMobileCount] = useState(0);
    const [hiddenCount, setHiddenCount] = useState(0);
    const [carouselCount, setCarouselCount] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const buttonRef = useIntentTarget<HTMLButtonElement>({
        importance: 'high',
        cost: 'low',
        onIntent: () => setDesktopCount((count) => count + 1)
    });
    const mobileRef = useIntentTarget<HTMLButtonElement>({
        importance: 'high',
        cost: 'low',
        onIntent: () => setMobileCount((count) => count + 1)
    });

    useEffect(() => {
        document.body.dataset.hydrated = 'true';
    }, []);

    return (
        <main>
            <button ref={buttonRef} data-testid="desktop-target" className="desktop-target">
                Desktop target
            </button>
            <output data-testid="desktop-count">{desktopCount}</output>

            <button data-testid="drawer-toggle" className="drawer-toggle" onClick={() => setDrawerOpen((open) => !open)}>
                Toggle drawer
            </button>
            <div className={`closed-drawer${drawerOpen ? ' open' : ''}`}>
                <IntentLink
                    href="/hidden"
                    importance="high"
                    cost="low"
                    onIntent={() => setHiddenCount((count) => count + 1)}
                >
                    Hidden target
                </IntentLink>
            </div>
            <output data-testid="hidden-count">{hiddenCount}</output>

            <div data-testid="carousel" className="carousel">
                <div className="carousel-content">
                    <IntentLink
                        href="/carousel"
                        importance="high"
                        cost="low"
                        onIntent={() => setCarouselCount((count) => count + 1)}
                        data-testid="carousel-target"
                        className="carousel-target"
                    >
                        Carousel target
                    </IntentLink>
                </div>
            </div>
            <output data-testid="carousel-count">{carouselCount}</output>

            <div className="mobile-spacer" />
            <button ref={mobileRef} data-testid="mobile-target" className="mobile-target">
                Mobile target
            </button>
            <output data-testid="mobile-count">{mobileCount}</output>

            <section data-testid="dense-list" className="dense-list">
                {Array.from({ length: 1000 }, (_, index) => <TrackedLink key={index} index={index} />)}
            </section>
        </main>
    );
}

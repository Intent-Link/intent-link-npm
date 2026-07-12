import { KalmanFilter1D, KalmanFilter2D } from './kalman';
import { isVisibleIntentTarget } from './visibility';
import type { IntentLevel } from './useIntentTarget';

const SETTLE_TIME_MS = 500;
const IMPORTANCE_WEIGHTS = { high: 1, medium: 0.5, low: 0.2 } as const;
const COST_WEIGHTS = { high: 0.8, medium: 0.4, low: 0.1 } as const;

export interface IntentTargetConfig {
    importance: IntentLevel;
    cost: IntentLevel;
    onIntent: () => void;
}

interface RegisteredTarget extends IntentTargetConfig {
    element: HTMLElement;
    isIntersecting: boolean;
    triggered: boolean;
}

interface CalculatedTarget {
    target: RegisteredTarget;
    unnormalizedProbability: number;
}

export class IntentEngine {
    private targets = new Map<string, RegisteredTarget>();
    private targetIds = new WeakMap<Element, string>();
    private visibleTargetIds = new Set<string>();
    private observer: IntersectionObserver | null = null;
    private cursor = { x: 0, y: 0, active: false };
    private scroll = { y: 0, active: false };
    private kalman2D = new KalmanFilter2D();
    private kalman1D = new KalmanFilter1D();
    private requestId = 0;
    private lastInputTime = 0;
    private isTouchDevice = false;
    private started = false;

    start() {
        if (this.started) return;
        this.started = true;
        this.isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

        if (typeof IntersectionObserver !== 'undefined') {
            this.observer = new IntersectionObserver(this.handleIntersections, { threshold: 0 });
            this.targets.forEach((target) => this.observer?.observe(target.element));
        } else {
            this.targets.forEach((target, id) => {
                target.isIntersecting = true;
                this.visibleTargetIds.add(id);
            });
        }

        window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
        window.addEventListener('scroll', this.handleScroll, { passive: true });
    }

    dispose() {
        if (!this.started) return;
        this.started = false;
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('scroll', this.handleScroll);
        this.observer?.disconnect();
        this.observer = null;
        this.visibleTargetIds.clear();
        if (this.requestId) cancelAnimationFrame(this.requestId);
        this.requestId = 0;
    }

    registerTarget(id: string, element: HTMLElement, config: IntentTargetConfig) {
        const existing = this.targets.get(id);
        if (existing?.element !== element) {
            if (existing) this.observer?.unobserve(existing.element);
            const target: RegisteredTarget = {
                element,
                ...config,
                isIntersecting: this.observer ? false : true,
                triggered: existing?.triggered ?? false
            };
            this.targets.set(id, target);
            this.targetIds.set(element, id);
            if (this.observer) {
                this.observer.observe(element);
            } else {
                this.visibleTargetIds.add(id);
            }
            return;
        }

        Object.assign(existing, config);
    }

    updateTarget(id: string, config: IntentTargetConfig) {
        const target = this.targets.get(id);
        if (target) Object.assign(target, config);
    }

    unregisterTarget(id: string) {
        const target = this.targets.get(id);
        if (!target) return;
        this.observer?.unobserve(target.element);
        this.targets.delete(id);
        this.targetIds.delete(target.element);
        this.visibleTargetIds.delete(id);
    }

    /** Internal diagnostics used by performance regression tests. */
    getTargetCounts() {
        return { registered: this.targets.size, visible: this.visibleTargetIds.size };
    }

    private handleIntersections = (entries: IntersectionObserverEntry[]) => {
        let gainedVisibleTarget = false;
        for (const entry of entries) {
            const id = this.targetIds.get(entry.target);
            if (!id) continue;
            const target = this.targets.get(id);
            if (!target) continue;
            target.isIntersecting = entry.isIntersecting && entry.intersectionRatio > 0;
            if (target.isIntersecting) {
                this.visibleTargetIds.add(id);
                gainedVisibleTarget = true;
            } else {
                this.visibleTargetIds.delete(id);
                target.triggered = false;
            }
        }

        if (gainedVisibleTarget
            && ((this.isTouchDevice && this.scroll.active) || (!this.isTouchDevice && this.cursor.active))) {
            this.wake();
        }
    };

    private handleMouseMove = (event: MouseEvent) => {
        this.cursor = { x: event.clientX, y: event.clientY, active: true };
        if (!this.kalman2D.lastTime) {
            this.kalman2D.init(event.clientX, event.clientY, performance.now());
        }
        this.wake();
    };

    private handleScroll = () => {
        this.scroll = { y: window.scrollY, active: true };
        if (!this.kalman1D.lastTime) {
            this.kalman1D.init(window.scrollY, performance.now());
        }
        this.wake();
    };

    private wake() {
        this.lastInputTime = performance.now();
        if (!this.requestId) this.requestId = requestAnimationFrame(this.runFrame);
    }

    private runFrame = (timestamp: number) => {
        this.requestId = 0;
        const isMobile = this.isTouchDevice;
        if ((!isMobile && !this.cursor.active) || (isMobile && !this.scroll.active)) return;

        let agentVelocity = 0;
        let targetVelocity = 0;
        let velocityDeviation = 0.0001;

        if (!isMobile) {
            const estimate = this.kalman2D.update(this.cursor.x, this.cursor.y, timestamp);
            agentVelocity = estimate.v;
            velocityDeviation += estimate.sigmaV;
        } else {
            targetVelocity = Math.abs(this.kalman1D.update(this.scroll.y, timestamp));
            velocityDeviation += Math.sqrt(Math.max(this.kalman1D.getVelocityVariance(), 0));
        }

        const calculated: CalculatedTarget[] = [];
        let partitionFunction = 1;
        const piE = Math.PI * Math.E;

        for (const id of this.visibleTargetIds) {
            const target = this.targets.get(id);
            if (!target || !target.isIntersecting || !isVisibleIntentTarget(target.element)) continue;
            const rect = target.element.getBoundingClientRect();
            const originX = isMobile ? window.innerWidth * 0.5 : this.cursor.x;
            const originY = isMobile ? window.innerHeight * 0.55 : this.cursor.y;
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = isMobile ? 0 : originX - centerX;
            const dy = originY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const width = Math.min(rect.width, rect.height, 1);
            const agentExponent = -(agentVelocity * agentVelocity)
                / (2 * velocityDeviation * velocityDeviation);
            const targetExponent = -(targetVelocity * targetVelocity)
                / (2 * velocityDeviation * velocityDeviation);
            const potentialExponent = -(piE * distance * distance) / (width * width);
            const unnormalizedProbability = Math.exp(agentExponent + targetExponent + potentialExponent);

            calculated.push({ target, unnormalizedProbability });
            if (!isMobile) partitionFunction += unnormalizedProbability;
        }

        const callbacks: Array<() => void> = [];
        for (const { target, unnormalizedProbability } of calculated) {
            const decisionProbability = isMobile
                ? unnormalizedProbability
                : unnormalizedProbability / partitionFunction;
            const expectedUtility = decisionProbability * IMPORTANCE_WEIGHTS[target.importance]
                - COST_WEIGHTS[target.cost];

            if (expectedUtility > 0 && !target.triggered) {
                target.triggered = true;
                callbacks.push(target.onIntent);
            } else if (decisionProbability < 0.05) {
                target.triggered = false;
            }
        }

        if (timestamp - this.lastInputTime < SETTLE_TIME_MS) {
            this.requestId = requestAnimationFrame(this.runFrame);
        } else {
            this.cursor.active = false;
            this.scroll.active = false;
        }

        for (const callback of callbacks) {
            try {
                callback();
            } catch (error) {
                console.error('[intent-link] onIntent callback failed', error);
            }
        }
    };
}

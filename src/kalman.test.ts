import { describe, expect, it } from 'vitest';
import { KalmanFilter1D, KalmanFilter2D } from './kalman';

describe('Kalman velocity variance', () => {
    it('returns the sum of the 2D velocity covariance components directly', () => {
        const filter = new KalmanFilter2D();
        filter.init(0, 0, 100);
        filter.P[2][2] = 9;
        filter.P[3][3] = 16;

        const estimate = filter.update(0, 0, 100);

        expect(estimate.velocityVariance).toBe(25);
    });

    it('returns the 1D velocity covariance component directly', () => {
        const filter = new KalmanFilter1D();
        filter.P[1][1] = 9;

        expect(filter.getVelocityVariance()).toBe(9);
    });
});

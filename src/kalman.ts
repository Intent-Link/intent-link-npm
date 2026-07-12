// src/kalman.ts

class Matrix {
    static identity(n: number): number[][] {
        const arr: number[][] = [];
        for (let i = 0; i < n; i++) {
            arr[i] = [];
            for (let j = 0; j < n; j++) { arr[i][j] = i === j ? 1 : 0; }
        }
        return arr;
    }

    static multiply(A: number[][], B: number[][]): number[][] {
        const rowsA = A.length, colsA = A[0].length, colsB = B[0].length;
        const result: number[][] = [];
        for (let i = 0; i < rowsA; i++) {
            result[i] = [];
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) { sum += A[i][k] * B[k][j]; }
                result[i][j] = sum;
            }
        }
        return result;
    }

    static add(A: number[][], B: number[][]): number[][] {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    }

    static subtract(A: number[][], B: number[][]): number[][] {
        return A.map((row, i) => row.map((val, j) => val - B[i][j]));
    }

    static transpose(A: number[][]): number[][] {
        return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
    }

    static invert2x2(M: number[][]): number[][] {
        const a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];
        const det = a * d - b * c;
        if (det === 0) return [[0, 0], [0, 0]];
        const invDet = 1 / det;
        return [[d * invDet, -b * invDet], [-c * invDet, a * invDet]];
    }
}

export class KalmanFilter2D {
    x: number[][];
    P: number[][];
    R: number[][];
    Q: number[][];
    H: number[][];
    lastTime: number;

    constructor() {
        this.x = [[0], [0], [0], [0]];
        this.P = Matrix.identity(4).map(row => row.map(v => v * 100));
        this.R = [[300, 0], [0, 300]];
        this.Q = Matrix.identity(4).map(row => row.map(v => v * 0.1));
        this.H = [[1, 0, 0, 0], [0, 1, 0, 0]];
        this.lastTime = 0;
    }

    init(x: number, y: number, timestamp: number) {
        this.x = [[x], [y], [0], [0]];
        this.lastTime = timestamp;
        return { x, y, vx: 0, vy: 0, v: 0, velocityVariance: 0 };
    }

    update(measX: number, measY: number, timestamp: number) {
        const dt = (timestamp - this.lastTime);
        this.lastTime = timestamp;

        if (dt <= 0) {
            const estVx = this.x[2][0];
            const estVy = this.x[3][0];
            const velocityVariance = this.P[2][2] + this.P[3][3];
            return { x: this.x[0][0], y: this.x[1][0], vx: estVx, vy: estVy, v: Math.sqrt(estVx * estVx + estVy * estVy), velocityVariance };
        }

        const F = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]];
        const x_pred = Matrix.multiply(F, this.x);
        const Ft = Matrix.transpose(F);
        const P_pred = Matrix.add(Matrix.multiply(Matrix.multiply(F, this.P), Ft), this.Q);

        const z = [[measX], [measY]];
        const H_x = Matrix.multiply(this.H, x_pred);
        const y_res = Matrix.subtract(z, H_x);
        const Ht = Matrix.transpose(this.H);
        const S = Matrix.add(Matrix.multiply(Matrix.multiply(this.H, P_pred), Ht), this.R);
        const K = Matrix.multiply(Matrix.multiply(P_pred, Ht), Matrix.invert2x2(S));

        this.x = Matrix.add(x_pred, Matrix.multiply(K, y_res));
        const I = Matrix.identity(4);
        const KH = Matrix.multiply(K, this.H);
        this.P = Matrix.multiply(Matrix.subtract(I, KH), P_pred);

        const estVx = this.x[2][0];
        const estVy = this.x[3][0];
        const velocityVariance = this.P[2][2] + this.P[3][3];

        return { x: this.x[0][0], y: this.x[1][0], vx: estVx, vy: estVy, v: Math.sqrt(estVx * estVx + estVy * estVy), velocityVariance };
    }
}

export class KalmanFilter1D {
    x: number[];
    P: number[][];
    R: number;
    Q: number[];
    lastTime: number;

    constructor() {
        this.x = [0, 0];
        this.P = [[10, 0], [0, 10]];
        this.R = 100;
        this.Q = [1, 0.1];
        this.lastTime = 0;
    }

    init(y: number, timestamp: number) {
        this.x = [y, 0];
        this.lastTime = timestamp;
        this.P = [[10, 0], [0, 10]];
    }

    update(measY: number, timestamp: number): number {
        const dt = timestamp - this.lastTime;
        if (dt <= 0) return this.x[1];
        this.lastTime = timestamp;

        const xPred = [this.x[0] + this.x[1] * dt, this.x[1]];
        const p00 = this.P[0][0] + dt * (this.P[1][0] + this.P[0][1]) + dt * dt * this.P[1][1] + this.Q[0];
        const p01 = this.P[0][1] + dt * this.P[1][1];
        const p10 = this.P[1][0] + dt * this.P[1][1];
        const p11 = this.P[1][1] + this.Q[1];
        const P_pred = [[p00, p01], [p10, p11]];

        const yRes = measY - xPred[0];
        const S = P_pred[0][0] + this.R;
        const K = [P_pred[0][0] / S, P_pred[1][0] / S];

        this.x = [xPred[0] + K[0] * yRes, xPred[1] + K[1] * yRes];

        const I_KH00 = 1 - K[0];
        const I_KH10 = -K[1];
        this.P = [
            [I_KH00 * P_pred[0][0], I_KH00 * P_pred[0][1]],
            [I_KH10 * P_pred[0][0] + P_pred[1][0], I_KH10 * P_pred[0][1] + P_pred[1][1]]
        ];

        return this.x[1];
    }

    getVelocityVariance(): number {
        return this.P[1][1];
    }

}

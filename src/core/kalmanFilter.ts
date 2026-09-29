/**
 * Kalman Filter for 2D Bounding Box Tracking (SORT).
 * State vector: [u, v, s, r, u_dot, v_dot, s_dot]^T
 * - u, v: center coordinates of the bounding box
 * - s: scale / area of the bounding box (width * height)
 * - r: aspect ratio of the bounding box (width / height)
 * - u_dot, v_dot, s_dot: velocity derivatives
 * 
 * Measurement vector: [u, v, s, r]^T
 */
export class KalmanBoxTracker {
  // State vector x: 7 elements
  private x: number[];
  
  // Covariance matrix P: 7x7
  private P: number[][];
  
  // Process noise covariance Q: 7x7
  private Q: number[][];
  
  // Measurement noise covariance R: 4x4
  private R: number[][];

  constructor(bbox: [number, number, number, number]) {
    // bbox is [x, y, w, h] (top-left x, y, width, height)
    const [x, y, w, h] = bbox;
    const u = x + w / 2;
    const v = y + h / 2;
    const s = Math.max(1, w * h);
    const r = Math.max(0.01, w / Math.max(1, h));

    // Initial state: velocities are 0
    this.x = [u, v, s, r, 0, 0, 0];

    // Initial uncertainty
    this.P = Array.from({ length: 7 }, (_, i) =>
      Array.from({ length: 7 }, (_, j) => {
        if (i !== j) return 0;
        // Position uncertainty is lower, velocity uncertainty is high
        return i < 4 ? 10 : 1000;
      })
    );

    // Process noise matrix Q
    this.Q = Array.from({ length: 7 }, (_, i) =>
      Array.from({ length: 7 }, (_, j) => {
        if (i !== j) return 0;
        if (i < 4) return 1;
        return 0.01;
      })
    );

    // Measurement noise matrix R (4x4)
    this.R = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) => {
        if (i !== j) return 0;
        if (i === 2) return 10; // Area has higher noise
        if (i === 3) return 10; // Aspect ratio has higher noise
        return 1; // Center position noise
      })
    );
  }

  /**
   * Advances the state vector and returns the predicted bounding box [x, y, w, h].
   */
  public predict(): [number, number, number, number] {
    // Constant velocity model:
    // u' = u + u_dot
    // v' = v + v_dot
    // s' = s + s_dot
    // r' = r
    // u_dot' = u_dot
    // v_dot' = v_dot
    // s_dot' = s_dot

    // State transition
    this.x[0] += this.x[4];
    this.x[1] += this.x[5];
    this.x[2] += this.x[6];
    // Keep scale positive
    if (this.x[2] <= 0) this.x[2] = 1;

    // Transition matrix F:
    // [1 0 0 0 1 0 0]
    // [0 1 0 0 0 1 0]
    // [0 0 1 0 0 0 1]
    // [0 0 0 1 0 0 0]
    // [0 0 0 0 1 0 0]
    // [0 0 0 0 0 1 0]
    // [0 0 0 0 0 0 1]
    // Update P = F * P * F^T + Q
    const newP: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
    
    // Explicit multiplication for sparse F
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        let val = this.P[i][j];
        if (i < 3) val += this.P[i + 4][j];
        if (j < 3) {
          val += this.P[i][j + 4];
          if (i < 3) val += this.P[i + 4][j + 4];
        }
        newP[i][j] = val + this.Q[i][j];
      }
    }
    this.P = newP;

    return this.getStateBbox();
  }

  /**
   * Updates the state vector with observed bounding box [x, y, w, h].
   */
  public update(bbox: [number, number, number, number]): void {
    const [x, y, w, h] = bbox;
    const u = x + w / 2;
    const v = y + h / 2;
    const s = Math.max(1, w * h);
    const r = Math.max(0.01, w / Math.max(1, h));
    const z = [u, v, s, r];

    // Measurement matrix H is 4x7 (identity for first 4 elements, 0 for rest)
    // Residual y = z - H * x
    const yResidual = [
      z[0] - this.x[0],
      z[1] - this.x[1],
      z[2] - this.x[2],
      z[3] - this.x[3],
    ];

    // S = H * P * H^T + R (4x4 matrix, top-left 4x4 of P + R)
    const S: number[][] = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) => this.P[i][j] + this.R[i][j])
    );

    // Compute inverse of 4x4 matrix S (using Gaussian elimination / LU or block inversion)
    const SInv = invert4x4(S);
    if (!SInv) return; // Singular matrix guard

    // Kalman Gain K = P * H^T * SInv (7x4 matrix)
    // Since H is [I_4 | 0], P * H^T is the first 4 columns of P (7x4)
    const K: number[][] = Array.from({ length: 7 }, () => Array(4).fill(0));
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += this.P[i][k] * SInv[k][j];
        }
        K[i][j] = sum;
      }
    }

    // Update state x = x + K * yResidual
    for (let i = 0; i < 7; i++) {
      let delta = 0;
      for (let j = 0; j < 4; j++) {
        delta += K[i][j] * yResidual[j];
      }
      this.x[i] += delta;
    }
    if (this.x[2] <= 0) this.x[2] = 1;

    // Update covariance P = (I - K * H) * P
    // I_KH is 7x7: I_7 - [K | 0]
    const newP: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        let sum = this.P[i][j];
        for (let k = 0; k < 4; k++) {
          sum -= K[i][k] * this.P[k][j];
        }
        newP[i][j] = sum;
      }
    }
    this.P = newP;
  }

  /**
   * Converts current state [u, v, s, r] back to [x, y, w, h].
   */
  public getStateBbox(): [number, number, number, number] {
    const [u, v, s, r] = this.x;
    const safeS = Math.max(1, s);
    const safeR = Math.max(0.01, r);

    const w = Math.sqrt(safeS * safeR);
    const h = safeS / Math.max(1, w);
    const x = u - w / 2;
    const y = v - h / 2;

    return [x, y, Math.max(2, w), Math.max(2, h)];
  }

  /**
   * Returns estimated velocities: vx, vy, and scalar speed
   */
  public getVelocity(): { vx: number; vy: number; speed: number } {
    const vx = this.x[4];
    const vy = this.x[5];
    const speed = Math.sqrt(vx * vx + vy * vy);
    return { vx, vy, speed };
  }
}

/**
 * 4x4 Matrix Inversion using Gauss-Jordan elimination
 */
function invert4x4(matrix: number[][]): number[][] | null {
  const n = 4;
  const A: number[][] = matrix.map((row) => [...row]);
  const I: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    if (Math.abs(A[maxRow][i]) < 1e-8) {
      return null; // Singular
    }

    // Swap rows
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [I[i], I[maxRow]] = [I[maxRow], I[i]];

    // Normalize pivot row
    const pivot = A[i][i];
    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }

    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i];
      for (let j = 0; j < n; j++) {
        A[k][j] -= factor * A[i][j];
        I[k][j] -= factor * I[i][j];
      }
    }
  }

  return I;
}

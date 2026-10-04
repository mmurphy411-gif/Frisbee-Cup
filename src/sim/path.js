// Road centrelines as smoothed polylines, addressed by distance along the road (s)
// and signed offset to the right of travel (d).

export function catmullRom(ctrl, per = 14) {
  const pts = [];
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const c = (k) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      pts.push([c(0), c(1)]);
    }
  }
  pts.push(ctrl[ctrl.length - 1].slice());
  return pts;
}

export class Path {
  constructor(pts, width, name) {
    this.pts = pts;
    this.width = width;
    this.name = name;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  // Position and unit tangent at distance s along the path.
  at(s) {
    const { pts, cum } = this;
    s = Math.max(0, Math.min(this.length, s));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const seg = cum[hi] - cum[lo] || 1;
    const t = (s - cum[lo]) / seg;
    const dx = pts[hi][0] - pts[lo][0], dz = pts[hi][1] - pts[lo][1];
    return { x: pts[lo][0] + dx * t, z: pts[lo][1] + dz * t, tx: dx / seg, tz: dz / seg };
  }

  // Point d metres to the right of travel at distance s.
  offset(s, d) {
    const q = this.at(s);
    return { x: q.x - q.tz * d, z: q.z + q.tx * d, tx: q.tx, tz: q.tz };
  }

  // Nearest point on the centreline: distance along the path and signed offset
  // (positive to the right of travel).
  project(x, z) {
    const { pts, cum } = this;
    let best = Infinity, bs = 0, bd = 0;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], az = pts[i - 1][1];
      const dx = pts[i][0] - ax, dz = pts[i][1] - az;
      const L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const ex = x - (ax + dx * t), ez = z - (az + dz * t);
      const d2 = ex * ex + ez * ez;
      if (d2 < best) {
        best = d2;
        bs = cum[i - 1] + t * (cum[i] - cum[i - 1]);
        const L = Math.sqrt(L2);
        bd = (-(x - ax) * dz + (z - az) * dx) / L >= 0 ? Math.sqrt(d2) : -Math.sqrt(d2);
      }
    }
    return { s: bs, d: bd };
  }

  // Distance along the path where it first crosses x (axis 0) or z (axis 1) = value.
  sAlong(axis, value) {
    const { pts, cum } = this;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1][axis], b = pts[i][axis];
      if ((a - value) * (b - value) <= 0 && a !== b) return cum[i - 1] + ((value - a) / (b - a)) * (cum[i] - cum[i - 1]);
    }
    return Math.abs(pts[0][axis] - value) < Math.abs(pts[pts.length - 1][axis] - value) ? 0 : this.length;
  }

  // Unsigned distance from a point to the centreline.
  dist(x, z) {
    const { pts } = this;
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], az = pts[i - 1][1];
      const dx = pts[i][0] - ax, dz = pts[i][1] - az;
      const L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const ex = x - (ax + dx * t), ez = z - (az + dz * t);
      const d2 = ex * ex + ez * ez;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }
}

export function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

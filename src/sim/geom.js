// Geometry helpers: closed splines, polygons with signed distance, and a bucketed
// segment set for fast nearest-distance queries.

export const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const lerp = (a, b, t) => a + (b - a) * t;

// Catmull-Rom through a closed loop of control points.
export function closedSpline(ctrl, per = 8) {
  const n = ctrl.length, pts = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
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
  return pts;
}

// Line segments bucketed into a grid, for nearest-segment queries.
export class SegmentSet {
  constructor(pts, closed, cell = 10) {
    const n = closed ? pts.length : pts.length - 1;
    this.n = n;
    this.ax = new Float64Array(n); this.az = new Float64Array(n);
    this.bx = new Float64Array(n); this.bz = new Float64Array(n);
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      this.ax[i] = a[0]; this.az[i] = a[1]; this.bx[i] = b[0]; this.bz[i] = b[1];
      minX = Math.min(minX, a[0], b[0]); maxX = Math.max(maxX, a[0], b[0]);
      minZ = Math.min(minZ, a[1], b[1]); maxZ = Math.max(maxZ, a[1], b[1]);
    }
    this.minX = minX; this.maxX = maxX; this.minZ = minZ; this.maxZ = maxZ;
    this.cell = cell;
    this.cols = Math.max(1, Math.ceil((maxX - minX) / cell) + 1);
    this.rows = Math.max(1, Math.ceil((maxZ - minZ) / cell) + 1);
    this.buckets = Array.from({ length: this.cols * this.rows }, () => []);
    for (let i = 0; i < n; i++) {
      const x0 = Math.floor((Math.min(this.ax[i], this.bx[i]) - minX) / cell);
      const x1 = Math.floor((Math.max(this.ax[i], this.bx[i]) - minX) / cell);
      const z0 = Math.floor((Math.min(this.az[i], this.bz[i]) - minZ) / cell);
      const z1 = Math.floor((Math.max(this.az[i], this.bz[i]) - minZ) / cell);
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) this.buckets[iz * this.cols + ix].push(i);
    }
    this.out = { d: Infinity, i: -1, t: 0 };
  }

  // Nearest segment within maxR. Returns a shared { d, i, t } object.
  nearest(x, z, maxR = Infinity) {
    const out = this.out;
    out.d = Infinity; out.i = -1; out.t = 0;
    const ex = Math.max(this.minX - x, 0, x - this.maxX), ez = Math.max(this.minZ - z, 0, z - this.maxZ);
    if (Math.hypot(ex, ez) > maxR) return out;
    const { cell, cols, rows } = this;
    const cx = Math.floor((x - this.minX) / cell), cz = Math.floor((z - this.minZ) / cell);
    let best2 = Infinity;
    const maxRing = Math.min(Math.max(cols, rows) + Math.max(Math.abs(cx), Math.abs(cz)), Math.ceil(maxR / cell) + 2);
    for (let ring = 0; ring <= maxRing; ring++) {
      const lim = (ring - 1) * cell;
      if (lim > 0 && best2 <= lim * lim) break;
      for (let iz = cz - ring; iz <= cz + ring; iz++) {
        if (iz < 0 || iz >= rows) continue;
        const edge = iz === cz - ring || iz === cz + ring;
        for (let ix = cx - ring; ix <= cx + ring; ix += edge ? 1 : 2 * ring || 1) {
          if (ix < 0 || ix >= cols) continue;
          const list = this.buckets[iz * cols + ix];
          for (let k = 0; k < list.length; k++) {
            const i = list[k];
            const ax = this.ax[i], az = this.az[i];
            const dx = this.bx[i] - ax, dz = this.bz[i] - az;
            const L2 = dx * dx + dz * dz || 1e-9;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
            const qx = x - (ax + dx * t), qz = z - (az + dz * t);
            const d2 = qx * qx + qz * qz;
            if (d2 < best2) { best2 = d2; out.i = i; out.t = t; }
          }
          if (!edge && ring === 0) break;
        }
      }
    }
    out.d = Math.sqrt(best2);
    return out;
  }
}

// A closed polygon with an inside test and signed distance (negative inside).
export class Polygon {
  constructor(pts) {
    this.pts = pts;
    this.segs = new SegmentSet(pts, true, 8);
    const { minX, maxX, minZ, maxZ } = this.segs;
    this.bbox = { minX, maxX, minZ, maxZ };
    // horizontal bands of edges keep the crossing test short
    this.band = 3;
    this.bands = Array.from({ length: Math.ceil((maxZ - minZ) / this.band) + 1 }, () => []);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const b0 = Math.floor((Math.min(a[1], b[1]) - minZ) / this.band);
      const b1 = Math.floor((Math.max(a[1], b[1]) - minZ) / this.band);
      for (let k = b0; k <= b1; k++) this.bands[k].push(i);
    }
  }

  contains(x, z) {
    const { minX, maxX, minZ, maxZ } = this.bbox;
    if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
    const list = this.bands[Math.floor((z - minZ) / this.band)];
    const pts = this.pts, n = pts.length;
    let inside = false;
    for (let k = 0; k < list.length; k++) {
      const a = pts[list[k]], b = pts[(list[k] + 1) % n];
      if ((a[1] > z) !== (b[1] > z)) {
        const xi = a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
        if (xi > x) inside = !inside;
      }
    }
    return inside;
  }

  sdf(x, z, maxR = 200) {
    const d = Math.min(this.segs.nearest(x, z, maxR).d, maxR);
    return this.contains(x, z) ? -d : d;
  }
}

export function inQuad(x, z, quad) {
  let inside = false;
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const a = quad[i], b = quad[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

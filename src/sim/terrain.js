// Terrain heights. Each course supplies a height function; it is sampled once into a
// heightfield so the physics, the rendered mesh and the grass agree on one surface.
// World frame: +x east, +z south, +y up, metres.

export const WORLD = { halfW: 200, halfH: 150 };

export class Heightfield {
  constructor(halfW, halfH, step, fn) {
    this.halfW = halfW;
    this.halfH = halfH;
    this.step = step;
    this.nx = Math.round((2 * halfW) / step) + 1;
    this.nz = Math.round((2 * halfH) / step) + 1;
    this.data = new Float32Array(this.nx * this.nz);
    for (let j = 0; j < this.nz; j++) {
      const z = -halfH + j * step;
      for (let i = 0; i < this.nx; i++) this.data[j * this.nx + i] = fn(-halfW + i * step, z);
    }
  }

  // Interpolates across the same two triangles per cell that the rendered mesh uses.
  get(x, z) {
    const { nx, nz, step, data } = this;
    let fx = (x + this.halfW) / step, fz = (z + this.halfH) / step;
    fx = fx < 0 ? 0 : fx > nx - 1.0001 ? nx - 1.0001 : fx;
    fz = fz < 0 ? 0 : fz > nz - 1.0001 ? nz - 1.0001 : fz;
    const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz;
    const i = iz * nx + ix;
    const h00 = data[i], h10 = data[i + 1], h01 = data[i + nx], h11 = data[i + nx + 1];
    if (tx >= tz) return h00 + (h10 - h00) * tx + (h11 - h10) * tz;
    return h00 + (h11 - h01) * tx + (h01 - h00) * tz;
  }

  // Grade the ground level across a road, blending back to the hillside on each side.
  flattenRoad(path, half, shoulder) {
    const { nx, nz, step, data } = this;
    const reach = half + shoulder;
    const samples = [];
    for (let s = 0; s <= path.length; s += 0.75) {
      const q = path.at(s);
      samples.push([q.x, q.z, this.get(q.x, q.z)]);
    }
    if (!samples.length) return;
    // smooth the centreline so the road doesn't copy every bump in the hillside
    const hs = samples.map((_, i) => {
      let sum = 0, n = 0;
      for (let k = -8; k <= 8; k++) {
        const q = samples[i + k];
        if (q) { sum += q[2]; n++; }
      }
      return sum / n;
    });
    const best = new Float32Array(nx * nz).fill(Infinity);
    const target = new Float32Array(nx * nz);
    const r = Math.ceil(reach / step);
    for (let k = 0; k < samples.length; k++) {
      const [x, z] = samples[k];
      const ci = Math.round((x + this.halfW) / step), cj = Math.round((z + this.halfH) / step);
      for (let j = cj - r; j <= cj + r; j++) {
        if (j < 0 || j >= nz) continue;
        for (let i = ci - r; i <= ci + r; i++) {
          if (i < 0 || i >= nx) continue;
          const d = Math.hypot(-this.halfW + i * step - x, -this.halfH + j * step - z);
          const c = j * nx + i;
          if (d < best[c]) { best[c] = d; target[c] = hs[k]; }
        }
      }
    }
    for (let c = 0; c < data.length; c++) {
      const d = best[c];
      if (d >= reach) continue;
      const t = d <= half ? 1 : 1 - (d - half) / shoulder;
      const k = t * t * (3 - 2 * t);
      data[c] += (target[c] - data[c]) * k;
    }
  }
}

let active = null;
let flat = false;

export function setTerrain(hf) {
  active = hf;
  WORLD.halfW = hf.halfW;
  WORLD.halfH = hf.halfH;
}

export function getTerrain() {
  return active;
}

// Flight tuning in tools/sim_test.mjs wants level ground.
export function setFlatForTests(on) {
  flat = on;
}

export function groundHeight(x, z) {
  return flat || !active ? 0 : active.get(x, z);
}

const E = 0.5;
export function groundNormal(x, z, out) {
  const dx = (groundHeight(x + E, z) - groundHeight(x - E, z)) / (2 * E);
  const dz = (groundHeight(x, z + E) - groundHeight(x, z - E)) / (2 * E);
  const inv = 1 / Math.hypot(dx, 1, dz);
  out.x = -dx * inv;
  out.y = inv;
  out.z = -dz * inv;
  return out;
}

// Colliders for props only boardwalk (Starlight Pier) uses, keyed by prop type. See props/index.js.
// Every solid thing the renderer draws gets something here; open lattices (the coaster's
// bents, the Ferris wheel's spokes) are left with gaps a disc can slip through.
import { groundHeight } from '../terrain.js';

const post = (world, x, z, r, y0, y1, name = 'pole') =>
  world.addCircle({ t: 'cyl', x, z, r, y0, y1, e: 0.35, keep: 0.55, name }, r + 0.3);

// A straight member from (u0, y0, w0) to (u1, y1, w1) in the prop's frame, as a few boxes.
function strut(box, a, b, n, thick, name) {
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const u0 = a[0] + (b[0] - a[0]) * t0, u1 = a[0] + (b[0] - a[0]) * t1;
    const y0 = a[1] + (b[1] - a[1]) * t0, y1 = a[1] + (b[1] - a[1]) * t1;
    const w0 = a[2] + (b[2] - a[2]) * t0, w1 = a[2] + (b[2] - a[2]) * t1;
    box(Math.abs(u1 - u0) / 2 + thick, Math.abs(w1 - w0) / 2 + thick, Math.min(y0, y1) - thick, Math.max(y0, y1) + thick, name, (u0 + u1) / 2, (w0 + w1) / 2);
  }
}

export default {
  'boardwalk:ferris': (p, { box }) => {
    const R = p.R ?? 11, H = p.hub ?? 12.6;
    // A-frame legs, axle and hub
    for (const s of [-1, 1]) for (const e of [-1, 1]) strut(box, [e * 7, 0, s * 3.4], [0, H, s * 1.7], 5, 0.25, 'pole');
    box(1.2, 2.2, H - 1.2, H + 1.2, 'pole');
    box(9, 4.5, -0.5, 0.4, 'deck'); // loading platform
    // the rims, with the gondolas hanging from them
    const N = 24;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
      const u0 = R * Math.cos(a0), u1 = R * Math.cos(a1), y0 = H + R * Math.sin(a0), y1 = H + R * Math.sin(a1);
      box(Math.abs(u1 - u0) / 2 + 0.2, 1.35, Math.min(y0, y1) - 0.2, Math.max(y0, y1) + 0.2, 'pole', (u0 + u1) / 2, 0);
    }
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, u = R * Math.cos(a), yy = H + R * Math.sin(a);
      box(0.8, 1.0, yy - 2.3, yy - 0.6, 'car', u, 0);
      strut(box, [0, H, 0], [u, yy, 0], 4, 0.12, 'pole');
    }
  },

  'boardwalk:coaster': (p, { world }) => {
    const T = p.track, n = T.length;
    for (let i = 0; i < n; i++) {
      const a = T[i], b = T[(i + 1) % n];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, ang = Math.atan2(dz, dx);
      world.addRect({ t: 'box', cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, hu: len / 2 + 0.15, hv: 1.15, cos: Math.cos(ang), sin: Math.sin(ang),
        y0: Math.min(a[2], b[2]) - 1.0, y1: Math.max(a[2], b[2]) + 0.3, e: 0.3, keep: 0.55, name: 'rail' });
      if (!a[3]) continue;
      const nx = -dz / len, nz = dx / len;
      for (const s of [-1.2, 1.2]) {
        const x = a[0] + nx * s, z = a[1] + nz * s;
        post(world, x, z, 0.16, groundHeight(x, z) - 1, a[2] - 0.7, 'rail');
      }
    }
  },

  'boardwalk:arcade': (p, { world, y, cos, sin, box }) => {
    const h = p.h ?? 6;
    world.addRect({ t: 'house', cx: p.x, cz: p.z, hu: p.hu, hv: p.hv, cos, sin, base: y, wallH: h, roofH: 0.4, roof: 'hip', e: 0.25, keep: 0.5, name: 'house' });
    for (const s of p.both ? [-1, 1] : [p.front ?? 1]) {
      box(p.hu + 0.2, 0.25, 0, h + 4.2, 'house', 0, s * (p.hv + 0.15)); // the false front
      box(p.hu - 0.3, 1.15, 2.75, 3.55, 'house', 0, s * (p.hv + 1.15)); // the awning
    }
  },

  'boardwalk:booth': (p, { world, y, cos, sin, box }) => {
    const fr = p.front ?? 1, hu = p.hu ?? 2.2, hv = p.hv ?? 1.6;
    world.addRect({ t: 'house', open: true, cx: p.x + fr * 0.5 * -sin, cz: p.z + fr * 0.5 * cos, hu: hu + 0.1, hv: hv + 0.7, cos, sin,
      base: y + 2.6, wallH: 0, roofH: 0.45, roof: 'gable', e: 0.25, keep: 0.5, name: 'house' });
    box(hu, 0.12, -0.5, 2.6, 'house', 0, -fr * (hv - 0.1));
    for (const s of [-1, 1]) box(0.12, hv, -0.5, 2.6, 'house', s * (hu - 0.1), 0);
    box(hu, 0.3, -0.5, 1.1, 'bench', 0, fr * (hv - 0.3));
  },

  'boardwalk:food': (p, { world, y, cos, sin, box }) => {
    world.addRect({ t: 'house', cx: p.x, cz: p.z, hu: 2, hv: 1.6, cos, sin, base: y, wallH: 2.7, roofH: 0.3, roof: 'hip', e: 0.25, keep: 0.5, name: 'house' });
    box(1.6, 0.8, 2.9, 5.3, 'house');
  },

  'boardwalk:carousel': (p, { world, y, cos, sin, box }) => {
    const r = p.r ?? 8;
    world.addRect({ t: 'house', open: true, cx: p.x, cz: p.z, hu: r * 0.88, hv: r * 0.88, cos, sin,
      base: y + 3.8, wallH: 0, roofH: 2.6, roof: 'hip', e: 0.25, keep: 0.5, name: 'house' });
    post(world, p.x, p.z, 1.3, y - 1, y + 3.9, 'house');
    box(r * 0.7, r * 0.7, -0.5, 0.5, 'deck');
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, rr = r * 0.7;
      post(world, p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr, 0.09, y - 1, y + 3.8);
    }
  },

  'boardwalk:bandstand': (p, { world, y, cos, sin, box }) => {
    const r = p.r ?? 5;
    world.addRect({ t: 'house', open: true, cx: p.x, cz: p.z, hu: r + 0.3, hv: r + 0.3, cos, sin,
      base: y + 4.0, wallH: 0, roofH: 2.2, roof: 'hip', e: 0.25, keep: 0.5, name: 'house' });
    box(r * 0.8, r * 0.8, -0.5, 1.2, 'deck');
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2, rr = r - 0.3;
      post(world, p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr, 0.12, y - 1, y + 4.1);
    }
  },

  'boardwalk:lifeguard': (p, { world, y, cos, sin, box }) => {
    for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      post(world, p.x + u * 0.95 * cos - w * 0.95 * sin, p.z + u * 0.95 * sin + w * 0.95 * cos, 0.12, y - 1, y + 2.3);
    }
    box(1.3, 1.3, 2.1, 4.5, 'house');
  },

  'boardwalk:watertower': (p, { world, y }) => {
    const r = p.r ?? 3.6, top = p.h ?? 14;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
      post(world, p.x + Math.cos(a) * r * 0.75, p.z + Math.sin(a) * r * 0.75, 0.25, y - 1, y + top);
    }
    post(world, p.x, p.z, r, y + top - 0.3, y + top + 7.5, 'house');
  },

  'boardwalk:pole': (p, { world, y }) => post(world, p.x, p.z, 0.1, y - 1, y + (p.h ?? 5)),

  'boardwalk:rail': (p, { world, y }) => {
    const dx = p.x2 - p.x, dz = p.z2 - p.z, ang = Math.atan2(dz, dx);
    world.addRect({ t: 'box', rail: true, cx: (p.x + p.x2) / 2, cz: (p.z + p.z2) / 2, hu: Math.hypot(dx, dz) / 2, hv: 0.06,
      cos: Math.cos(ang), sin: Math.sin(ang), y0: y, y1: y + 0.95, e: 0.35, keep: 0.55, name: 'rail' });
  },

  'boardwalk:arch': (p, { y, box, world, cos, sin }) => {
    const s = p.span ?? 7, h = p.h ?? 5;
    for (const e of [-1, 1]) post(world, p.x + e * s * cos, p.z + e * s * sin, 0.75, y - 4, y + h + 1, 'house');
    const N = 10;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI, a1 = ((k + 1) / N) * Math.PI;
      const u0 = s * Math.cos(a0), u1 = s * Math.cos(a1), y0 = h + 3 * Math.sin(a0), y1 = h + 3 * Math.sin(a1);
      box(Math.abs(u1 - u0) / 2 + 0.2, 0.4, Math.min(y0, y1) - 0.3, Math.max(y0, y1) + 0.3, 'house', (u0 + u1) / 2, 0);
    }
    box(4, 0.3, h + 2.2, h + 4.4, 'house');
  },
};

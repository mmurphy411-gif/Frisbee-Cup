// Renderers for props only hilltown (Santa Brisa) uses, keyed by prop type. See props/index.js.
import { archSlices } from '../../sim/props/hilltown.js';

const WHITE = '#f7f4ec', STONE = '#d2c3a2', STONE_DARK = '#b5a584', TERRACOTTA = '#c4623a', SHADOW = '#3a3530';
const DOME = '#2f6fbf';

export default {
  'hilltown:dome'(p, { M }) {
    const r = p.r ?? 2.4, drum = p.drum ?? 1.0, y = p.y;
    M.walls.put('cyl', p.x, y + drum / 2 - 0.2, p.z, r * 2.02, drum + 0.4, r * 2.02, WHITE);
    M.detail.put('cyl', p.x, y + drum, p.z, r * 2.14, 0.14, r * 2.14, '#e9e4d8');
    M.roofs.put('smooth', p.x, y + drum, p.z, r * 2, r * 1.9, r * 2, p.color ?? DOME);
    M.detail.put('cyl', p.x, y + drum + r * 0.95 + 0.25, p.z, 0.5, 0.5, 0.5, WHITE);
    M.detail.put('box', p.x, y + drum + r * 0.95 + 0.9, p.z, 0.08, 0.8, 0.08, '#c9a23a');
    M.detail.put('box', p.x, y + drum + r * 0.95 + 1.05, p.z, 0.45, 0.08, 0.08, '#c9a23a', p.ang ?? 0);
  },

  // a whitewashed bell tower: cornices, an open belfry with its bell, a clock and a tiled cap
  'hilltown:campanile'(p, { M, f, y, roof }) {
    const w = p.w ?? 5, h = p.h ?? 24, top = y + h * 0.86, belfry = top - 3.6;
    M.walls.local(f, 'box', 0, (y - 1 + belfry) / 2, 0, w, belfry - y + 1, w, WHITE);
    for (const yy of [y + h * 0.3, y + h * 0.55, belfry]) M.detail.local(f, 'box', 0, yy, 0, w + 0.3, 0.3, w + 0.3, '#e6dfd0');
    // belfry: corner piers and a stone floor, open arches between
    for (const [u, w2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.walls.local(f, 'box', (u * (w - 0.8)) / 2, belfry + 1.8, (w2 * (w - 0.8)) / 2, 0.8, 3.6, 0.8, WHITE);
    for (const s of [-1, 1]) {
      M.walls.local(f, 'box', 0, top - 0.5, (s * (w - 0.3)) / 2, w, 1.0, 0.3, WHITE);
      M.walls.local(f, 'box', (s * (w - 0.3)) / 2, top - 0.5, 0, 0.3, 1.0, w, WHITE);
    }
    M.detail.local(f, 'box', 0, belfry + 0.1, 0, w - 0.2, 0.2, w - 0.2, STONE);
    M.detail.local(f, 'box', 0, belfry + 1.7, 0, w * 0.55, 3.2, w * 0.55, SHADOW);
    M.detail.put('cone', p.x, belfry + 1.9, p.z, 1.6, 1.5, 1.6, '#b8862f');
    M.detail.put('smooth', p.x, belfry + 2.7, p.z, 0.8, 0.5, 0.8, '#b8862f');
    M.detail.local(f, 'box', 0, top + 0.1, 0, w + 0.4, 0.25, w + 0.4, '#e6dfd0');
    roof(M, { ...f, hu: w / 2 + 0.1, hv: w / 2 + 0.1, base: top + 0.05, wallH: 0, roofH: h * 0.14, roof: 'hip', roofColor: TERRACOTTA, trim: '#e6dfd0' });
    M.detail.put('box', p.x, top + h * 0.14 + 0.6, p.z, 0.1, 1.2, 0.1, '#c9a23a');
    M.detail.put('box', p.x, top + h * 0.14 + 0.8, p.z, 0.6, 0.1, 0.1, '#c9a23a', -f.ang);
    // a clock on each face
    for (const [u, w2, rot] of [[1, 0, 0], [-1, 0, 0], [0, 1, 1], [0, -1, 1]]) {
      const cu = (u * w) / 2 + u * 0.03, cw = (w2 * w) / 2 + w2 * 0.03, cy = y + h * 0.62;
      M.detail.local(f, 'cyl', cu, cy, cw, 1.7, 0.06, 1.7, '#f8f6f0', rot ? Math.PI / 2 : 0, rot ? 0 : Math.PI / 2);
      M.detail.local(f, 'box', cu + u * 0.03, cy + 0.3, cw + w2 * 0.03, rot ? 0.08 : 0.04, 0.6, rot ? 0.04 : 0.08, '#1d1e22');
      M.detail.local(f, 'box', cu + u * 0.03 + (rot ? 0.2 : 0), cy, cw + w2 * 0.03 + (rot ? 0 : 0.2), rot ? 0.45 : 0.04, 0.07, rot ? 0.04 : 0.45, '#1d1e22');
    }
    // a door at the foot
    M.detail.local(f, 'box', w / 2 + 0.03, y + 1.3, 0, 0.06, 2.6, 1.4, '#5a3e2b');
  },

  'hilltown:fountain'(p, { M, y, theme }) {
    const r = p.r ?? 3;
    M.flat.put('cyl', p.x, y + 0.3, p.z, r * 2, 0.9, r * 2, STONE);
    M.flat.put('cyl', p.x, y + 0.78, p.z, r * 2 + 0.2, 0.12, r * 2 + 0.2, '#e3d8bf');
    M.flat.put('cyl', p.x, y + 0.66, p.z, r * 2 - 0.5, 0.08, r * 2 - 0.5, theme.water.shallow);
    M.flat.put('taper', p.x, y + 1.2, p.z, 0.9, 1.5, 0.9, '#e3d8bf');
    M.flat.put('cyl', p.x, y + 1.75, p.z, 2.6, 0.22, 2.6, STONE);
    M.flat.put('cyl', p.x, y + 1.88, p.z, 2.3, 0.05, 2.3, theme.water.shallow);
    M.flat.put('taper', p.x, y + 2.35, p.z, 0.5, 0.9, 0.5, '#e3d8bf');
    M.flat.put('cyl', p.x, y + 2.8, p.z, 1.1, 0.14, 1.1, STONE);
    M.flat.put('smooth', p.x, y + 3.05, p.z, 0.4, 0.5, 0.4, '#e3d8bf');
    // jets arcing from the top bowl into the basin
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2, d = 0.85;
      M.detail.put('box', p.x + Math.cos(a) * d, y + 2.25, p.z + Math.sin(a) * d, 0.07, 0.9, 0.07, '#cdeef6', -a, 0, 0.35);
      M.detail.put('box', p.x + Math.cos(a) * (r * 0.62), y + 1.2, p.z + Math.sin(a) * (r * 0.62), 0.07, 1.1, 0.07, '#cdeef6', -a, 0, 0.5);
    }
  },

  // a café table with two chairs
  'hilltown:table'(p, { M, f, y }) {
    M.detail.put('cyl', p.x, y + 0.76, p.z, 0.9, 0.05, 0.9, '#f4f1ea');
    M.detail.put('cyl', p.x, y + 0.38, p.z, 0.08, 0.76, 0.08, '#2b2b2b');
    M.detail.put('cyl', p.x, y + 0.02, p.z, 0.5, 0.04, 0.5, '#2b2b2b');
    for (const s of [-1, 1]) {
      M.detail.local(f, 'box', s * 0.85, y + 0.45, 0, 0.45, 0.05, 0.45, p.color ?? '#2f6fae');
      M.detail.local(f, 'box', s * 1.06, y + 0.72, 0, 0.05, 0.55, 0.45, p.color ?? '#2f6fae');
      for (const w of [-0.18, 0.18]) M.detail.local(f, 'box', s * 0.85, y + 0.22, w, 0.04, 0.45, 0.04, '#2b2b2b');
    }
  },

  // the archway: piers, a stepped stone soffit with a ring of voussoirs, a tiled coping and
  // pots of geraniums on the terrace above
  'hilltown:arch'(p, { M, f, y }) {
    const R = p.open / 2, pier = p.pier, t = p.thick, top = y + p.spring + R + p.over, outer = R + pier;
    const wall = p.color ?? WHITE;
    for (const s of [-1, 1]) M.walls.local(f, 'box', 0, (y - 1 + top) / 2, s * (R + pier / 2), t, top - y + 1, pier, wall);
    for (const sl of archSlices(p)) {
      if (sl.half >= R - 0.05) continue;
      const wid = R - sl.half;
      for (const s of [-1, 1]) M.walls.local(f, 'box', 0, y + (sl.y0 + sl.y1) / 2 + 0.01, s * (sl.half + wid / 2), t, sl.y1 - sl.y0 + 0.04, wid, wall);
    }
    M.walls.local(f, 'box', 0, y + p.spring + R + p.over / 2, 0, t, p.over + 0.02, R * 2 + 0.1, wall);
    // voussoir ring on both faces
    for (const s of [-1, 1]) {
      for (let k = 0; k <= 12; k++) {
        const a = (k / 12) * Math.PI, wv = Math.cos(a) * (R + 0.25), yv = y + p.spring + Math.sin(a) * (R + 0.25);
        M.detail.local(f, 'box', s * (t / 2 + 0.04), yv, wv, 0.1, 0.55, 0.55, k % 2 ? STONE : STONE_DARK, a);
      }
      M.detail.local(f, 'box', s * (t / 2 + 0.04), y + p.spring + R + 0.55, 0, 0.12, 0.7, 0.75, '#c9b98f');
      // a painted shrine above the keystone
    }
    for (const s of [-1, 1]) M.detail.local(f, 'box', 0, y + 0.18, s * (R + 0.2), t + 0.1, 0.36, 0.5, STONE);
    M.detail.local(f, 'box', 0, top + 0.12, 0, t + 0.3, 0.24, outer * 2 + 0.3, TERRACOTTA);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const w = s * (outer - 0.8 - k * 1.6);
        M.detail.local(f, 'cyl', 0, top + 0.5, w, 0.5, 0.5, 0.5, '#b0583a');
        M.flat.local(f, 'ball', 0, top + 0.95, w, 0.75, 0.55, 0.75, k % 2 ? '#d8344f' : '#3f8f3d');
      }
    }
    // a lantern under the crown
    M.detail.local(f, 'box', 0, y + p.spring + R - 0.3, 0, 0.06, 0.6, 0.06, '#1d1e22');
    M.glow.local(f, 'box', 0, y + p.spring + R - 0.75, 0, 0.3, 0.4, 0.3, '#ffffff');
  },

  'hilltown:rampart'(p, { M, f, y, rng }) {
    const t = p.t ?? 1.4, h = p.h;
    M.walls.local(f, 'box', 0, y + (h - 2) / 2, 0, p.hu * 2, h + 2, t, p.color ?? STONE);
    if (p.ruined) {
      for (let u = -p.hu + 0.6; u < p.hu; u += 1.6) M.flat.local(f, 'rock', u, y + h + 0.1, (rng() - 0.5) * 0.4, 1.2, 0.5 + rng() * 0.5, t * 0.9, rng() < 0.5 ? STONE : STONE_DARK);
      return;
    }
    M.detail.local(f, 'box', 0, y + h - 0.05, 0, p.hu * 2 + 0.06, 0.18, t + 0.16, STONE_DARK);
    for (let u = -p.hu + 0.45; u < p.hu - 0.2; u += 1.5) M.walls.local(f, 'box', u, y + h + 0.45, 0, 0.8, 0.9, t, p.color ?? STONE);
  },

  'hilltown:tower'(p, { M, f, y, rng }) {
    const h = p.h, r = p.r;
    if (p.sq) {
      M.walls.local(f, 'box', 0, y + (h - 2) / 2, 0, r * 2, h + 2, r * 2, STONE);
      for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.walls.local(f, 'box', u * (r - 0.4), y + h + 0.5, w * (r - 0.4), 0.8, 1.0, 0.8, STONE);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          M.detail.local(f, 'box', s * (r + 0.02), y + 2 + k * 3.2, (k - 1) * 1.2, 0.06, 1.0, 0.45, SHADOW);
          M.detail.local(f, 'box', (k - 1) * 1.2, y + 3.6 + k * 3.2, s * (r + 0.02), 0.45, 1.0, 0.06, SHADOW);
        }
      }
      return;
    }
    M.walls.put('taper', p.x, y + (h - 2) / 2, p.z, r * 2.15, h + 2, r * 2.15, STONE);
    M.detail.put('cyl', p.x, y + h - 0.1, p.z, r * 2 + 0.3, 0.3, r * 2 + 0.3, STONE_DARK);
    const n = Math.max(6, Math.round(r * 3));
    for (let k = 0; k < n; k++) {
      if (p.ruined && rng() < 0.45) continue;
      const a = (k / n) * Math.PI * 2;
      M.walls.put('box', p.x + Math.cos(a) * (r - 0.25), y + h + 0.45, p.z + Math.sin(a) * (r - 0.25), 0.7, 0.9, 0.5, STONE, -a);
    }
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.5;
      M.detail.put('box', p.x + Math.cos(a) * r * 0.98, y + h * (0.35 + k * 0.2), p.z + Math.sin(a) * r * 0.98, 0.3, 1.0, 0.12, SHADOW, -a + Math.PI / 2);
    }
  },

  // a little wooden fishing boat, brightly painted
  'hilltown:boat'(p, { M, f, y }) {
    const len = p.len ?? 6, beam = p.beam ?? 2.2;
    M.detail.local(f, 'smooth', 0, y + 0.15, 0, len, 0.9, beam, p.color ?? '#2f6fae');
    M.detail.local(f, 'smooth', 0, y + 0.42, 0, len * 0.94, 0.3, beam * 0.92, '#f4f1ea');
    M.detail.local(f, 'box', 0, y + 0.5, 0, len * 0.72, 0.08, beam * 0.62, '#a07a52');
    for (const s of [-1, 1]) M.detail.local(f, 'box', s * len * 0.47, y + 0.75, 0, 0.12, 0.5, 0.12, '#a07a52');
    if (p.cabin) {
      M.walls.local(f, 'box', -len * 0.08, y + 1.05, 0, len * 0.28, 1.0, beam * 0.55, '#f4f1ea');
      M.roofs.local(f, 'box', -len * 0.08, y + 1.6, 0, len * 0.32, 0.1, beam * 0.62, p.trim ?? '#c4623a');
    } else {
      M.detail.local(f, 'box', len * 0.1, y + 2.0, 0, 0.1, 3.0, 0.1, '#8a6a4a');
    }
  },

  // a harbour light at the end of the mole
  'hilltown:light'(p, { M, y }) {
    M.walls.put('taper', p.x, y + 3.2, p.z, 1.8, 6.4, 1.8, '#f4f1ea');
    for (const yy of [1.2, 3.2, 5.2]) M.walls.put('cyl', p.x, y + yy, p.z, 1.62, 0.9, 1.62, p.color ?? '#2f9a4a');
    M.detail.put('cyl', p.x, y + 6.5, p.z, 1.8, 0.2, 1.8, '#2f3640');
    M.glow.put('cyl', p.x, y + 7.0, p.z, 0.8, 0.8, 0.8, '#ffffff');
    M.roofs.put('cone', p.x, y + 7.7, p.z, 1.2, 0.7, 1.2, p.color ?? '#2f9a4a');
  },

  'hilltown:bollard'(p, { M, y }) {
    M.detail.put('cyl', p.x, y + 0.3, p.z, 0.32, 0.6, 0.32, '#2f3640');
    M.detail.put('cyl', p.x, y + 0.62, p.z, 0.42, 0.08, 0.42, '#2f3640');
  },

  // a flight of stone steps up the hillside, with low whitewashed walls each side
  'hilltown:stairs'(p, { M, G }) {
    const dx = p.bx - p.ax, dz = p.bz - p.az, len = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
    const f = { cx: p.ax, cz: p.az, cos: dx / len, sin: dz / len, ang };
    const n = Math.round(len / 0.8), tread = len / n, half = p.width / 2;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) * tread, gx = p.ax + f.cos * u, gz = p.az + f.sin * u, gy = G(gx, gz);
      M.flat.local(f, 'box', u, gy - 0.5 + 0.03, 0, tread + 0.02, 1.0, p.width, k % 2 ? '#e6dcc6' : '#ddd2ba');
      M.detail.local(f, 'box', u - tread / 2 + 0.04, gy + 0.035, 0, 0.08, 0.02, p.width, '#c9bc9f');
    }
    for (const s of [-1, 1]) {
      for (let k = 0; k < n; k += 2) {
        const u = (k + 1) * tread, gx = p.ax + f.cos * u - s * (half + 0.25) * f.sin, gz = p.az + f.sin * u + s * (half + 0.25) * f.cos;
        M.walls.local(f, 'box', u, G(gx, gz) + 0.05, s * (half + 0.25), tread * 2 + 0.05, 0.6, 0.4, WHITE);
      }
    }
  },

  // bougainvillea tumbling down a wall
  'hilltown:bloom'(p, { M, f, rng }) {
    const colors = ['#d81b7a', '#e0388f', '#b5179e', '#f04fa0', '#c2185b'];
    for (let k = 0; k < (p.n ?? 9); k++) {
      const u = (rng() - 0.5) * (p.spread ?? 2.4), yy = p.y + rng() * (p.h ?? 3), s = 0.55 + rng() * 0.5;
      M.flat.local(f, 'ball', u, yy, 0.25 + rng() * 0.2, s * 1.3, s, s, rng() < 0.25 ? '#3f7f35' : colors[Math.floor(rng() * colors.length)]);
    }
  },

  // lemons hanging in a lemon tree
  'hilltown:lemons'(p, { M, rng }) {
    for (let k = 0; k < (p.n ?? 10); k++) {
      const a = rng() * 6.3, d = (0.4 + rng() * 0.6) * p.spread, yy = p.y + (rng() - 0.3) * p.spread * 0.9;
      M.detail.put('smooth', p.x + Math.cos(a) * d, yy, p.z + Math.sin(a) * d, 0.2, 0.15, 0.15, '#f2d43a', a);
    }
  },

  // a rooftop water tank or a pergola of vines on a flat roof terrace
  'hilltown:roofdeco'(p, { M, f }) {
    if (p.kind === 'pergola') {
      for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.detail.local(f, 'box', u * 1.4, p.y + 1.1, w * 1.1, 0.12, 2.2, 0.12, '#8a6a4a');
      for (let k = -2; k <= 2; k++) M.detail.local(f, 'box', k * 0.7, p.y + 2.25, 0, 0.1, 0.1, 2.6, '#8a6a4a');
      M.flat.local(f, 'ball', 0, p.y + 2.35, 0, 3.2, 0.35, 2.6, '#5f8f3a');
    } else {
      M.detail.local(f, 'cyl', 0, p.y + 0.55, 0, 1.0, 1.1, 1.0, '#e8e4da', Math.PI / 2);
      for (const s of [-1, 1]) M.detail.local(f, 'box', s * 0.3, p.y + 0.15, 0, 0.1, 0.3, 0.9, '#9a958c');
    }
  },
};

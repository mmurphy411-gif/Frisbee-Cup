// Course 5: Canal Isles. Three canals run up from the harbor between island streets, and
// every yard backs onto the water. Carry the canal heads, play the backyard alleys, go
// straight up Harbor Lane, through the park and out to a basket at the end of the pier.
import { smoothstep } from '../geom.js';
import { LAKESIDE } from './themes.js';

const L = 1.5; // harbor level
const CANALS = [-120, 0, 120]; // centre x of each canal
const HALF = 11; // canal half width
const HEAD = -52; // where the straight canal sides end and the rounded head begins

// Cut each sharp corner of a polyline outline into two points c metres either side.
function chamfer(pts, c) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]), lq = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ca = Math.min(c, la / 2), cq = Math.min(c, lq / 2);
    out.push([p[0] + ((a[0] - p[0]) / la) * ca, p[1] + ((a[1] - p[1]) / la) * ca]);
    out.push([p[0] + ((q[0] - p[0]) / lq) * cq, p[1] + ((q[1] - p[1]) / lq) * cq]);
  }
  return out;
}

function shoreline() {
  const pts = [[-215, 96]];
  for (const cx of CANALS) {
    pts.push([cx - HALF, 96], [cx - HALF, HEAD], [cx - 7, HEAD - 8], [cx, HEAD - 11], [cx + 7, HEAD - 8], [cx + HALF, HEAD], [cx + HALF, 96]);
  }
  pts.push([215, 96], [215, 170], [-215, 170]);
  return chamfer(pts, 3);
}

function height(water, x, z) {
  const sd = water.poly.sdf(x, z, 60);
  if (sd < 0) return L - Math.min(2.4, 0.9 + -sd * 0.45);
  const roll = 0.45 * Math.sin(0.023 * x + 0.4) * Math.cos(0.019 * z - 0.6) + 0.25 * Math.sin(0.05 * x - 0.04 * z);
  return L + 1.1 + Math.min(sd, 4) * 0.12 + (0.5 + roll) * smoothstep(4, 20, sd) + 2.6 * smoothstep(-60, -150, z);
}

export default {
  id: 'canals',
  name: 'Canal Isles',
  blurb: 'Carries over the canals, backyard alleys and a basket at the end of the pier.',
  seed: 5150,
  world: { halfW: 200, halfH: 150 },
  theme: LAKESIDE,

  create(b) {
    // ------------------------------------------------------------- plan
    const bayshore = b.road(
      [[-215, -96], [-100, -102], [0, -100], [100, -103], [215, -98]],
      { width: 8, name: 'Bayshore Blvd', lawn: 30, lines: true },
    );
    const streets = [
      b.road([[-172, -99], [-172, 40], [-172, 86]], { width: 6.5, name: 'Gull Way', lawn: 30 }),
      b.road([[-60, -101], [-60, 40], [-60, 86]], { width: 6.5, name: 'Marina Way', lawn: 30 }),
      b.road([[60, -101], [60, 40], [60, 86]], { width: 6.5, name: 'Harbor Ln', lawn: 30 }),
    ];
    const water = b.lake(shoreline(), L, { name: 'canal', per: 2 });
    b.terrain((x, z) => height(water, x, z));
    b.lawnArea([[133, -64], [200, -64], [200, 94], [133, 94]]); // Harbor Park
    b.pavedArea([[140, -92], [196, -92], [196, -70], [140, -70]]); // marina lot
    for (const s of streets) b.pavedArea([[s.pts[0][0] - 7, 80], [s.pts[0][0] + 7, 80], [s.pts[0][0] + 7, 92], [s.pts[0][0] - 7, 92]]);
    b.footpath([[133, 90], [160, 88], [196, 90]], { name: 'Seawall walk' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Canal Head', par: 3, tee: { x: -158, z: -78 }, basket: { x: -92, z: -50 },
        trees: [[{ x: -140, z: -86 }, 3.6, 'broad'], [{ x: -98, z: -62 }, 3.2, 'willow']],
      },
      {
        name: 'Backwater', par: 4, tee: { x: -95, z: -40 }, basket: { x: -96, z: 66 }, corridor: 5,
        trees: [[{ x: -100, z: -6 }, 3.4, 'willow'], [{ x: -90, z: 24 }, 3.8, 'broad'], [{ x: -101, z: 46 }, 3, 'willow']],
      },
      {
        name: 'Harbor Carry', par: 3, tee: { x: -28, z: 84 }, basket: { x: 25, z: 60 },
        trees: [[{ x: 30, z: 68 }, 3, 'willow']],
      },
      {
        name: 'Harbor Lane', par: 4, tee: { x: 60, z: 78 }, basket: { x: 60, z: -50 },
        trees: [[{ x: 69, z: 30 }, 4.2, 'broad'], [{ x: 51, z: -8 }, 4.4, 'broad'], [{ x: 70, z: -36 }, 3.6, 'broad']],
        cars: [[{ x: 57.6, z: 46 }, Math.PI / 2], [{ x: 62.4, z: 10 }, -Math.PI / 2]],
      },
      {
        name: 'Point Break', par: 3, tee: { x: 72, z: -72 }, basket: { x: 150, z: -40 },
        trees: [[{ x: 158, z: -48 }, 3.6, 'broad'], [{ x: 96, z: -76 }, 3.4, 'birch']],
      },
      {
        name: 'Harbor Park', par: 4, tee: { x: 160, z: -28 }, basket: { x: 156, z: 82 }, via: [{ x: 178, z: 30 }],
        trees: [[{ x: 160, z: 6 }, 5, 'broad'], [{ x: 186, z: 14 }, 4.5, 'broad'], [{ x: 162, z: 50 }, 4.8, 'willow'], [{ x: 176, z: 66 }, 4, 'broad']],
      },
      {
        name: 'Pier Pressure', par: 3, tee: { x: 101, z: 82 }, basket: { x: 60, z: 128 },
        trees: [],
      },
      {
        name: 'Crosscurrent', par: 4, tee: { x: 36, z: 30 }, basket: { x: -24, z: -44 },
        trees: [[{ x: 26, z: 18 }, 3.2, 'willow'], [{ x: -22, z: -28 }, 3.4, 'broad']],
      },
      {
        name: 'Bayshore', par: 4, tee: { x: -22, z: -76 }, basket: { x: -146, z: -50 }, via: [{ x: -90, z: -82 }],
        trees: [[{ x: -48, z: -84 }, 4, 'broad'], [{ x: -74, z: -74 }, 3.6, 'broad'], [{ x: -136, z: -66 }, 3.4, 'willow']],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------- piers and bridges
    b.span({ x: 60, z: 93 }, { x: 60, z: 122 }, 3, L + 0.7, { kind: 'dock' });
    b.platform({ kind: 'dock', x: 60, z: 126, hu: 5, hv: 4.5, ang: 0, top: L + 0.7 });
    const bridge = (x, z) => b.span({ x: x - HALF - 3, z }, { x: x + HALF + 3, z }, 2.6, L + 1.9, { kind: 'bridge', rails: true });
    bridge(-120, 22);
    bridge(0, -30);
    bridge(120, 4);

    // ----------------------------------------------------------- houses
    const homes = [];
    for (const st of streets) {
      for (let s = 22; s < st.length - 20; s += 23) {
        for (const side of [-1, 1]) {
          const h = b.houseIfClear(st, s + (side > 0 ? 11 : 0), side, { fenceChance: 0.3, hoopChance: 0.2 });
          if (h) homes.push(h);
        }
      }
    }
    for (let s = 20; s < bayshore.length - 10; s += 26) b.houseIfClear(bayshore, s, -1);
    // a dock behind every house that backs onto a canal, and the odd pool
    for (const h of homes) {
      // local w axis is (-sin, cos); the back of the house is at w = -front
      const wx = -h.sin * -h.front, wz = h.cos * -h.front;
      let d = h.hv + 4;
      while (d < 50 && !b.wet(h.cx + wx * d, h.cz + wz * d, 0)) d += 1;
      if (d >= 50) continue;
      const a = { x: h.cx + wx * (d - 2), z: h.cz + wz * (d - 2) }, c = { x: h.cx + wx * (d + 6), z: h.cz + wz * (d + 6) };
      if (!b.inCorridor(a.x, a.z, 4) && !b.inCorridor(c.x, c.z, 4)) b.span(a, c, 2, L + 0.55, { kind: 'dock' });
      if (b.chance(0.3)) {
        const p = { x: h.cx + wx * (h.hv + 8), z: h.cz + wz * (h.hv + 8) };
        const pr = { cx: p.x, cz: p.z, hu: 4.4, hv: 2.8, cos: h.cos, sin: h.sin };
        if (b.rectClear(pr, 3) && !b.wet(p.x + wx * 4, p.z + wz * 4, 0.4)) b.pool(p, h.ang, 4.4, 2.8);
      }
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, ang] of h.cars || []) b.car(p, ang);
    }
    for (const [x, z, ang] of [[146, -86, 0], [146, -80, 0], [146, -74, 0], [164, -86, Math.PI], [164, -76, Math.PI], [182, -84, 0], [190, -74, Math.PI]]) b.car({ x, z }, ang);
    b.prop('swing', 190, 64, { ang: 1.6, r: 2.6 });
    b.prop('slide', 192, 44, { ang: 1.4, r: 2 });
    b.prop('gazebo', 190, -6, { size: 4.2, r: 3.5 });
    for (const [x, z, ang] of [[-150, 90, 0], [-80, 90, 0], [-34, 90, 0], [86, 90, 0], [140, 88, 0], [180, 88, 0]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang, r: 1 });
    }
    b.prop('canoe', 150, 92, { ang: 0.1, r: 2.4, color: '#d9534f' });
    b.prop('canoe', 172, 91, { ang: -0.1, r: 2.4, color: '#f2b134' });
    b.prop('bin', 176, 84, { r: 0.5 });
    b.lampsAlong(bayshore, 60, 5, 30);
    for (const st of streets) b.lampsAlong(st, 55, 4.2, 30);
    for (const cx of CANALS) {
      for (const z of [-20, 40]) b.ducks.push({ x: cx, z, r: 6, speed: 0.35 + b.rng() * 0.3, phase: b.rng() * 6.3 });
    }
    b.ducks.push({ x: -60, z: 120, r: 12, speed: 0.4, phase: 2 });

    // ------------------------------------------------------------ trees
    b.scatter(7000, (x, z) => {
      const u = b.rng();
      if (x > 133 && z > -64) {
        if (b.rng() > 0.3) return null; // Harbor Park
        return { kind: u < 0.65 ? 'broad' : 'willow', r: b.R(3.5, 6) };
      }
      if (z < -108) return { kind: u < 0.6 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.2 };
      if (b.rng() > 0.22) return null; // yards stay open
      const kind = u < 0.5 ? 'broad' : u < 0.7 ? 'willow' : u < 0.85 ? 'birch' : 'bush';
      return { kind, r: kind === 'bush' ? b.R(2.2, 3.2) : b.R(2.8, 4.8), shoreRise: 0.8 };
    });
  },
};

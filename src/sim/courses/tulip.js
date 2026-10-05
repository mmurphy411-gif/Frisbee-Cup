// Tulip Gardens. A spring garden district round the botanical park: open through the
// park gate, play up Bloom St, climb to the gazebo knoll, run the hedgerow along Garden
// Ave, drop through the bluebell wood, carry the lily pond over the footbridge, thread
// the rose garden, stroll Tulip Ln and finish back by the reflecting pool at the gate.
import { smoothstep } from '../geom.js';
import { segDist } from '../path.js';
import { SPRING } from './themes.js';

const POND = { x: -58, z: 18 };
const KNOLL = { x: 4, z: -54 }; // the gazebo knoll
const WEST = { x: -152, z: -30 }; // the bluebell rise
const BULB = { x: 176, z: -4, r: 11 }; // Lilac Ct turning circle
const GREENS = ['#6fb352', '#7fbf5a', '#5ea84a', '#68ad4b'];
const BLOSSOM = ['#f2a7c3', '#f7c6d9', '#ffffff', '#e889ad'];

function base(x, z) {
  const kx = x - KNOLL.x, kz = z - KNOLL.z, wx = x - WEST.x, wz = z - WEST.z;
  return (
    7 + 6 * Math.exp(-(kx * kx + kz * kz) / 1300) + 4.5 * Math.exp(-(wx * wx + wz * wz) / 1500) +
    1.4 * Math.sin(0.017 * x + 0.4) * Math.cos(0.021 * z - 0.3) + 0.5 * Math.sin(0.043 * x - 0.031 * z + 1.1) - 0.008 * z
  );
}

function land(x, z) {
  let h = base(x, z);
  // the turning circle is levelled
  const d = Math.hypot(x - BULB.x, z - BULB.z);
  if (d < BULB.r + 8) h += (base(BULB.x, BULB.z) - h) * (1 - smoothstep(BULB.r, BULB.r + 8, d));
  // the lily pond: a shallow oval bowl, longer east to west
  const px = (x - POND.x) / 1.4, pz = z - POND.z;
  return h - 4.5 * Math.exp(-(px * px + pz * pz) / 800);
}

const ring = (c, r, n = 24, rz = r) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + rz * Math.sin((i / n) * Math.PI * 2)]);

// A point a fraction t of the way from a to c, d metres to the right of travel.
const along = (a, c, t, d = 0) => {
  const dx = c.x - a.x, dz = c.z - a.z, l = Math.hypot(dx, dz) || 1;
  return { x: a.x + dx * t - (dz / l) * d, z: a.z + dz * t + (dx / l) * d };
};

export default {
  id: 'tulip',
  name: 'Tulip Gardens',
  blurb: 'Spring in the botanical park: blossom walks, a gazebo knoll and a lily pond carry.',
  seed: 4708,
  world: { halfW: 200, halfH: 150 },
  theme: SPRING,

  create(b) {
    // ------------------------------------------------------------- plan
    // Garden Ave runs east along the north edge (side -1 is the north, away from the park)
    const garden = b.road(
      [[-215, -100], [-120, -106], [-20, -99], [80, -105], [215, -98]],
      { width: 7, name: 'Garden Ave', lawn: 30 },
    );
    // Tulip Ln runs east along the south edge (side +1 is the south, away from the park)
    const tulip = b.road(
      [[-215, 104], [-100, 99], [0, 106], [100, 99], [215, 104]],
      { width: 7, name: 'Tulip Ln', lawn: 30, lines: true },
    );
    // Bloom St runs south down the east side (side +1 is the west, the park side)
    const bloom = b.road(
      [[122, -165], [124, -100], [118, 0], [124, 99], [122, 165]],
      { width: 6.5, name: 'Bloom St', lawn: 30 },
    );
    const lilac = b.road([[120, -2], [150, -6], [BULB.x, BULB.z]], { width: 6, name: 'Lilac Ct', lawn: 22 });
    const pondLevel = land(POND.x, POND.z) + 2;
    b.terrain(land);
    b.pond(POND.x, POND.z, 36, pondLevel, 'lily pond');
    b.clearZone(POND.x, POND.z, 30);
    b.pavedArea(ring(BULB, BULB.r));
    b.lawnArea(ring(BULB, 5));

    // the botanical park: mown lawns, winding walks and a loop round the pond
    b.lawnArea([[-175, -84], [100, -86], [104, 86], [-175, 84]]);
    b.footpath([[30, 102], [36, 82], [22, 64], [28, 44], [14, 22], [20, 0], [8, -24], [6, -44]], { name: 'Blossom Walk' });
    b.footpath([[6, -44], [-20, -60], [-60, -70], [-100, -66], [-130, -50], [-150, -20]], { name: 'Bluebell Walk' });
    const loop = ring(POND, 44, 16, 33);
    b.footpath([...loop, loop[0]], { name: 'Pond Loop' });
    b.footpath([[-150, -20], [-142, 20], [-112, 50], [-102, 52]], { name: 'Primrose Walk' });
    b.footpath([[-14, 54], [-40, 60], [-70, 64], [-100, 74], [-120, 96]], { name: 'Rose Walk' });

    // ------------------------------------------------------------ holes
    // Trees on each hole are [point, canopy radius, kind, blossom?].
    const T = (h, t, d) => along(h.tee, h.via ? h.via[0] : h.basket, t, d);
    const V = (h, t, d) => along(h.via[0], h.basket, t, d);
    const holes = [
      { name: 'Garden Gate', par: 3, tee: { x: 62, z: 54 }, basket: { x: 104, z: 8 } },
      { name: 'Bloom Street', par: 4, tee: { x: 110, z: -2 }, via: [{ x: 106, z: -58 }], basket: { x: 60, z: -84 } },
      { name: 'Gazebo Hill', par: 3, tee: { x: 56, z: -94 }, basket: { x: 14, z: -46 } },
      { name: 'Hedgerow', par: 4, tee: { x: -6, z: -66 }, via: [{ x: -58, z: -84 }], basket: { x: -112, z: -80 } },
      { name: 'Bluebell Wood', par: 3, tee: { x: -122, z: -72 }, basket: { x: -152, z: -22 } },
      { name: 'Lily Pond', par: 3, tee: { x: -112, z: 10 }, basket: { x: -16, z: 22 } },
      { name: 'Rose Garden', par: 3, tee: { x: -22, z: 36 }, basket: { x: -86, z: 70 } },
      { name: 'Tulip Lane', par: 4, tee: { x: -98, z: 80 }, via: [{ x: -40, z: 88 }], basket: { x: 6, z: 80 } },
      { name: 'Last Petal', par: 3, tee: { x: 10, z: 72 }, basket: { x: 50, z: 30 } },
    ];
    const [h1, h2, h3, h4, h5, h6, h7, h8, h9] = holes;
    h1.trees = [[T(h1, 0.38, 8), 3.4, 'broad', 1], [T(h1, 0.62, -8.5), 3.6, 'broad'], [T(h1, 1.08, -9), 3.2, 'birch'], [T(h1, 1.16, 5), 2.2, 'bush']];
    h2.trees = [[T(h2, 0.3, -8), 3.4, 'broad', 1], [T(h2, 0.62, 8), 3.6, 'broad'], [T(h2, 0.95, -9), 3.2, 'birch'],
      [V(h2, 0.35, 8), 3.8, 'broad', 1], [V(h2, 0.6, -8), 3.4, 'broad'], [V(h2, 0.92, -7), 2.2, 'bush'],
      // a blossom grove fills the inside of the dogleg
      [{ x: 88, z: -42 }, 3.8, 'broad', 1], [{ x: 80, z: -52 }, 3.4, 'broad', 1], [{ x: 92, z: -30 }, 3.2, 'broad', 1], [{ x: 76, z: -40 }, 3, 'broad', 1]];
    h3.trees = [[T(h3, 0.35, -8), 3.6, 'broad', 1], [T(h3, 0.6, 8), 3.2, 'birch'], [T(h3, 0.85, -7.5), 2.4, 'bush']];
    h4.trees = [[T(h4, 0.45, -8), 3.6, 'broad', 1], [T(h4, 0.75, 8), 3.4, 'broad'],
      [V(h4, 0.3, -8.5), 3.6, 'broad', 1], [V(h4, 0.65, 8), 3.4, 'birch'], [V(h4, 1.12, 5), 2.4, 'bush']];
    h5.trees = [[T(h5, 0.3, 7.5), 3.2, 'birch'], [T(h5, 0.55, -7.5), 3.4, 'birch'], [T(h5, 0.8, 7), 3, 'birch'], [T(h5, 1.12, -4), 2.2, 'bush']];
    h6.trees = [[T(h6, 0.12, -9), 3.4, 'willow'], [T(h6, 0.92, 8.5), 3.6, 'willow'], [T(h6, 1.1, -6), 3.2, 'broad', 1]];
    h7.trees = [[T(h7, 0.3, 8.5), 3.4, 'broad', 1], [T(h7, 0.62, -8), 3.2, 'broad', 1], [T(h7, 1.1, 6), 2.4, 'bush']];
    h8.trees = [[T(h8, 0.4, -8), 3.6, 'broad', 1], [T(h8, 0.8, 8), 3.4, 'broad'],
      [V(h8, 0.4, -8), 3.4, 'broad', 1], [V(h8, 0.7, 8.5), 3.2, 'birch'], [V(h8, 1.12, 5), 2.2, 'bush']];
    h9.trees = [[T(h9, 0.35, -8), 3.4, 'broad', 1], [T(h9, 0.65, 8), 3.6, 'broad', 1], [T(h9, 1.12, 5), 2.2, 'bush']];
    for (const h of holes) b.hole(h);

    // ---------------------------------------------------- the footbridge
    // across the west end of the pond, wherever the water actually is
    {
      const bx = POND.x - 16;
      let z0 = null, z1 = null;
      for (let z = POND.z - 40; z <= POND.z + 40; z += 0.5) {
        if (b.hf.get(bx, z) < pondLevel + 0.2) { if (z0 === null) z0 = z; z1 = z; }
      }
      if (z0 !== null) {
        b.span({ x: bx, z: z0 - 2.5 }, { x: bx, z: z1 + 2.5 }, 2.4, pondLevel + 0.7, { kind: 'bridge', rails: true });
        // short walks join the bridge to the pond loop
        const lz = 33 * Math.sqrt(1 - (16 / 44) ** 2);
        b.footpath([[bx, POND.z - lz - 1], [bx, z0 - 2]], { name: 'Bridge Walk' });
        b.footpath([[bx, z1 + 2], [bx, POND.z + lz + 1]], { name: 'Bridge Walk' });
      }
    }

    // ----------------------------------------------------------- houses
    // Every house gets a neat clipped hedge along the front of its lot (laid once all the
    // lots are drawn), broken for driveways, mailboxes and lines of play.
    const fronts = [];
    const hedged = (h) => {
      if (h && h.kind === 'house') fronts.push(h);
    };
    const lot = (path, s, side, o = {}) => hedged(b.houseIfClear(path, s, side, { fenceChance: 0.18, ...o }));
    const lots = (path, xs, side, axis = 0) => { for (const v of xs) lot(path, path.sAlong(axis, v), side); };
    lots(garden, [-185, -160, -135, -110, -85, -60, -35, -10, 15, 40, 65, 90, 150, 175], -1);
    lots(garden, [-190, -165, 160, 185], 1);
    lots(tulip, [-185, -160, -135, -110, -85, -60, -35, -10, 15, 40, 65, 90, 150, 175], 1);
    lots(tulip, [-190, 160, 185], -1);
    lots(bloom, [-140, -118, -72, -46, -26, 28, 52, 76, 128, 150], -1, 1);
    lots(bloom, [-140, -118, 128, 150], 1, 1);
    for (let s = 20; s < lilac.length - 14; s += 22) {
      lot(lilac, s, -1, { fenceChance: 0.1 });
      lot(lilac, s + 11, 1, { fenceChance: 0.1 });
    }
    for (let deg = 0; deg < 360; deg += 45) {
      const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = BULB.r + 9 + hv;
      const x = BULB.x + R * Math.cos(t), z = BULB.z + R * Math.sin(t);
      const rect = { cx: x, cz: z, hu: 6.4, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
      if (!b.rectClear(rect, 5) || lilac.dist(x, z) < 14 || Math.abs(x) > 188 || Math.abs(z) > 138) continue;
      if (b.houses.some((h) => Math.hypot(h.cx - x, h.cz - z) < 14)) continue;
      hedged(b.placeHouse({ x, z, ang: t + Math.PI / 2, hu: b.R(5.6, 6.8), hv, front: 1, setback: 9, fenceChance: 0 }));
    }
    const nearDrive = (x, z) => b.driveways.some((q) => {
      let sgn = 0, inside = true;
      for (let k = 0; k < 4; k++) {
        const a = q[k], c = q[(k + 1) % 4];
        if (segDist(x, z, a.x, a.z, c.x, c.z) < 1.1) return true;
        const cr = Math.sign((c.x - a.x) * (z - a.z) - (c.z - a.z) * (x - a.x));
        if (cr && sgn && cr !== sgn) inside = false;
        if (cr) sgn = cr;
      }
      return inside;
    });
    for (const h of fronts) {
      const w = h.front * (h.hv + h.setback - 2.2);
      const left = h.garage && h.garage.side < 0 ? h.hu + 2 * h.garage.hu + 0.5 : h.hu + 2.5;
      const right = h.garage && h.garage.side > 0 ? h.hu + 2 * h.garage.hu + 0.5 : h.hu + 2.5;
      const at = (u) => ({ x: h.cx + u * h.cos - w * h.sin, z: h.cz + u * h.sin + w * h.cos });
      const ok = (u) => {
        const p = at(u);
        return !nearDrive(p.x, p.z) && !b.inCorridor(p.x, p.z, 4) && !b.mailboxes.some((m) => Math.hypot(m.x - p.x, m.z - p.z) < 1.2);
      };
      let run = null;
      for (let u = -left; u <= right + 0.01; u += 0.5) {
        const good = u <= right - 0.25 && ok(u);
        if (good && run === null) run = u;
        if (!good && run !== null) {
          if (u - 0.5 - run >= 2.5) b.hedge(at(run), at(u - 0.5), { h: 1.1, w: 0.9 });
          run = null;
        }
      }
      if (run !== null && right - run >= 2.5) b.hedge(at(run), at(right), { h: 1.1, w: 0.9 });
    }

    // back-yard pools behind a few Garden Ave and Tulip Ln homes
    for (const [path, x, side] of [[garden, -72, -1], [garden, 28, -1], [tulip, -122, 1], [tulip, 52, 1]]) {
      const p = path.offset(path.sAlong(0, x), side * 34);
      if (!b.blocked(p.x, p.z, 3) && !b.inCorridor(p.x, p.z, 8)) b.pool(p, Math.atan2(p.tz, p.tx), 4.6, 2.8);
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind, bloomy] of h.trees || []) b.tree(p, r, kind, bloomy ? { color: b.pick(BLOSSOM) } : {});
    }
    // the reflecting pool by the gate, and the clipped hedges of the rose garden
    b.pool({ x: 38, z: 18 }, 0, 6.5, 2.4);
    for (const d of [-7.5, 7.5]) {
      for (const [t0, t1] of [[0.22, 0.42], [0.52, 0.74]]) {
        const a = along(h7.tee, h7.basket, t0, d), c = along(h7.tee, h7.basket, t1, d);
        b.hedge(a, c, { h: 1.2, w: 1 });
      }
    }
    for (const [t, d] of [[0.47, -11], [0.47, 11], [0.2, -12], [0.8, 12]]) {
      const p = along(h7.tee, h7.basket, t, d);
      b.tree(p, b.R(1.8, 2.3), 'bush');
    }
    // the hedge along the park side of Garden Ave, broken wherever a hole plays near it
    for (let s = 30; s < garden.length - 30; s += 7) {
      const a = garden.offset(s, 9), c = garden.offset(s + 5.5, 9);
      if (a.x < -175 || a.x > 104 || b.inCorridor(a.x, a.z, 5) || b.inCorridor(c.x, c.z, 5)) continue;
      b.hedge(a, c, { h: 1.3, w: 1 });
    }
    // parked cars
    for (const [path, x, d, turn] of [[garden, -40, -2.3, 0], [garden, 50, -2.3, 0], [tulip, -60, 2.3, 0], [tulip, 70, 2.3, 0], [bloom, -30, -2.2, 1]]) {
      const p = path.offset(path.sAlong(turn ? 1 : 0, x), d);
      if (!b.inCorridor(p.x, p.z, 3.5)) b.car(p, Math.atan2(p.tz, p.tx));
    }
    // the gazebo on its knoll, picnic tables below it, benches round the pond
    b.prop('gazebo', KNOLL.x - 4, KNOLL.z - 4, { size: 4.6, ang: 0.3, r: 3.6 });
    for (const [x, z, ang, shade] of [[-6, -36, 0.3, '#e889ad'], [8, -30, -0.4, null], [24, -34, 0.9, '#f2b134']]) {
      if (b.inCorridor(x, z, 4)) continue;
      b.prop('table', x, z, { ang, r: 1.2 });
      if (shade) b.prop('umbrella', x, z, { color: shade, r: 0.6 });
    }
    b.prop('bin', 14, -28, { r: 0.5 });
    for (const t of [1.2, 1.9, 2.6, 3.6, 4.6, 5.5]) {
      const x = POND.x + 50 * Math.cos(t), z = POND.z + 38 * Math.sin(t);
      if (!b.inCorridor(x, z, 4)) b.prop('bench', x, z, { ang: t + Math.PI / 2, r: 1 });
    }
    for (const [x, z, ang] of [[-2, 46, 2.2], [-150, -46, 0.5], [74, 66, -0.4], [-120, 64, 1.2]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('bench', x, z, { ang, r: 1 });
    }
    b.prop('bin', 40, 70, { r: 0.5 });
    b.lampsAlong(garden, 60, -4.6, 30);
    b.lampsAlong(tulip, 60, 4.6, 30);
    b.lampsAlong(bloom, 64, -4.4, 30);
    for (const [path, d] of [[garden, -4.4], [tulip, 4.4]]) {
      for (let s = 60; s < path.length - 30; s += 90) {
        const p = path.offset(s, d);
        if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
      }
    }
    // the pond: ducks, lilies and reeds
    b.ducks.push({ x: POND.x + 6, z: POND.z - 4, r: 7, speed: 0.4, phase: 0.8 });
    for (let i = 0; i < 500; i++) {
      const x = POND.x + b.R(-34, 34), z = POND.z + b.R(-26, 26);
      const g = b.hf.get(x, z) - pondLevel;
      if (g < -0.25 && g > -1.6 && Math.abs(x - (POND.x - 16)) > 2.5 && b.chance(0.2)) b.prop('lily', x, z, { n: 3 + Math.floor(b.rng() * 5), r: 0.1 });
    }
    for (const [px, pz] of ring(POND, 30, 36, 22)) {
      const g = b.hf.get(px, pz) - pondLevel;
      if (g > -0.35 && g < 0.25 && Math.abs(px - (POND.x - 16)) > 3 && !b.inCorridor(px, pz, 3) && b.chance(0.5)) {
        b.prop('reeds', px + b.R(-1, 1), pz + b.R(-1, 1), { n: 5 + Math.floor(b.rng() * 7), r: 0.6 });
      }
    }

    // ------------------------------------------------------------ trees
    // cherry avenues along the park walks, wherever they leave the lines of play alone
    for (const walk of b.footpaths.filter((f) => f.name === 'Blossom Walk' || f.name === 'Bluebell Walk' || f.name === 'Rose Walk')) {
      for (let s = 6; s < walk.length - 6; s += 9) {
        for (const d of [-5.2, 5.2]) {
          const p = walk.offset(s, d), r = b.R(2.6, 3.2);
          if (b.clearForTree(p.x, p.z, r, { corridor: 8 })) b.tree(p, r, 'broad', { color: b.pick(BLOSSOM), tall: 0.85 });
        }
      }
    }
    const roads = [garden, tulip, bloom, lilac];
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      const park = x > -178 && x < 108 && z > -88 && z < 88;
      if (park) {
        if (b.rng() > 0.1) return null; // specimen trees on open lawns
        const kind = u < 0.62 ? 'broad' : u < 0.78 ? 'birch' : u < 0.88 ? 'willow' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(1.8, 2.8) : b.R(3, 4.6), color: kind === 'broad' ? b.pick(u < 0.4 ? BLOSSOM : GREENS) : undefined };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 34) {
        if (b.rng() > 0.28) return null; // yards stay fairly open
        const kind = u < 0.55 ? 'broad' : u < 0.7 ? 'birch' : u < 0.82 ? 'pine' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2, 3) : b.R(2.8, 4.8), color: kind === 'broad' ? b.pick(u < 0.3 ? BLOSSOM : GREENS) : undefined };
      }
      const kind = u < 0.6 ? 'broad' : u < 0.8 ? 'pine' : 'birch';
      return { kind, r: b.R(3.6, 6), tall: 1.2, color: kind === 'broad' ? b.pick(u < 0.15 ? BLOSSOM : GREENS) : undefined };
    });
  },
};

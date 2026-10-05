// Santa Brisa. A whitewashed hill town stacked up a rock above the sea: open on the piazza
// round the fountain, drop past the campanile through the terraces to the harbour, run the
// fishermen's quay, climb the cliff walk with the sea far below, storm the castle gate, then
// bomb the big drop off the ramparts, thread the old archway and climb the grand stair home.
import { smoothstep } from '../geom.js';
import { SEASIDE } from './themes.js';

// high summer on the Mediterranean: white walls, terracotta and blue, dry olive slopes
const THEME = {
  ...SEASIDE,
  music: 'island', ambience: 'surf',
  ground: {
    ...SEASIDE.ground,
    woods: '#b9ab76', woodsMottle: ['#a99b66', '#c6b783', '#a3a06c', '#bba66f', '#9d9461'],
    lawn: '#93b35c', lawnMottle: ['#86a852', '#9fbd66', '#a8c070', '#8aac56'],
    sand: '#efe0b6', dirt: '#b39470', rock: '#cbbd9f', path: '#e8dfca', curb: '#d9cfbb', asphalt: '#bfb196',
  },
  foliage: {
    ...SEASIDE.foliage,
    broad: ['#7b9257', '#879d60', '#6f874d', '#90a468'],
    pine: ['#26432c', '#2c4b31', '#223d28'],
    bush: ['#6f8f4a', '#7f9a55', '#5f8443', '#8a9a5a'],
    palm: ['#5f9a3a', '#6aa845', '#589038'],
  },
  palmTrunk: '#8f7f62',
  walls: ['#fbf9f3', '#f7f4ec', '#fdfcf8', '#f4efe4', '#f9f6ee', '#f6f1e6'],
  roofs: ['#c4623a', '#b8552f', '#cf7048', '#b5512e'],
  doors: ['#2f6fae', '#1f5f9e', '#2e8b9a', '#3d7a4a', '#8a3b2b', '#2a4f8f'],
  shutters: ['#2f6fae', '#3a86c8', '#2e8b9a', '#4f8f5a', '#1f5f9e'],
  trim: '#ffffff',
  porchDecor: null,
  water: { shallow: '#4fd3d8', deep: '#1662a8', foam: '#ffffff' },
};
const PASTEL = ['#f2dcb0', '#f0c9a8', '#d5e6ec', '#f4d9d0', '#f3e3b5'];
const FLAT = '#ece6d8'; // flat roof terraces

const SEA = 0.5, QUAY = 2.6, TOP = 60;
const SUMMIT = { x: 40, z: -100 }; // the castle
const PIAZZA = { x: -12, z: -32, hu: 22, hv: 28, y: 27 };
const STEP = 6; // height of each terrace
const COAST = [
  [-260, 260], [-260, 93], [-150, 93], [-60, 93], [20, 93], [56, 91], [74, 86], [92, 80], [112, 62], [126, 40], [134, 15], [138, -10],
  [142, -40], [150, -70], [165, -100], [190, -120], [260, -130], [260, 260],
];
// the grand stair up to the piazza (hole 9)
const STAIR = { a: { x: 4.4, z: 45 }, b: { x: -3.4, z: 5 }, half: 2.6 };

function hill(x, z) {
  const dx = x - SUMMIT.x, dz = z - SUMMIT.z, dS = Math.hypot(dx, dz) || 1;
  const sw = Math.max(0, (-dx + dz) / (dS * Math.SQRT2)); // the castle rock is sheer to the south-west
  const crag = 0.26 + 0.3 * sw;
  let f = TOP - crag * Math.min(34, Math.max(0, dS - 24)) - 0.15 * Math.max(0, dS - 58);
  f += 1.2 * Math.sin(0.05 * x + 0.7) * Math.cos(0.043 * z - 0.2) * smoothstep(40, 70, dS);
  f = Math.min(f, QUAY + 0.55 * Math.max(0, 66 - z)); // the slope above the harbour
  // terraces cut into the hillside below the castle rock
  const q = f / STEP, n = Math.floor(q), fr = q - n;
  const terr = STEP * (n + smoothstep(0.7, 1, fr));
  const k = smoothstep(56, 70, dS) * smoothstep(QUAY + 2, QUAY + 6, f);
  return f + (0.8 * terr + 0.2 * f - f) * k;
}

// the cliff path of hole 5
const CLIFF = [{ x: 84, z: 50 }, { x: 120, z: 14 }, { x: 118, z: -44 }];
CLIFF.f = Math.hypot(36, 36) / (Math.hypot(36, 36) + Math.hypot(2, 58));
// the ramp up the castle rock to the gate (hole 6)
const RAMP = { a: { x: 112, z: -55 }, b: { x: 40 + 23 * Math.cos(0.62), z: -100 + 23 * Math.sin(0.62) } };
// a climb in even steps: level landings joined by short steep pitches
const steps = (t, n) => { const q = Math.min(t * n, n - 1e-6), k = Math.floor(q); return (k + smoothstep(0.55, 1, q - k)) / n; };
// two flights with a broad landing between them
const stairRise = (t) => (t < 0.42 ? t / 0.42 : t < 0.58 ? 1 : 1 + (t - 0.58) / 0.42) / 2;
const segT = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
  return { t, d: Math.hypot(x - a.x - dx * t, z - a.z - dz * t) };
};

const HOLES = [
  { name: 'La Fontana', par: 3, tee: [6, -10], basket: [-30, -36] },
  { name: 'Il Campanile', par: 3, tee: [-37, -31], basket: [-90, 14] },
  { name: 'Harbour Wall', par: 3, tee: [-98, 20], basket: [-116, 61] },
  { name: "Fishermen's Quay", par: 4, drop: [58, 72], tee: [-96, 80], via: [[28, 80]], basket: [72, 57] },
  { name: 'Cliff Walk', par: 4, drop: [116, 4], tee: [84, 50], via: [[120, 14]], basket: [118, -44] },
  { name: 'Castle Gate', par: 3, tee: [119, -50], basket: [52, -96] },
  { name: 'The Big Drop', par: 3, tee: [24, -83], basket: [-58, 2] },
  { name: 'Arco', par: 3, tee: [-55, 13], basket: [-12, 34] },
  { name: 'La Scalinata', par: 3, tee: [5, 50], basket: [-4, 0] },
];

export default {
  id: 'hilltown',
  name: 'Santa Brisa',
  blurb: 'A whitewashed hill town above the sea: a castle-top drop, the old arch and the grand stair.',
  seed: 7708,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    const ocean = b.lake(COAST, SEA, { name: 'sea', per: 2 });
    const quayRoad = b.road([[-215, 70], [-120, 70], [-20, 70], [50, 70], [72, 64], [84, 56]], { width: 6.5, name: 'Lungomare', lawn: 0, shoulder: 3 });
    const holes = HOLES.map((h) => ({
      ...h, tee: { x: h.tee[0], z: h.tee[1] }, basket: { x: h.basket[0], z: h.basket[1] }, via: (h.via || []).map(([x, z]) => ({ x, z })),
    }));
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------------- terrain
    const piazzaY = PIAZZA.y;
    const stairA = hill(STAIR.a.x, STAIR.a.z);
    const cliffY0 = hill(CLIFF[0].x, CLIFF[0].z), cliffY1 = hill(CLIFF[2].x, CLIFF[2].z);
    const rampY0 = hill(RAMP.a.x, RAMP.a.z);
    const base = (x, z) => {
      let h = hill(x, z);
      // the piazza, levelled
      const pu = Math.abs(x - PIAZZA.x) - PIAZZA.hu, pv = Math.abs(z - PIAZZA.z) - PIAZZA.hv;
      h += (piazzaY - h) * (1 - smoothstep(0, 10, Math.hypot(Math.max(0, pu), Math.max(0, pv))));
      // the grand stair: an even flight from the terrace below up to the piazza
      const s = segT(x, z, STAIR.a, STAIR.b);
      if (s.d < STAIR.half + 7) h += (stairA + (piazzaY - stairA) * stairRise(s.t) - h) * (1 - smoothstep(STAIR.half + 0.5, STAIR.half + 7, s.d));
      // the cliff path: an even climb along the clifftop from the harbour to the castle rock
      const cl = segT(x, z, CLIFF[0], CLIFF[1]), cl2 = segT(x, z, CLIFF[1], CLIFF[2]);
      const [ct, cd] = cl.d < cl2.d ? [cl.t * CLIFF.f, cl.d] : [CLIFF.f + cl2.t * (1 - CLIFF.f), cl2.d];
      if (cd < 15) h += (cliffY0 + (cliffY1 - cliffY0) * ct - h) * (1 - smoothstep(6, 15, cd));
      // the castle ramp up to the gate
      const cr = segT(x, z, RAMP.a, RAMP.b);
      if (cr.d < 14) h += (rampY0 + (TOP - rampY0) * cr.t - h) * (1 - smoothstep(5, 14, cr.d));
      // a lane cut down from the piazza's west side, so hole 2 looks out over the town
      const c = segT(x, z, { x: PIAZZA.x - PIAZZA.hu, z: -31 }, { x: -64, z: -8 });
      if (c.d < 14) h = Math.min(h, h + (piazzaY - 0.5 - 2 * c.t - h) * (1 - smoothstep(6, 14, c.d)));
      return h;
    };
    const inPiazza = (x, z) => Math.abs(x - PIAZZA.x) < PIAZZA.hu && Math.abs(z - PIAZZA.z) < PIAZZA.hv;
    const pads = [...holes.map((h) => ({ ...h.tee, tee: true })), ...holes.map((h) => ({ ...h.basket, tee: false }))]
      .filter((p) => !inPiazza(p.x, p.z))
      .map((p) => ({ x: p.x, z: p.z, h: base(p.x, p.z), r0: p.tee ? 4 : 3.5, r1: p.tee ? 13 : 12 }));
    b.terrain((x, z) => {
      let h = base(x, z);
      const inP = inPiazza(x, z);
      for (const p of pads) {
        if (inP) break;
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < p.r1) h += (p.h - h) * (1 - smoothstep(p.r0, p.r1, d));
      }
      const sd = ocean.poly.sdf(x, z, 40);
      if (sd < 0) return SEA - Math.min(4, 1 + -sd * 0.3);
      if (z > 60 && x < 80) return Math.max(QUAY - 0.4 * (1 - smoothstep(0.3, 1.2, sd)), Math.min(h, QUAY + 30)); // stone quay
      return SEA - 0.3 + (h - SEA + 0.3) * smoothstep(1, 9, sd); // sea cliffs, straight into the water
    });
    const G = (x, z) => b.hf.get(x, z);
    const coastD = (x, z) => ocean.poly.sdf(x, z, 40);
    const dCastle = (x, z) => Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
    const rectPts = (cx, cz, hu, hv) => [[cx - hu, cz - hv], [cx + hu, cz - hv], [cx + hu, cz + hv], [cx - hu, cz + hv]];

    // ------------------------------------------------------ ground plan
    b.pavedArea(rectPts(PIAZZA.x, PIAZZA.z, PIAZZA.hu, PIAZZA.hv), { color: '#ddd0b4' });
    b.pavedArea([[-215, 73.5], [60, 73.5], [75, 85], [56, 95], [-215, 95]], { color: '#cdbf9f' }); // the quay
    b.footpath([[STAIR.a.x + (STAIR.a.x - STAIR.b.x) * 0.15, STAIR.a.z + (STAIR.a.z - STAIR.b.z) * 0.15], [STAIR.a.x, STAIR.a.z], [STAIR.b.x, STAIR.b.z], [STAIR.b.x - 0.4, STAIR.b.z - 2]],
      { width: STAIR.half * 2 + 0.6, name: 'La Scalinata', color: '#e2d7bf' });
    b.prop('hilltown:stairs', (STAIR.a.x + STAIR.b.x) / 2, (STAIR.a.z + STAIR.b.z) / 2,
      { ax: STAIR.a.x, az: STAIR.a.z, bx: STAIR.b.x, bz: STAIR.b.z, width: STAIR.half * 2, r: 0 });
    const lane = (pts, w = 2.6, name = 'vicolo') => b.footpath(pts, { width: w, name, color: '#e4dac4' });
    lane([[-24, -58], [-16, -66], [-4, -70], [8, -76], [18, -84]], 2.4, 'Salita al Castello');
    lane([[-34, -24], [-52, -10], [-72, 6], [-90, 22], [-102, 42], [-112, 60], [-116, 67]], 3, 'Via dei Limoni');
    lane([[78, 56], [84, 50], [102, 32], [120, 14], [122, -14], [118, -44], [118, -50]], 2.2, 'Sentiero della Scogliera');
    lane([[-55, 13], [-34, 23], [-12, 34], [4, 44]], 3, "Vicolo dell'Arco");
    lane([[28, 80], [50, 70], [72, 57], [80, 52]], 2.4, 'Salita del Porto');

    // ------------------------------------------------------- the piazza
    // the church of Santa Brisa with its blue dome, the campanile beside it, the fountain
    const church = b.placeHouse({ kind: 'church', x: 3, z: -36, ang: Math.PI / 2, hu: 11, hv: 7, front: 1, stories: 3, wallH: 10, roofH: 0.15, roof: 'hip',
      wall: '#fbf9f3', roofColor: FLAT, trim: '#ffffff', door: '#5a3e2b', shutters: null, chimney: false, doorU: 0 });
    b.prop('hilltown:dome', church.cx, church.cz, { y: church.base + church.wallH, r: 5.4, drum: 2.6, r2: 6 });
    for (const s of [-1, 1]) b.prop('hilltown:dome', church.cx - 3.5, church.cz + s * 8.5, { y: church.base + church.wallH, r: 1.3, drum: 0.6 });
    b.prop('hilltown:campanile', -29, -55, { ang: Math.PI / 2, w: 5.2, h: 27, r: 3.5 });
    b.prop('hilltown:fountain', -12, -23, { r: 3.2 });
    const cafe = ['#2f6fae', '#c4623a', '#2e8b9a', '#e8b23a'];
    for (const [x, z, k] of [[-29, -8, 0], [-24, -11, 1], [-29, -15, 2], [-20, -7, 3], [-27, -48, 1], [-21, -52, 0], [-15, -55, 2], [-27, -55, 3]]) {
      b.prop('hilltown:table', x, z, { ang: b.R(0, 3), color: cafe[k], r: 1.2 });
      b.prop('umbrella', x + 0.01, z, { color: cafe[k], r: 0.5 });
    }
    for (const [x, z, ang] of [[-18, -17, 0], [-6, -17, 0], [-19, -29, Math.PI], [-5, -29, Math.PI]]) b.prop('bench', x, z, { ang, r: 1 });
    for (const [x, z] of [[-33, -5], [9, -5], [-33, -40], [9, -40]]) b.lamps.push({ x, z, ang: Math.atan2(PIAZZA.z - z, PIAZZA.x - x) + Math.PI });

    // -------------------------------------------------------- the castle
    // a ruined ring wall round the summit: a gate on the east (hole 6) and a breach on the
    // south-west where hole 7 tees off the ramparts
    const crossing = (from, to, r) => {
      let lo = 0, hi = 1;
      const inside = (t) => dCastle(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t) < r;
      const fromIn = inside(0);
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (inside(m) === fromIn) lo = m; else hi = m; }
      const t = (lo + hi) / 2;
      return Math.atan2(from.z + (to.z - from.z) * t - SUMMIT.z, from.x + (to.x - from.x) * t - SUMMIT.x);
    };
    const RING = 22;
    const gate = crossing(holes[5].tee, holes[5].basket, RING), breach = crossing(holes[6].tee, holes[6].basket, RING);
    const angDiff = (a, c) => Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c)));
    const segA = 5 / RING;
    for (let a = 0; a < Math.PI * 2 - 1e-6; a += segA) {
      if (angDiff(a, gate) < 0.3 || angDiff(a, breach) < 0.36) continue;
      const x = SUMMIT.x + Math.cos(a) * RING, z = SUMMIT.z + Math.sin(a) * RING;
      const ruined = b.chance(0.3) || angDiff(a, breach) < 0.7;
      b.prop('hilltown:rampart', x, z, { ang: a + Math.PI / 2, hu: 2.6, t: 1.6, h: ruined ? b.R(1.2, 2.6) : b.R(3.6, 5), ruined, r: 3 });
    }
    for (const s of [-1, 1]) {
      const a = gate + s * 0.36;
      b.prop('hilltown:tower', SUMMIT.x + Math.cos(a) * RING, SUMMIT.z + Math.sin(a) * RING, { r: 2.8, h: 8.5, r2: 3 });
    }
    for (const a of [gate + 1.5, gate + 2.6, gate - 1.6, gate - 2.9]) {
      if (angDiff(a, breach) < 0.6) continue;
      b.prop('hilltown:tower', SUMMIT.x + Math.cos(a) * RING, SUMMIT.z + Math.sin(a) * RING, { r: 3, h: b.R(6, 9), ruined: b.chance(0.5) });
    }
    b.prop('hilltown:tower', SUMMIT.x - 8, SUMMIT.z - 9, { sq: true, r: 4.5, h: 14, ang: 0.2 });
    for (const s of [-1, 1]) {
      const a = breach + s * 0.45;
      b.prop('boulder', SUMMIT.x + Math.cos(a) * (RING + 1), SUMMIT.z + Math.sin(a) * (RING + 1), { r: 1.3 });
    }

    // ------------------------------------------------------ the harbour
    b.span({ x: -150, z: 91 }, { x: -150, z: 132 }, 6, QUAY + 0.4, { kind: 'stone' });
    b.prop('hilltown:light', -150, 129, { y: QUAY + 0.4, color: '#2f9a4a' });
    b.span({ x: -40, z: 93.5 }, { x: -40, z: 110 }, 3, QUAY - 0.2, { kind: 'dock' });
    const boatColors = ['#2f6fae', '#c4623a', '#2e8b9a', '#e8b23a', '#d9534f', '#3d7a4a', '#f4f1ea'];
    for (const [x, z, ang, len, cabin] of [[-44, 99, Math.PI / 2, 6.5, 0], [-36, 103, Math.PI / 2, 5.5, 1], [-44, 108, Math.PI / 2, 5, 0], [-36, 111, Math.PI / 2, 7, 1],
      [-90, 99, 0.1, 6, 0], [-100, 103, -0.2, 5.5, 0], [-140, 107, Math.PI / 2, 7, 1], [-160, 103, Math.PI / 2, 6, 0], [-160, 113, Math.PI / 2, 5, 0],
      [10, 100, 0.05, 6, 1], [22, 104, -0.1, 5, 0], [40, 99, 0.15, 6.5, 0], [-10, 119, 0.6, 8, 1], [-70, 125, -0.4, 6, 0], [60, 112, 0.9, 5.5, 0]]) {
      b.prop('hilltown:boat', x, z, { y: SEA, ang, len, beam: len * 0.36, cabin: !!cabin, color: b.pick(boatColors), r: len / 2 });
    }
    for (let x = -205; x <= 50; x += 9) {
      if (Math.abs(x + 40) < 4 || Math.abs(x + 150) < 5) continue;
      b.prop('hilltown:bollard', x, x > 20 ? 92.4 - (x - 20) * 0.06 : 93.6, { r: 0.3 });
    }
    for (const [x, z, k] of [[-140, 77, 0], [-134, 80, 1], [-146, 81, 2], [-128, 76, 3]]) {
      b.prop('hilltown:table', x, z, { ang: b.R(0, 3), color: cafe[k], r: 1.2 });
      b.prop('umbrella', x + 0.01, z, { color: cafe[k], r: 0.5 });
    }
    for (let x = -195; x <= 60; x += 15) {
      if (!b.inCorridor(x, 64.2, 4)) b.tree({ x: x + b.R(-1, 1), z: 64.2 }, b.R(2.2, 2.8), 'palm', { tall: 0.8 });
    }
    b.lampsAlong(quayRoad, 26, -4.3, 8);

    // ------------------------------------------------------ the archway
    const H8 = holes[7], adx = H8.basket.x - H8.tee.x, adz = H8.basket.z - H8.tee.z, alen = Math.hypot(adx, adz);
    const arch = { x: H8.tee.x + adx * 0.46, z: H8.tee.z + adz * 0.46, ang: Math.atan2(adz, adx), open: 7, pier: 2.6, thick: 4.4, spring: 3.4, over: 2.4 };
    b.prop('hilltown:arch', arch.x, arch.z, { ...arch, r: 0 });
    {
      const ux = adx / alen, uz = adz / alen, wx = -uz, wz = ux, ay = G(arch.x, arch.z);
      let w = arch.open / 2 + arch.pier;
      for (const hu of [4.2, 5, 4.4]) {
        for (const s of [-1, 1]) {
          const ww = s * (w + hu + 0.02);
          const hh = b.placeHouse({ kind: 'villa', x: arch.x + wx * ww, z: arch.z + wz * ww, ang: arch.ang + Math.PI / 2, hu, hv: 3.6, front: 1, stories: 3,
            wallH: 8.6 + b.R(-0.6, 1.4), roofH: 0.12, roof: 'hip', roofColor: FLAT, chimney: false, shutters: b.pick(THEME.shutters), doorU: b.R(-1, 1) });
          if (hh.base > ay + 3) hh.wallH = Math.max(3, hh.wallH - (hh.base - ay - 1));
        }
        w += hu * 2 + 0.04;
      }
    }

    // ------------------------------------------------- the cliff walk
    for (let k = 1; k < 8; k++) {
      const [ax, az] = COAST[k + 5], [cx, cz] = COAST[k + 6];
      const len = Math.hypot(cx - ax, cz - az), n = Math.floor(len / 5);
      for (let i = 0; i < n; i++) {
        if ((i + k) % 4 === 3) continue;
        const t = (i + 0.5) / n, nx = -(cz - az) / len, nz = (cx - ax) / len;
        const mx = ax + (cx - ax) * t, mz = az + (cz - az) * t, sg = coastD(mx + nx * 7, mz + nz * 7) > coastD(mx - nx * 7, mz - nz * 7) ? 7 : -7;
        const x = mx + nx * sg, z = mz + nz * sg;
        if (coastD(x, z) < 4 || b.inCorridor(x, z, 4) || b.holeDefs.some((h) => Math.hypot(x - h.basket.x, z - h.basket.z) < 16)) continue;
        b.prop('wall', x, z, { ang: Math.atan2(cz - az, cx - ax), hu: 2.3, h: 0.8, r: 2.3, color: '#f4f1ea', cap: '#e2dccf' });
      }
    }
    for (const [x, z, ang] of [[110, 40, -0.9], [128, 0, -1.5], [131, -24, -1.6]]) if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang, r: 1 });
    const chapel = b.placeHouse({ kind: 'chapel', x: 96, z: -8, ang: -0.4, hu: 4.4, hv: 3.4, front: 1, stories: 1, wallH: 4.6, roofH: 0.12, roof: 'hip',
      wall: '#fbf9f3', roofColor: FLAT, trim: '#ffffff', door: '#2f6fae', shutters: null, chimney: false, doorU: 0 });
    b.prop('hilltown:dome', chapel.cx, chapel.cz, { y: chapel.base + chapel.wallH, r: 2.6, drum: 1.0, ang: -0.4, r2: 3 });

    // --------------------------------------------------------- the town
    // whitewashed cubes stacked up the terraces, facing downhill to the sea
    const overlaps = (r, pad) => {
      for (const h of b.houses) {
        const reach = Math.hypot(h.hu, h.hv) + Math.hypot(r.hu, r.hv) + pad;
        if (Math.abs(h.cx - r.cx) > reach || Math.abs(h.cz - r.cz) > reach) continue;
        for (const [o, q] of [[h, r], [r, h]]) {
          for (const [u, w] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const x = q.cx + u * q.hu * q.cos - w * q.hv * q.sin, z = q.cz + u * q.hu * q.sin + w * q.hv * q.cos;
            const dx = x - o.cx, dz = z - o.cz;
            if (Math.abs(dx * o.cos + dz * o.sin) < o.hu + pad && Math.abs(-dx * o.sin + dz * o.cos) < o.hv + pad) return true;
          }
        }
      }
      return false;
    };
    const lotClear = (r) => {
      if (!b.rectClear(r, 5.5) || overlaps(r, 0.9)) return false;
      const hs = [];
      for (const [u, w] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const x = r.cx + u * (r.hu + 0.5) * r.cos - w * (r.hv + 0.5) * r.sin, z = r.cz + u * (r.hu + 0.5) * r.sin + w * (r.hv + 0.5) * r.cos;
        if (Math.abs(x) > b.halfW - 4 || Math.abs(z) > b.halfH - 4) return false;
        if (coastD(x, z) < 7 || dCastle(x, z) < 33) return false;
        for (const road of b.roads) if (road.dist(x, z) < road.width / 2 + 1.2) return false;
        for (const p of b.footpaths) if (p.dist(x, z) < p.width / 2 + 0.7) return false;
        for (const p of b.paved) if (p.poly.contains(x, z)) return false;
        hs.push(G(x, z));
      }
      if (Math.max(...hs) - Math.min(...hs) > 5) return false;
      for (const t of b.trees) if (Math.hypot(t.x - r.cx, t.z - r.cz) < Math.hypot(r.hu, r.hv) + t.r * 0.5) return false;
      for (const p of b.props) if (p.r && Math.hypot(p.x - r.cx, p.z - r.cz) < Math.hypot(r.hu, r.hv) + p.r) return false;
      return true;
    };
    const density = (x, z) => {
      if (z > 63) return 0;
      if (z > 6 && x > -190 && x < 100) return 0.92;
      const dp = Math.hypot(x - PIAZZA.x, z - PIAZZA.z);
      if (dp < 80) return 0.88;
      if (dp < 110 || dCastle(x, z) < 60) return 0.4;
      return 0.06;
    };
    const blues = ['#2f6fbf', '#2a63ad', '#3a7fd0'];
    for (let z = 60; z > -146; z -= 6.4) {
      for (let x = -194; x < 150; x += 6.4) {
        const jx = x + b.R(-2.2, 2.2), jz = z + b.R(-2.2, 2.2);
        if (b.rng() > density(jx, jz)) continue;
        const e = 1.5, gx = G(jx + e, jz) - G(jx - e, jz), gz = G(jx, jz + e) - G(jx, jz - e);
        const ang = Math.atan2(gz, gx) + Math.PI / 2 + b.R(-0.12, 0.12);
        const r = { cx: jx, cz: jz, hu: b.R(3.2, 5.6), hv: b.R(2.8, 4.2), cos: Math.cos(ang), sin: Math.sin(ang) };
        if (!lotClear(r)) continue;
        const roll = b.rng(), stories = roll < 0.3 ? 1 : roll < 0.82 ? 2 : 3;
        const style = b.rng(), flat = style < 0.58 || style > 0.9;
        const h = b.placeHouse({
          kind: 'villa', x: jx, z: jz, ang, hu: r.hu, hv: r.hv, front: 1, stories, wallH: stories * 2.7 + 0.25,
          roofH: flat ? 0.12 : b.R(1.0, 1.5), roof: flat || b.chance(0.7) ? 'hip' : 'gable', roofColor: flat ? FLAT : b.pick(THEME.roofs),
          wall: b.chance(0.14) ? b.pick(PASTEL) : b.pick(THEME.walls), trim: '#ffffff', door: b.pick(THEME.doors),
          shutters: b.chance(0.75) ? b.pick(THEME.shutters) : null, chimney: !flat && b.chance(0.3), doorU: b.R(-r.hu * 0.4, r.hu * 0.4),
        });
        const top = h.base + h.wallH;
        if (style > 0.9 && Math.min(h.hu, h.hv) > 3.2) {
          b.prop('hilltown:dome', h.cx, h.cz, { y: top, r: Math.min(h.hu, h.hv) * 0.62, drum: 0.7, color: b.pick(blues), ang });
        } else if (flat && b.chance(0.3)) {
          const u = b.R(-h.hu + 1.6, h.hu - 1.6), w = b.R(-h.hv + 1.4, h.hv - 1.4);
          b.prop('hilltown:roofdeco', h.cx + u * h.cos - w * h.sin, h.cz + u * h.sin + w * h.cos, { y: top + 0.1, ang, kind: b.chance(0.5) ? 'pergola' : 'tank' });
        }
        if (b.chance(0.32)) {
          const u = b.pick([-1, 1]) * (h.hu - b.R(0.6, 1.4)), w = h.hv;
          b.prop('hilltown:bloom', h.cx + u * h.cos - w * h.sin, h.cz + u * h.sin + w * h.cos, { y: h.base + 0.2, ang, h: Math.min(h.wallH - 0.6, 4.5), n: 8 + Math.floor(b.rng() * 6) });
        }
      }
    }

    // ------------------------------------------------------------ trees
    // a few placed by hand: cypresses at the castle path, an old olive in the castle yard,
    // a stone pine on the cliff walk
    for (const [x, z] of [[-30, -62], [-20, -70], [-6, -76], [4, -82], [-36, -44]]) if (!b.inCorridor(x, z, 3.5)) b.tree({ x, z }, b.R(1.2, 1.5), 'pine', { tall: 1.15 });
    // a line of cypresses on the landward side of the cliff walk
    for (let k = 0; k < 2; k++) {
      const a = CLIFF[k], c = CLIFF[k + 1], len = Math.hypot(c.x - a.x, c.z - a.z), nx = (c.z - a.z) / len, nz = -(c.x - a.x) / len;
      for (let d = 8; d < len - 4; d += 13) {
        const x = a.x + ((c.x - a.x) * d) / len + nx * 10.5, z = a.z + ((c.z - a.z) * d) / len + nz * 10.5;
        if (!b.inCorridor(x, z, 6) && !b.blocked(x, z, 2)) b.tree({ x, z }, b.R(1.2, 1.5), 'pine', { tall: 1.2 });
      }
    }
    for (const [x, z] of [[36, -88], [48, -110]]) if (!b.inCorridor(x, z, 5)) b.tree({ x, z }, 3.4, 'broad', { color: '#8a9a6a', tall: 0.7 });
    for (const [x, z] of [[78, 30], [104, -30]]) if (!b.inCorridor(x, z, 8)) b.tree({ x, z }, 5.2, 'broad', { color: '#4f7a3a', tall: 1.5 });
    b.scatter(16000, (x, z) => {
      const u = b.rng(), sd = coastD(x, z), dc = dCastle(x, z);
      if (sd < 5 || z > 63) return null;
      if (dc < 24) return null;
      if (dc < 40) return b.rng() < 0.25 ? { kind: 'bush', r: b.R(1.2, 2), corridor: 6 } : null;
      if (Math.min(segT(x, z, CLIFF[0], CLIFF[1]).d, segT(x, z, CLIFF[1], CLIFF[2]).d) < 16) return null; // the cliff walk stays open to the sea
      const town = density(x, z) > 0.5;
      if (town) {
        if (b.rng() > 0.5) return null;
        if (u < 0.45) return { kind: 'broad', r: b.R(1.6, 2.4), tall: 0.6, color: b.pick(['#3f7a35', '#4a8a3a', '#3a7030']), corridor: 6, lemon: true };
        if (u < 0.8) return { kind: 'pine', r: b.R(1.1, 1.5), tall: b.R(1, 1.25), corridor: 6 };
        return { kind: 'bush', r: b.R(1.4, 2.2), corridor: 6 };
      }
      if (sd < 26) return b.rng() < 0.2 ? { kind: 'bush', r: b.R(1.2, 2), corridor: 9 } : null;
      // olive groves on the open slopes, with cypress and stone pine between
      const grove = Math.sin(0.06 * x + 0.8) * Math.cos(0.05 * z - 0.4) > 0.1;
      if (grove) {
        if (b.rng() > 0.55) return null;
        return u < 0.85 ? { kind: 'broad', r: b.R(2.2, 3.2), tall: 0.65, color: b.pick(['#8a9a6a', '#7f8f62', '#95a374', '#86967a']), corridor: 7.5 }
          : { kind: 'pine', r: b.R(1.2, 1.6), tall: 1.2, corridor: 7.5 };
      }
      if (b.rng() > 0.3) return null;
      return u < 0.35 ? { kind: 'bush', r: b.R(1.4, 2.4), corridor: 7.5 } : u < 0.7 ? { kind: 'pine', r: b.R(1.2, 1.6), tall: 1.2, corridor: 7.5 }
        : { kind: 'broad', r: b.R(3.6, 5), tall: 1.4, color: '#4f7a3a', corridor: 7.5 };
    });
    // lemons in the town's lemon trees
    for (const t of b.trees) {
      if (t.kind === 'broad' && t.r < 2.5 && t.h < 5 && ['#3f7a35', '#4a8a3a', '#3a7030'].includes(t.color)) {
        b.prop('hilltown:lemons', t.x, t.z, { y: G(t.x, t.z) + (t.bottom + t.h) / 2, spread: t.r * 0.85, n: 9 });
      }
    }
    // boulders on the castle rock
    for (let k = 0; k < 40; k++) {
      const a = b.R(0, Math.PI * 2), d = b.R(26, 44), x = SUMMIT.x + Math.cos(a) * d, z = SUMMIT.z + Math.sin(a) * d;
      if (!b.inCorridor(x, z, 5) && !b.blocked(x, z, 2)) b.prop('boulder', x, z, { r: b.R(0.8, 2) });
    }
  },
};

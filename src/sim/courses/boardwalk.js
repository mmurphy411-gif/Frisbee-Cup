// Starlight Pier. A seaside amusement boardwalk: down the carnival midway between the game
// booths, over the dunes to the beach, along the sand between the umbrellas, out onto the
// pier and round the Ferris wheel, back over the waves to the beach, through the tunnels
// under the wooden roller coaster, past the carousel and the bandstand to finish in front of
// the Grand Arcade.
import { smoothstep } from '../geom.js';
import { SEASIDE } from './themes.js';

const L = 1.5; // sea level
const RED = '#e5484d';
const BW = 22; // the boardwalk's centre line
const WALK = 3.7; // boardwalk deck
const DECK = 4.0; // pier deck
const PIER = { x: 25, w: 14, z0: 26.5, z1: 100 };
const HEAD = { x: 37, z: 118, hu: 45, hv: 18 }; // the pier head: x -8..82, z 100..136
const WHEEL = { x: 40, z: 127 };
const LIGHT = { x: 182, z: 96 };

// Bright candy-coloured summer by the sea.
const THEME = {
  ...SEASIDE,
  music: 'island', ambience: 'surf',
  ground: { ...SEASIDE.ground, sand: '#f1e1b0', lawn: '#7cbd57', lawnMottle: ['#70b04d', '#86c862', '#94d06a', '#72b450'], path: '#d8c49a' },
  foliage: { ...SEASIDE.foliage, palm: ['#3f9a4a', '#4aa552', '#58b05a'] },
  palmTrunk: '#a48b62',
  walls: ['#f6e7cf', '#9fd8ff', '#f7c6d9', '#fff1c2', '#bfe8c8', '#f4f1ea', '#ffd0a8'],
  roofs: ['#e5484d', '#2b6cb0', '#5b6470', '#2f8f5b'],
  water: { shallow: '#5fd3dc', deep: '#1f73a8', foam: '#ffffff' },
};

const shore = (x) => 82 + 3 * Math.sin(0.03 * x + 1) + 26 * smoothstep(150, 185, x);

// Tees and baskets out on the pier head stand over a piling footing just above the tide.
const FOOTINGS = [[8, 113], [5, 126], [72, 126], [78, 112]];

function height(x, z) {
  if (z > 100) {
    let h = sea(x, z);
    for (const [fx, fz] of FOOTINGS) h = Math.max(h, L + 0.12 - Math.max(0, Math.hypot(x - fx, z - fz) - 1.8) * 1.5);
    return h;
  }
  return sea(x, z);
}

function sea(x, z) {
  const inland = 3.4 + 0.22 * Math.sin(0.021 * x + 0.4) * Math.cos(0.03 * z) + 1.4 * smoothstep(-60, -140, z);
  const h = inland + (3.3 - inland) * smoothstep(6, 16, z);
  if (z <= 28) return h;
  const s = shore(x);
  if (z < s) {
    const k = (z - 28) / (s - 28);
    const west = smoothstep(-95, -135, x);
    const dunes = 1.5 * west * Math.max(0, Math.sin(0.12 * x + 0.5) * Math.cos(0.16 * z - 0.3) + 0.35) * smoothstep(0.02, 0.15, k) * (1 - smoothstep(0.45, 0.7, k));
    return 3.3 - k * (3.3 - (L + 0.25)) + dunes;
  }
  return Math.max(L - 3, L + 0.25 - (z - s) * 0.15);
}

// The coaster's circuit: [x, z, height of the rails above the ground].
const COASTER = [
  [160, -8, 3], [176, -12, 3], [185, -26, 5], [187, -46, 11], [187, -68, 17], [185, -88, 21], [176, -104, 19],
  [160, -113, 11], [143, -112, 5], [127, -117, 9], [111, -117, 13], [99, -105, 12], [95, -87, 11], [96, -68, 12],
  [100, -48, 10], [108, -30, 8], [120, -15, 10], [136, -8, 12], [150, -6, 7],
];

// A closed Catmull-Rom loop through [x, z, h] points, about `step` metres apart.
function loop(ctrl, step) {
  const out = [], n = ctrl.length;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    const m = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  return out;
}

// Is a point inside the coaster's circuit?
function inLoop(x, z) {
  let inside = false;
  for (let i = 0, j = COASTER.length - 1; i < COASTER.length; j = i++) {
    const [xi, zi] = COASTER[i], [xj, zj] = COASTER[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'boardwalk',
  name: 'Starlight Pier',
  blurb: 'Under the coaster, round the Ferris wheel and back over the waves to the arcade.',
  seed: 5307,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    const ave = b.road([[-215, -141], [215, -141]], { width: 7, name: 'Ocean Ave', lawn: 0, lines: true, shoulder: 4 });
    b.lake([[-260, 60], [260, 60], [260, 260], [-260, 260]], L, { name: 'ocean', per: 1 });
    b.terrain(height);
    const sandPts = [];
    for (let x = -205; x <= 205; x += 10) sandPts.push([x, 27.5]);
    for (let x = 205; x >= -205; x -= 10) sandPts.push([x, shore(x) + 4]);
    b.sandArea(sandPts);
    const tan = '#dcc9a0';
    b.pavedArea([[-126, -50], [-34, -50], [-34, -21], [-126, -21]], { color: tan }); // the midway
    b.pavedArea(ring({ x: -20, z: -27 }, 15), { color: tan }); // Starlight Plaza
    b.pavedArea([[-196, -124], [-136, -124], [-136, -84], [-196, -84]]); // parking lot
    b.footpath([[-20, -42], [-16, -60], [-12, -73]], { width: 3, name: 'Bandstand walk', color: tan });
    b.footpath([[-4, -84], [20, -95], [44, -98], [70, -88], [86, -70]], { width: 3, name: 'Carnival Way', color: tan });
    b.footpath([[-196, -84], [-180, -60], [-150, -40], [-126, -35]], { width: 3, name: 'Lot path', color: tan });
    b.lawnArea(ring({ x: 44, z: -88 }, 12));

    // ------------------------------------------------------------ holes
    const holes = [
      { name: 'The Midway', par: 4, tee: { x: -40, z: -30 }, via: [{ x: -110, z: -40 }], basket: { x: -160, z: -5 } },
      { name: 'Sea Grass', par: 3, tee: { x: -168, z: 8 }, basket: { x: -130, z: 62 } },
      { name: 'Umbrella Beach', par: 3, tee: { x: -122, z: 58 }, basket: { x: -30, z: 62 } },
      { name: 'Pier Pressure', par: 3, drop: [18, 104], tee: { x: -14, z: 62 }, basket: { x: 8, z: 113 } },
      { name: 'Round the Wheel', par: 3, drop: [40, 116], tee: { x: 5, z: 126 }, via: [{ x: 40, z: 109 }], basket: { x: 72, z: 126 } },
      { name: 'Gulls Fly Home', par: 3, drop: [110, 70], tee: { x: 78, z: 112 }, basket: { x: 125, z: 52 } },
      { name: 'Riptide Tunnel', par: 4, tee: { x: 130, z: 40 }, via: [{ x: 140, z: -40 }], basket: { x: 85, z: -75 } },
      { name: 'Carousel', par: 3, tee: { x: 78, z: -84 }, basket: { x: 10, z: -120 } },
      { name: 'Grand Arcade', par: 4, tee: { x: -2, z: -128 }, via: [{ x: 25, z: -72 }], basket: { x: -20, z: -14 } },
    ];
    for (const h of holes) b.hole(h);

    // --------------------------------------------- boardwalk, pier and pier head
    b.span({ x: -199, z: BW }, { x: 199, z: BW }, 9, WALK, { kind: 'boardwalk' });
    b.span({ x: PIER.x, z: PIER.z0 }, { x: PIER.x, z: PIER.z1 }, PIER.w, DECK, { kind: 'pier', rails: true });
    b.platform({ kind: 'pier', x: HEAD.x, z: HEAD.z, hu: HEAD.hu, hv: HEAD.hv, ang: 0, top: DECK });
    // railings round the pier head, open where the pier joins it
    const x0 = HEAD.x - HEAD.hu + 0.06, x1 = HEAD.x + HEAD.hu - 0.06, z0 = HEAD.z - HEAD.hv + 0.06, z1 = HEAD.z + HEAD.hv - 0.06;
    for (const [ax, az, cx, cz] of [[x0, z0, PIER.x - PIER.w / 2, z0], [PIER.x + PIER.w / 2, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) {
      b.prop('boardwalk:rail', ax, az, { x2: cx, z2: cz, y: DECK, r: 0 });
    }
    b.prop('boardwalk:arch', PIER.x, 31, { y: DECK, span: 6.4, h: 5, r: 2 });
    b.prop('boardwalk:ferris', WHEEL.x, WHEEL.z, { y: DECK, R: 11, hub: 12.6, ang: 0, r: 9 });
    for (const [x, z, ang] of [[-4, 134.6, 0], [60, 134.6, 0], [80.6, 120, -Math.PI / 2], [19, 60, Math.PI / 2], [31, 75, -Math.PI / 2], [19, 90, Math.PI / 2], [31, 45, -Math.PI / 2]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { y: DECK, ang, r: 1 });
    }
    b.prop('boardwalk:food', 62, 105, { y: DECK, kind: 'icecream', ang: Math.PI, color: '#f78fb3', r: 3 });

    // ------------------------------------------------- the roller coaster
    const track = loop(COASTER, 3.2).map(([x, z, h], i) => {
      const bent = i % 2 === 0 && !b.inCorridor(x, z, 9);
      return [x, z, b.hf.get(x, z) + h, bent ? 1 : 0];
    });
    b.prop('boardwalk:coaster', 150, -60, { track, train: 2, r: 0 });
    for (const [x, z] of track) b.clearZone(x, z, 5);

    // ------------------------------------------------- arcades along the boardwalk
    const arcades = [
      { x: -112, hu: 8.5, h: 6, wall: '#f2c14e', sign: RED, stripes: [RED, '#ffffff'] },
      { x: -88, hu: 10, h: 7.5, wall: '#5bc0eb', sign: '#f2c14e', stripes: ['#ffffff', '#2b6cb0'] },
      { x: -61, hu: 8.5, h: 6.5, wall: '#f78fb3', sign: '#2b6cb0', stripes: ['#ffffff', RED] },
      { x: -20, z: 4, hu: 13, hv: 8.5, h: 9, wall: '#ffe3a3', trim: '#6fcbe6', letters: '#ffffff', sign: RED, stripes: [RED, '#ffffff'], both: true, grand: true },
      { x: 50, hu: 9, h: 6, wall: '#8fd694', sign: '#e5484d', stripes: ['#ffffff', '#2f8f5b'] },
      { x: 76, hu: 10, h: 8, wall: '#b388eb', sign: '#f2c14e', stripes: ['#f2c14e', '#7b3fbf'], letters: '#5bc0eb' },
      { x: 102, hu: 7.5, h: 6, wall: '#ff9f59', sign: '#2b6cb0', stripes: ['#ffffff', RED] },
    ];
    for (const a of arcades) b.prop('boardwalk:arcade', a.x, a.z ?? 5, { hv: 7, front: 1, ...a, z: a.z ?? 5, ang: 0, r: a.hu });
    for (const [x, z, kind, color, ang] of [
      [-42, 3, 'hotdog', '#e5484d', 0], [5, 8, 'candy', '#f78fb3', 0], [12, 8, 'lemonade', '#f2c14e', 0],
      [5, -24, 'popcorn', '#e5484d', -Math.PI / 2], [-133, -58, 'hotdog', '#2b6cb0', Math.PI / 2], [-6, -104, 'lemonade', '#2f8f5b', 0],
      [58, -40, 'icecream', '#5bc0eb', Math.PI], [-60, -64, 'candy', '#b388eb', Math.PI], [124, 8, 'popcorn', '#e5484d', 0],
    ]) {
      if (!b.inCorridor(x, z, 5)) b.prop('boardwalk:food', x, z, { kind, color, ang, r: 2.6 });
    }

    // ----------------------------------------------------- midway booths
    const games = ['bottles', 'cans', 'ducks'];
    const boothColors = [RED, '#2b6cb0', '#2f8f5b', '#7b3fbf', '#ff7a3d', '#e94f9a'];
    let gi = 0;
    for (const [z, front] of [[-17, -1], [-54, 1]]) {
      for (let x = -120; x <= -50; x += 6.2) {
        if (b.inCorridor(x, z, 5)) continue;
        const c = boothColors[gi % boothColors.length];
        // the front faces the midway (local +w is +z when ang = 0)
        b.prop('boardwalk:booth', x, z, { front, color: c, sign: gi % 2 ? '#f2c14e' : '#ffffff', game: games[gi % 3], ang: 0, r: 2.4 });
        gi++;
      }
    }

    // ----------------------------------------------------- park landmarks
    b.prop('boardwalk:carousel', 44, -88, { r: 8, ang: 0 });
    b.prop('boardwalk:bandstand', -12, -80, { r: 5.2, ang: 0 });
    b.prop('boardwalk:watertower', -108, -100, { r: 3.6, h: 14, ang: 0 });
    b.prop('lighthouse', LIGHT.x, LIGHT.z, { h: 15, r: 3 });
    for (const [x, z, ang, color] of [[-78, 44, 0, '#5bc0eb'], [62, 62, 0, '#f2c14e'], [160, 66, 0.3, '#e5484d'], [-186, 52, -0.2, '#f2c14e']]) {
      if (!b.inCorridor(x, z, 5)) b.prop('boardwalk:lifeguard', x, z, { ang, color, r: 2.2 });
    }
    for (const [x, z, ang] of [[-30, -76, 0.4], [-36, -86, 0.1], [8, -60, -0.3], [-60, -90, 1.2], [70, -112, 0.2]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('table', x, z, { ang, r: 1.2 });
    }
    for (const [x, z] of [[-30, -18], [-10, -40], [-130, -24], [-125, -48], [30, -60], [-2, -90]]) if (!b.inCorridor(x, z, 3)) b.prop('bin', x, z, { r: 0.5 });

    // --------------------------------------------- string lights everywhere
    const poles = (pts, h, y, pad = 4) => pts.map(([x, z]) => (b.inCorridor(x, z, pad) ? null : (b.prop('boardwalk:pole', x, z, { y, h, r: 0.3 }), { x, z, y: (y ?? b.hf.get(x, z)) + h })));
    const string = (a, c, sag = 0.7) => { if (a && c) b.prop('boardwalk:lights', a.x, a.z, { x2: c.x, z2: c.z, y0: a.y - 0.15, y1: c.y - 0.15, sag, r: 0 }); };
    // along the beach side of the boardwalk
    const bw = [];
    for (let x = -192; x <= 192; x += 16) bw.push(Math.abs(x - PIER.x) < 10 ? [PIER.x - 9, 26.2] : [x, 26.2]);
    const bwp = poles(bw, 5, WALK);
    for (let k = 1; k < bwp.length; k++) string(bwp[k - 1], bwp[k]);
    // zig-zags along the pier
    const pl = [];
    for (let z = 36; z <= 100; z += 13) pl.push([18.4, z], [31.6, z + 6.5]);
    const pp = poles(pl, 5, DECK);
    for (let k = 1; k < pp.length; k++) string(pp[k - 1], pp[k], 0.5);
    // round the pier head
    const hp = [[-7.4, 100.6], [10, 100.6], [40, 100.6], [62, 100.6], [81.4, 100.6], [81.4, 135.4], [62, 135.4], [20, 135.4], [-7.4, 135.4], [-7.4, 118]];
    const hpp = poles(hp, 5.5, DECK, 7);
    for (let k = 1; k < hpp.length; k++) string(hpp[k - 1], hpp[k], 0.9);
    // across the midway
    const mid = [];
    for (let x = -118; x <= -46; x += 12) mid.push([x, -21], [x + 6, -50]);
    const mp = poles(mid, 6, undefined);
    for (let k = 1; k < mp.length; k++) string(mp[k - 1], mp[k], 1.0);
    // round the plaza and out to the bandstand
    const pz = poles(ring({ x: -20, z: -27 }, 15.5, 10).map(([x, z]) => [x, z]), 6, undefined);
    for (let k = 0; k < pz.length; k++) string(pz[k], pz[(k + 1) % pz.length], 0.6);

    // ------------------------------------------------------------ the beach
    const brolly = ['#e94f37', '#f2b134', '#3a86c8', '#4caf7d', '#ffffff', '#e94f9a'];
    const towels = ['#e5484d', '#2b6cb0', '#f2c14e', '#2f8f5b', '#7b3fbf', '#ff7a3d', '#5bc0eb'];
    const spots = [];
    for (let i = 0; i < 400 && spots.length < 46; i++) {
      const x = b.R(-196, 172), z = b.R(34, 74);
      if (Math.abs(x - PIER.x) < 13 || z > shore(x) - 6 || b.inCorridor(x, z, 5)) continue;
      if (spots.some((q) => Math.hypot(q.x - x, q.z - z) < 7)) continue;
      spots.push({ x, z });
      b.prop('umbrella', x, z, { r: 1.2, color: b.pick(brolly) });
      const a = b.R(-0.5, 0.5) + Math.PI / 2;
      b.prop('boardwalk:towel', x + 1.8 * Math.cos(a), z + 1.8 * Math.sin(a), { ang: a, color: b.pick(towels), r: 0 });
      if (b.chance(0.5)) b.prop('boardwalk:towel', x - 1.6 * Math.cos(a) + 0.5, z - 1.6 * Math.sin(a), { ang: a + 0.2, color: b.pick(towels), r: 0 });
    }
    b.prop('canoe', 150, 84, { ang: 0.4, r: 2.4, color: '#e5484d' });
    b.prop('canoe', -100, 80, { ang: -0.2, r: 2.4, color: '#f2c14e' });
    // sea grass on the dunes and along the boardwalk
    for (let i = 0; i < 160; i++) {
      const x = b.R(-198, 190), z = x < -100 ? b.R(28, 60) : b.R(28, 33);
      if (Math.abs(x - PIER.x) < 9 || b.inCorridor(x, z, 4)) continue;
      b.prop('reeds', x, z, { n: 9, r: 0 });
    }
    // rocks round the lighthouse point
    for (let i = 0; i < 60; i++) {
      const x = b.R(160, 198), z = b.R(80, 125), g = b.hf.get(x, z);
      if (g < L - 0.8 || g > L + 1.4 || b.inCorridor(x, z, 6) || Math.hypot(x - LIGHT.x, z - LIGHT.z) < 4) continue;
      b.prop('boulder', x, z, { r: b.R(0.8, 1.9) });
    }
    for (const [x, z, r] of [[-60, 110, 12], [120, 120, 10]]) b.ducks.push({ x, z, r, speed: 0.35, phase: x * 0.1 });

    // ---------------------------------------- benches along the boardwalk
    for (let x = -184; x <= 184; x += 24) {
      if (Math.abs(x - PIER.x) < 10 || b.inCorridor(x, 18.6, 3)) continue;
      b.prop('bench', x, 18.6, { y: WALK, ang: 0, r: 1 });
    }

    // ------------------------------------------------ the lot and Ocean Ave
    for (let x = -190; x <= -142; x += 4) {
      for (const [z, ang] of [[-118, Math.PI / 2], [-104, -Math.PI / 2], [-100, Math.PI / 2], [-90, -Math.PI / 2]]) {
        if (b.chance(0.6)) b.car({ x, z }, ang);
      }
    }
    for (const x of [-170, -120, -60, 40, 90, 150]) {
      if (!b.inCorridor(x, -137.6, 4)) b.car({ x: x + b.R(-6, 6), z: -137.6 }, 0);
    }
    b.lampsAlong(ave, 40, 4.6, 20);

    // ------------------------------------------------------------ palms
    for (let x = -186; x <= 186; x += 13) {
      const z = 13.5 + b.R(-0.5, 0.5);
      if (b.clearForTree(x, z, 2.2, { corridor: 6, roadPad: 2 })) b.tree({ x, z }, b.R(2.0, 2.6), 'palm');
    }
    for (const [x, z] of [[118, -60], [128, -95], [160, -90], [170, -50], [162, -28], [150, -100], [112, -86]]) {
      if (b.clearForTree(x, z, 2.4, { corridor: 7 })) b.tree({ x, z }, b.R(2.2, 2.8), 'palm');
    }
    b.scatter(9000, (x, z) => {
      if (z > 12) return null; // the boardwalk and the beach
      if (inLoop(x, z)) return null; // the coaster's infield is a lawn
      const u = b.rng();
      if (z > -66 && x > -136 && x < 112 && b.rng() > 0.35) return null; // the midway and the arcades stay open
      if (b.rng() > 0.4) return null;
      if (u < 0.55) return { kind: 'palm', r: b.R(2, 2.8), tall: b.R(0.75, 1.0), corridor: 7 };
      if (u < 0.85) return { kind: 'broad', r: b.R(3, 4.6), corridor: 8 };
      return { kind: 'bush', r: b.R(1.2, 2.2), corridor: 7 };
    });
  },
};


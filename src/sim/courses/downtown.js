// Meridian City: nine holes through an invented downtown. Glass towers and brick mid-rises
// line the street canyons, the Loop El rides its steel girders above Lake Street, Meridian
// Plaza has its fountain and a mirror-steel sculpture, the Heights look down over Bluff Park,
// City Hall stands over a reflecting pool with an island green, and the round finishes off
// the Riverwalk with the whole skyline ahead.
import { SUMMER } from './themes.js';

const W = 10; // street width
const FRONT = 8.4; // street centre to building front: half the street, then the sidewalk
const WALK = 6.7; // street centre to the middle of the sidewalk
const EL_Z = -12; // the El runs above Lake Street
const EL = { w: 7, clear: 7 }; // deck width, height of the deck's underside
const POOL = { x0: 102, x1: 178, z0: 50, z1: 78, level: 2.6 };
const ISLAND = { x: 128, z: 64, r: 10 };
const RIVER = 1.0;

const EW = [['Hill St', -122, -210, 210], ['Bluff St', -40, -210, 210], ['Lake St', EL_Z, -210, 210],
  ['Market St', 40, -210, -62], ['Market St', 40, 62, 210], ['Water St', 88, -210, 210]];
const NS = [['1st Ave', -155, -160, 88], ['Grand Ave', -92, -160, 88], ['State Ave', 92, -160, 88], ['Pier Ave', 135, -160, 40]];

const DOWNTOWN = {
  ...SUMMER,
  music: 'jazz', ambience: 'city',
  ground: {
    ...SUMMER.ground,
    woods: '#b4afa6', woodsMottle: ['#aaa59c', '#bcb7ad', '#a5a097', '#c2bdb3', '#b0aba1'],
    lawn: '#64a94b', lawnMottle: ['#5a9e42', '#6eb354', '#79bb5c', '#60a447'],
    path: '#d3cec4', curb: '#c4bfb5', asphalt: '#45484e', dirt: '#7d6a55', rock: '#8e8a83',
    sand: '#d9cba6', bottom: '#5d7068', deep: '#2f5563',
  },
  foliage: {
    ...SUMMER.foliage,
    broad: ['#3f8f3d', '#4a9a44', '#57a64c', '#3a8538', '#62ad50'],
    bush: ['#4a9442', '#58a24c', '#3f8a3a'],
  },
  water: { shallow: '#5aa7b8', deep: '#22617a', foam: '#eef8fb' },
};

const smooth = (a, b, t) => {
  const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const bank = (x) => 117 - 9 * Math.exp(-(((x - 40) / 28) ** 2)); // the river's edge, with a bend in by the inlet
const inPool = (x, z) => x > POOL.x0 && x < POOL.x1 && z > POOL.z0 && z < POOL.z1;

function height(x, z) {
  let h = 3 + 10 * (1 - smooth(-95, -45, z)); // the Heights, and Bluff Park sloping down from them
  if (inPool(x, z)) h = Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r ? 3.5 : 1.8;
  const e = bank(x);
  if (z > e) h = Math.max(-2, 3 - (z - e) * 4); // a stone quay
  return h;
}

export default {
  id: 'downtown',
  name: 'Meridian City',
  blurb: 'Glass towers, the Loop El, a plaza fountain, an island green and a skyline finish.',
  seed: 7707,
  world: { halfW: 200, halfH: 150 },
  theme: DOWNTOWN,

  create(b) {
    // ------------------------------------------------------------- plan
    const ew = EW.map(([name, z, x0, x1]) => b.road([[x0, z], [x1, z]], { width: W, name, lawn: 0, shoulder: 2, lines: true }));
    const ns = NS.map(([name, x, z0, z1]) => b.road([[x, z0], [x, z1]], { width: W, name, lawn: 0, shoulder: 2, lines: true }));
    b.lake([[-260, 100], [260, 100], [260, 220], [-260, 220]], RIVER, { name: 'river', per: 1 });
    b.lake([[POOL.x0 - 1, POOL.z0 - 1], [POOL.x1 + 1, POOL.z0 - 1], [POOL.x1 + 1, POOL.z1 + 1], [POOL.x0 - 1, POOL.z1 + 1]], POOL.level, { name: 'reflecting pool', per: 1 });
    b.terrain(height);
    for (const r of [...ew, ...ns]) {
      for (const s of [-1, 1]) b.footpath(r.pts.map((p, i) => {
        const q = r.offset(r.cum[i], s * WALK);
        return [q.x, q.z];
      }), { width: 3.4, name: 'sidewalk' });
    }
    // parks and plazas
    b.lawnArea([[-205, -95], [205, -95], [205, -47], [-205, -47]]); // Bluff Park, down the slope
    b.lawnArea([[-205, -115], [205, -115], [205, -95], [-205, -95]]); // the Overlook along the top
    b.lawnArea([[-146.6, 48.4], [-100.4, 48.4], [-100.4, 79.6], [-146.6, 79.6]]); // Linden Park
    b.lawnArea([[-60, 6], [-12, 6], [-12, 34], [-60, 34]]);
    b.lawnArea([[12, 6], [60, 6], [60, 34], [12, 34]]);
    b.lawnArea([[-205, 103], [205, 103], [205, 125], [-205, 125]]); // the Riverwalk lawn, down to the water
    const PLAZA = '#d4c9b6';
    b.pavedArea([[-62, -3.6], [62, -3.6], [62, 6], [-62, 6]], { color: PLAZA });
    b.pavedArea([[-12, 6], [12, 6], [12, 34], [-12, 34]], { color: PLAZA });
    b.pavedArea([[-62, 34], [62, 34], [62, 79.6], [-62, 79.6]], { color: PLAZA });
    // Civic Center: granite round the reflecting pool; the island in it is lawn
    const CIVIC = '#d8d2c6';
    b.pavedArea([[100.4, 48.4], [200, 48.4], [200, POOL.z0], [100.4, POOL.z0]], { color: CIVIC });
    b.pavedArea([[100.4, POOL.z1], [200, POOL.z1], [200, 79.6], [100.4, 79.6]], { color: CIVIC });
    b.pavedArea([[100.4, POOL.z0], [POOL.x0, POOL.z0], [POOL.x0, POOL.z1], [100.4, POOL.z1]], { color: CIVIC });
    b.pavedArea([[POOL.x1, POOL.z0], [200, POOL.z0], [200, POOL.z1], [POOL.x1, POOL.z1]], { color: CIVIC });
    b.lawnArea(Array.from({ length: 16 }, (_, k) => [ISLAND.x + Math.cos((k / 16) * Math.PI * 2) * (ISLAND.r + 0.6), ISLAND.z + Math.sin((k / 16) * Math.PI * 2) * (ISLAND.r + 0.6)]));
    b.pavedArea([[-205, 96], [205, 96], [205, 103], [-205, 103]], { color: '#b9a593' }); // Riverwalk brick
    b.footpath([[45, -95], [45, -47]], { width: 7, name: 'Grand Stair', color: '#cfc8bb' });
    b.footpath([[-205, -100], [205, -100]], { width: 4, name: 'Overlook Walk', color: '#d6cfc2' });
    b.footpath([[-146, 52], [-100, 76]], { width: 2.6, name: 'path' });
    b.footpath([[-146, 76], [-100, 52]], { width: 2.6, name: 'path' });

    // ------------------------------------------------------------ holes
    const holes = [
      { name: 'Meridian Plaza', par: 3, tee: { x: 45, z: 62 }, basket: { x: -25, z: 15 } },
      { name: 'Market Street Hook', par: 3, tee: { x: -66, z: 40 }, via: [{ x: -118, z: 40 }], basket: { x: -132, z: 64 }, corridor: 5 },
      { name: 'Under the El', par: 3, tee: { x: -155, z: 40 }, basket: { x: -155, z: -30 }, corridor: 5 },
      { name: 'Heartbreak Hill', par: 4, tee: { x: -155, z: -48 }, via: [{ x: -155, z: -122 }], basket: { x: -104, z: -122 }, corridor: 5 },
      { name: 'Overlook Drop', par: 3, tee: { x: -75, z: -106 }, basket: { x: 15, z: -52 } },
      { name: 'Bluff Street Bend', par: 4, tee: { x: 45, z: -40 }, via: [{ x: 135, z: -40 }], basket: { x: 135, z: 30 }, corridor: 5 },
      { name: 'Civic Island', par: 3, drop: [128, 81], tee: { x: 184, z: 42 }, basket: { x: ISLAND.x, z: ISLAND.z } },
      { name: 'The Riverwalk', par: 4, drop: [-16, 101], tee: { x: 124, z: 100 }, via: [{ x: 40, z: 96 }], basket: { x: -32, z: 99 } },
      { name: 'Skyline Finish', par: 3, tee: { x: -56, z: 95 }, basket: { x: 28, z: 72 } },
    ];
    for (const h of holes) b.hole(h);

    // -------------------------------------------------------- buildings
    const built = [];
    const G = (x, z) => b.hf.get(x, z);
    const clearOfPlay = (cx, cz, hu, hv, pad) => {
      const nu = Math.ceil((2 * hu) / 3), nv = Math.ceil((2 * hv) / 3);
      for (let i = 0; i <= nu; i++) {
        for (let j = 0; j <= nv; j++) if (b.inCorridor(cx - hu + (2 * hu * i) / nu, cz - hv + (2 * hv * j) / nv, pad)) return false;
      }
      return true;
    };
    const overlaps = (cx, cz, hu, hv) => built.some((o) => Math.abs(cx - o.x) < hu + o.hu + 0.4 && Math.abs(cz - o.z) < hv + o.hv + 0.4);
    const building = (cx, cz, hu, hv, h, o = {}) => {
      if (overlaps(cx, cz, hu, hv) || !clearOfPlay(cx, cz, hu, hv, o.pad ?? 6)) return null;
      const y = Math.min(G(cx - hu, cz - hv), G(cx + hu, cz - hv), G(cx + hu, cz + hv), G(cx - hu, cz + hv), G(cx, cz)) - 0.15;
      const style = o.style ?? (h >= 34 ? (h > 55 && b.chance(0.4) ? 'setback' : 'glass') : b.pick(['brick', 'brick', 'stone', 'office']));
      const glassy = style === 'glass' || style === 'setback';
      const p = b.prop('downtown:tower', cx, cz, {
        hu, hv, h, style, y, r: 0,
        wall: o.wall ?? (glassy ? b.pick(['#2f3a46', '#55616e', '#8d98a4', '#3c4a42', '#6b5f55'])
          : style === 'brick' ? b.pick(['#9c4a36', '#a65d42', '#8a3f30', '#b06a4a', '#7d4535'])
            : style === 'stone' ? b.pick(['#d6ccb8', '#c9bfae', '#e0d8c8', '#bfb39c']) : b.pick(['#b9b6b0', '#cfcac0', '#a9adb3', '#d8d3c7'])),
        trim: o.trim ?? b.pick(['#e8e2d6', '#d9d2c4', '#c9c4ba', '#f2eee6']),
        accent: b.pick(['#c0392b', '#2f6b8a', '#2f6b3a', '#b5832a', '#6a3d7a', '#1f4f6f', '#a33d5a']),
        crown: o.crown ?? (glassy ? b.pick(['flat', 'antenna', 'pyramid', 'flat', 'slant']) : null),
        tank: !glassy && h < 30 && b.chance(0.4), sign: !glassy && b.chance(0.25),
        upper: style === 'setback' ? b.R(0.55, 0.72) : 1, split: b.R(0.5, 0.68),
      });
      built.push({ x: cx, z: cz, hu, hv });
      return p;
    };
    // fill a block (the rectangle inside the building fronts) with lots
    const block = (x0, x1, z0, z1, zone) => {
      const alongX = x1 - x0 >= z1 - z0;
      const len = alongX ? x1 - x0 : z1 - z0, cross = alongX ? z1 - z0 : x1 - x0;
      let s = 0;
      while (s < len - 7) {
        let lot = b.R(zone.lot[0], zone.lot[1]);
        if (len - s - lot < 9) lot = len - s;
        const rows = cross > 26 && b.chance(zone.two ?? 0.5) ? 2 : 1;
        const corner = s === 0 || s + lot >= len - 0.1;
        for (let r = 0; r < rows; r++) {
          const c0 = rows === 1 ? 0 : r ? cross / 2 + 0.7 : 0, c1 = rows === 1 ? cross : r ? cross : cross / 2 - 0.7;
          const a0 = s + (s === 0 ? 0 : 0.7), a1 = s + lot - (s + lot >= len - 0.1 ? 0 : 0.7);
          const hu = (a1 - a0) / 2, hv = (c1 - c0) / 2;
          let h = b.R(zone.h[0], zone.h[1]) * (corner ? 1.25 : 1) * (rows === 2 ? 0.7 : 1);
          h = Math.max(7.5, h);
          if (alongX) building(x0 + (a0 + a1) / 2, z0 + (c0 + c1) / 2, hu, hv, h);
          else building(x0 + (c0 + c1) / 2, z0 + (a0 + a1) / 2, hv, hu, h);
        }
        s += lot;
      }
    };
    // landmarks first: Meridian Tower on the plaza and City Hall over the pool
    building(73, 14, 10.4, 13, 122, { style: 'setback', crown: 'spire', wall: '#38434f', pad: 4 });
    building(191.5, 65, 8, 12, 15, { style: 'civic', wall: '#e4dccb', trim: '#f4f0e6', pad: 4 });
    const XS = [[-199, -163.4], [-146.6, -100.4], [-83.6, 83.6], [100.4, 126.6], [143.4, 199]];
    const SKY = { lot: [16, 26], h: [42, 92], two: 0 }, LOW = { lot: [10, 18], h: [8, 16], two: 0 };
    const CORE = { lot: [14, 24], h: [16, 62], two: 0.5 }, MID = { lot: [12, 20], h: [14, 40], two: 0.5 };
    for (const [x0, x1] of XS) block(x0, x1, -149, -130.4, SKY); // the skyline along the Heights
    for (const [x0, x1] of XS) block(x0, x1, -31.6, -20.4, LOW); // shops between Bluff Street and the El
    for (const [x0, x1] of [[-199, -163.4], [-146.6, -100.4], [100.4, 126.6], [143.4, 199]]) block(x0, x1, -3.6, 31.6, CORE);
    block(-83.6, -62, -3.6, 31.6, MID); // the plaza's flanks
    block(-83.6, -62, 48.4, 79.6, MID);
    block(62, 83.6, -3.6, 31.6, MID);
    block(62, 83.6, 48.4, 79.6, MID);
    block(-199, -163.4, 48.4, 79.6, MID);

    // ------------------------------------------------- the Loop El
    const avenueX = NS.map(([, x]) => x);
    const cols = [];
    for (let x = -204; x <= 204; x += 18) {
      if (avenueX.some((a) => Math.abs(x - a) < 9)) continue;
      if (Math.abs(x) < 30) continue; // the station has its own supports
      cols.push(x);
    }
    for (const x of [-27, 27]) cols.push(x);
    b.prop('downtown:el', 0, EL_Z, { hu: 212, w: EL.w, clear: EL.clear, cols, r: 0 });
    b.prop('downtown:station', 0, EL_Z, { hu: 25, w: EL.w, clear: EL.clear, r: 0 });
    b.prop('downtown:train', -2, EL_Z, { hu: 21.5, clear: EL.clear, track: 1.7, cars: 3, r: 0 });

    // --------------------------------------------------- Meridian Plaza
    b.prop('downtown:fountain', -8, 48, { r: 7 });
    b.prop('downtown:sculpture', 25, 22, { r: 4.5 });
    for (const [x, z, ang, color] of [[-52, 73, 0, '#e94f37'], [-40, 75, Math.PI / 2 - 0.2, '#2f8fd8'], [-27, 75.5, 0.25, '#f2b134']]) {
      b.prop('downtown:truck', x, z, { ang, color, r: 3.5 });
    }
    for (const [x, z] of [[-20, 42], [4, 42], [-20, 56], [4, 56]]) b.prop('downtown:planter', x, z, { hu: 2.2, hv: 1.0, ang: x < 0 ? 0 : 0, r: 2.4 });
    for (const [x, z] of [[-58, 10], [-58, 30], [58, 30]]) b.prop('downtown:planter', x, z, { hu: 1.0, hv: 2.6, r: 2.8 });
    for (const [x, z, ang] of [[-8, 39.5, 0], [-8, 56.5, Math.PI], [-17, 48, -Math.PI / 2], [1, 48, Math.PI / 2], [-40, 4, Math.PI], [40, 4, Math.PI], [0, 64, Math.PI]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang, r: 1 });
    }
    for (const [x, z] of [[-14, 44], [-2, 44]]) b.prop('bin', x, z, { r: 0.6 });
    b.clearZone(-8, 48, 10);
    b.clearZone(25, 22, 8);
    // cafe tables by the food trucks, and trees in grates across the south of the plaza
    for (const [x, z] of [[-50, 64], [-40, 66], [-30, 64], [-45, 57], [-35, 58]]) {
      if (b.inCorridor(x, z, 4)) continue;
      b.prop('table', x, z, { ang: 0.3, r: 1.2 });
      b.prop('umbrella', x, z, { color: b.pick(['#e94f37', '#2f8fd8', '#f2b134', '#3a9a5a']), r: 0.3 });
    }
    for (const x of [-54, -22, 10, 22, 54]) {
      for (const z of [40, 52]) {
        if (Math.hypot(x + 8, z - 48) < 12 || b.inCorridor(x, z, 7)) continue;
        b.tree({ x, z }, b.R(2.2, 2.8), 'broad', { tall: 0.95 });
        b.prop('downtown:planter', x, z, { hu: 1.3, hv: 1.3, grate: true, r: 1.5 });
      }
    }

    // ------------------------------------------------ Civic Center pool
    b.span({ x: ISLAND.x, z: ISLAND.z + ISLAND.r - 1 }, { x: ISLAND.x, z: POOL.z1 + 1.5 }, 2.6, 3.65, { kind: 'stone' });
    b.ducks.push({ x: 160, z: 66, r: 7, speed: 0.4, phase: 1 });
    b.ducks.push({ x: -60, z: 135, r: 12, speed: 0.35, phase: 3 });
    for (const [x, z, ang] of [[150, 81, Math.PI], [112, 81, Math.PI], [170, 47, 0]]) {
      if (!b.inCorridor(x, z, 3.5)) b.prop('bench', x, z, { ang, r: 1 });
    }

    // ------------------------------------------------------ the river
    b.prop('downtown:boat', -95, 131, { ang: 0.1, r: 6, y: RIVER });
    b.prop('downtown:boat', 150, 134, { ang: Math.PI - 0.15, r: 6, y: RIVER, color: '#2f6b8a' });
    for (const x of [-180, -140, -100, -60, 80, 100, 160, 185]) {
      const z = bank(x) - 2.2;
      if (!b.inCorridor(x, z, 4)) b.prop('bench', x, z, { ang: Math.PI, r: 1 });
    }

    // ------------------------------------------------- streetscape
    const crossings = [];
    for (const [, z, x0, x1] of EW) {
      for (const [, x, z0, z1] of NS) if (x > x0 && x < x1 && z >= z0 && z <= z1) crossings.push({ x, z, t: z === z1 });
    }
    for (const c of crossings) {
      b.prop('downtown:crosswalk', c.x, c.z, { half: W / 2, tee: c.t, r: 0 });
      for (const [sx, sz] of [[-1, -1], [1, 1]]) {
        const x = c.x + sx * 6.2, z = c.z + sz * 6.2;
        if (c.t && sz > 0) continue;
        const arm = [0, 2, 4, 6].map((d) => ({ x: x - sx * d, z }));
        if (!arm.some((q) => b.inCorridor(q.x, q.z, 4))) b.prop('downtown:signal', x, z, { ang: sx < 0 ? 0 : Math.PI, r: 0.4 });
      }
    }
    const nearCrossing = (x, z, d) => crossings.some((c) => Math.abs(x - c.x) < d && Math.abs(z - c.z) < d);
    for (const r of [...ew, ...ns]) b.lampsAlong(r, 30, r === ew[2] ? 6.2 : 6.0, 10);
    for (const r of [...ew, ...ns]) {
      // street trees in the sidewalks, and cars and taxis parked along the curb
      if (r === ew[2]) continue; // under the El
      for (let s = 8; s < r.length - 8; s += 15) {
        for (const side of [-1, 1]) {
          const q = r.offset(s, side * 5.7);
          if (Math.abs(q.x) > 196 || Math.abs(q.z) > 146 || nearCrossing(q.x, q.z, 10)) continue;
          if (r === ew[5] && side > 0) continue; // the river side of Water Street is the Riverwalk
          if (b.inCorridor(q.x, q.z, 7.5) || b.blocked(q.x, q.z, 1.2) || b.wet(q.x, q.z, 0.3)) continue;
          if (b.lamps.some((l) => Math.hypot(l.x - q.x, l.z - q.z) < 3)) continue;
          if (b.chance(0.7)) b.tree({ x: q.x, z: q.z }, b.R(1.5, 1.9), 'broad', { tall: 0.85 });
        }
      }
      for (let s = 12; s < r.length - 10; s += 7) {
        if (!b.chance(0.33)) continue;
        const side = b.chance(0.5) ? -1 : 1, q = r.offset(s, side * 3.7);
        if (Math.abs(q.x) > 194 || Math.abs(q.z) > 144 || nearCrossing(q.x, q.z, 13)) continue;
        if (b.inCorridor(q.x, q.z, 6) || b.blocked(q.x, q.z, 2)) continue;
        b.car(q, Math.atan2(q.tz, q.tx) + (side > 0 ? 0 : Math.PI), b.chance(0.45) ? 4 : b.pick([0, 1, 2, 3, 5, 6, 7]));
      }
    }
    for (const [x, z, ang] of [[-85.3, 62, Math.PI / 2], [85.3, 18, -Math.PI / 2], [-170, 81.3, 0], [60, -46.7, Math.PI]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('downtown:busstop', x, z, { ang, r: 2.2 });
    }
    for (const [x, z] of [[-86, 30], [86, 50], [-148.5, 50], [99, -18]]) b.prop('hydrant', x, z, { r: 0.4 });

    // ------------------------------------------------ Bluff Park and the Overlook
    b.prop('downtown:stairs', 45, -71, { ax: 45, az: -95, bx: 45, bz: -47, w: 7, r: 0 });
    for (const [x, z] of [[-40, -98.5], [-10, -98.5], [20, -98.5], [80, -98.5], [-120, -98.5], [120, -98.5]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang: Math.PI / 2, r: 1 });
    }
    b.prop('gazebo', -112, 70, { size: 4.6, r: 4 });
    for (const [x, z, ang] of [[-140, 72, 0.3], [-108, 56, 1.2]]) b.prop('bench', x, z, { ang, r: 1 });

    // trees in the parks
    b.scatter(9000, (x, z) => {
      const slope = z > -93 && z < -47, top = z > -114 && z < -96 && Math.abs(z + 100) > 3;
      const linden = x > -145 && x < -102 && z > 50 && z < 78;
      const lawns = Math.abs(x) > 14 && Math.abs(x) < 58 && z > 9 && z < 33;
      const river = z > 97 && z < bank(x) - 3;
      if (slope) return b.rng() < 0.3 ? { kind: b.rng() < 0.75 ? 'broad' : 'pine', r: b.R(2.2, 3.6), tall: 0.9, roadPad: 4 } : null;
      if (top) return b.rng() < 0.12 ? { kind: 'broad', r: b.R(2, 3), roadPad: 4 } : null;
      if (linden) return b.rng() < 0.5 ? { kind: 'broad', r: b.R(2.4, 3.8), roadPad: 4 } : null;
      if (lawns) return b.rng() < 0.35 ? { kind: 'broad', r: b.R(2, 3), roadPad: 4, tall: 0.9 } : null;
      if (river) return b.rng() < 0.18 ? { kind: 'broad', r: b.R(2.2, 3), roadPad: 4 } : null;
      return null;
    });
  },
};

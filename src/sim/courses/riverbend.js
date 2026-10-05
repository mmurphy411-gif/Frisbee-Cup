// Riverbend. A river town: the Bend River sweeps through the middle of town between the
// high bank, where High Street and the old bell tower look down from the bluff, and the
// low bank, where cottages line Willow Lane. Tee off in Bluff Park, run the bluff top,
// ferry across the water to the boathouse, come back down Cottage Row and the towpath,
// carry the oxbow, then cross the river again and climb home along the bluff.
import { smoothstep } from '../geom.js';
import { Path, catmullRom } from '../path.js';
import { LAKESIDE } from './themes.js';

const L = 2; // river level
const OX = L + 0.6; // the oxbow backwater, cut off from the river

const RIVER = new Path(catmullRom(
  [[-225, -34], [-175, -16], [-125, 6], [-75, 20], [-25, 16], [25, -2], [75, -14], [125, -6], [170, 12], [225, 22]], 12,
), 24, 'river');
const HW = (s) => 12 + 1.8 * Math.sin(0.016 * s + 0.6); // half width of the water

// A point near x on the river, d metres off its centre line: d < 0 is the high (north)
// bank, d > 0 the low (south) bank.
const RV = (x, d) => RIVER.offset(RIVER.sAlong(0, x), d);
// A point t of the way from a to c, off metres to the right of travel.
const on = (a, c, t, off = 0) => {
  const dx = c.x - a.x, dz = c.z - a.z, l = Math.hypot(dx, dz);
  return { x: a.x + dx * t - (dz / l) * off, z: a.z + dz * t + (dx / l) * off };
};

function land(x, z) {
  const { s, d } = RIVER.project(x, z);
  const a = Math.abs(d) - HW(s);
  if (a < 0) return L - Math.min(2.6, 0.45 - a * 0.4);
  const roll = 0.5 * Math.sin(0.023 * x + 0.4) * Math.cos(0.019 * z - 0.6) + 0.3 * Math.sin(0.05 * x - 0.04 * z + 1.1);
  const bank = L + 0.45 + Math.min(a, 4) * 0.14 + (0.5 + roll) * smoothstep(4, 20, a);
  if (d < 0) return bank + 8 * smoothstep(7, 30, a) + 1.5 * smoothstep(50, 140, a); // the bluff
  return bank + 1.2 * smoothstep(8, 70, a) + 3 * smoothstep(100, 150, a);
}

export default {
  id: 'riverbend',
  name: 'Riverbend',
  blurb: 'A river town: bluff-top fairways, carries over the water and an oxbow backwater.',
  seed: 9403,
  world: { halfW: 200, halfH: 150 },
  theme: LAKESIDE,

  create(b) {
    // ------------------------------------------------------------- plan
    // both streets run west to east; side -1 is north, +1 south
    const high = b.road(
      [[-215, -104], [-160, -92], [-100, -72], [-40, -62], [20, -74], [80, -92], [140, -86], [215, -66]],
      { width: 7.5, name: 'High St', lawn: 30, lines: true },
    );
    const willow = b.road(
      [[-215, 44], [-160, 60], [-100, 84], [-40, 92], [20, 78], [80, 62], [140, 70], [215, 92]],
      { width: 6.5, name: 'Willow Ln', lawn: 34 },
    );
    const church = b.road([[-8, -66], [-12, -110], [-16, -160]], { width: 6, name: 'Church St', lawn: 22 });
    const mill = b.road([[120, -88], [124, -120], [128, -160]], { width: 6, name: 'Mill Rd', lawn: 22 });
    const ferry = b.road([[-40, 92], [-44, 125], [-48, 160]], { width: 6, name: 'Ferry Ln', lawn: 22 });
    const WL = (x, d) => willow.offset(willow.sAlong(0, x), d);

    const river = [];
    for (let s = 0; s <= RIVER.length; s += 6) { const p = RIVER.offset(s, -HW(s)); river.push([p.x, p.z]); }
    for (let s = RIVER.length; s >= 0; s -= 6) { const p = RIVER.offset(s, HW(s)); river.push([p.x, p.z]); }
    b.lake(river, L, { name: 'river', per: 1 });
    const ox = [];
    for (let k = 0; k < 20; k++) {
      const t = (k / 20) * Math.PI * 2, p = RV(-118 + 17 * Math.cos(t), 50 + 7.5 * Math.sin(t));
      ox.push([p.x, p.z]);
    }
    const oxbow = b.lake(ox, OX, { name: 'oxbow' });
    const ob = oxbow.bbox;
    b.terrain((x, z) => {
      const h = land(x, z);
      if (x < ob.minX - 25 || x > ob.maxX + 25 || z < ob.minZ - 25 || z > ob.maxZ + 25) return h;
      const sd = oxbow.poly.sdf(x, z, 30);
      return Math.min(h, sd < 0 ? OX - Math.min(1.5, 0.35 - sd * 0.3) : OX + 0.12 + sd * 0.16);
    });

    // the riverwalk under the bluff, the towpath on the low bank, and stairs up from the bridges
    const along = (d, x0, x1) => {
      const pts = [];
      for (let s = RIVER.sAlong(0, x0); s <= RIVER.sAlong(0, x1); s += 18) {
        const p = RIVER.offset(s, Math.sign(d) * (HW(s) + Math.abs(d)));
        pts.push([p.x, p.z]);
      }
      return pts;
    };
    // mown grass: the riverwalk verge, Bluff Park on the top of the bluff, the river meadow
    const ribbon = (e0, e1, x0, x1) => [...along(e0, x0, x1), ...along(e1, x0, x1).reverse()];
    b.lawnArea(ribbon(-0.5, -9, -205, 205));
    b.lawnArea(ribbon(-27, -64, -205, 205));
    b.lawnArea(ribbon(0.5, 56, -205, 205));
    b.footpath(along(-5, -196, 196), { name: 'Riverwalk' });
    b.footpath(along(7.5, -196, 196), { name: 'Towpath' });
    const BRIDGES = [-130, 118];
    for (const x of BRIDGES) {
      b.footpath([[RV(x, -16).x, RV(x, -16).z], [RV(x, -45).x, RV(x, -45).z], [RV(x, -74).x, RV(x, -74).z]], { name: 'Stairs' });
    }

    // ------------------------------------------------------------ holes
    const T1 = RV(-45, -64), B1 = RV(28, -48);
    const T2 = RV(40, -58), V2 = RV(96, -58), B2 = RV(150, -48);
    const T3 = RV(162, -52), B3 = RV(178, 30);
    const T4 = RV(186, 40), B4 = RV(115, 30);
    const T5 = RV(103, 38), V5 = WL(68, -3), B5 = WL(0, 8);
    const T6 = WL(-10, -6), B6 = RV(-72, 40);
    const T7 = RV(-86, 56), B7 = RV(-150, 36);
    const T8 = RV(-162, 28), B8 = RV(-174, -54); // well back from the lip, so a short drive isn't left on the face
    const T9 = RV(-186, -64), B9 = RV(-62, -60);
    const holes = [
      {
        name: 'High Street', par: 3, tee: T1, basket: B1,
        trees: [[on(T1, B1, 0.42, 7), 5, 'broad'], [on(T1, B1, 0.66, -6.5), 4.5, 'broad'], [on(T1, B1, 1.15, 2), 3.5, 'pine'], [on(T1, B1, 0.95, -9), 3, 'bush']],
      },
      {
        name: 'Bluff Run', par: 4, tee: T2, basket: B2, via: [V2],
        trees: [
          [on(T2, V2, 0.35, -7), 5, 'broad'], [on(T2, V2, 0.62, 7), 5.5, 'broad'], [on(T2, V2, 0.95, -8), 4.5, 'pine'],
          [on(V2, B2, 0.18, 8), 5, 'broad'], [on(V2, B2, 0.6, -6.5), 4, 'broad'], [on(V2, B2, 0.98, -8), 3.5, 'pine'],
        ],
      },
      {
        name: 'The Ferry', par: 3, tee: T3, basket: B3,
        trees: [[on(T3, B3, 0.16, 6.5), 4, 'broad'], [on(T3, B3, 0.9, -7), 4, 'willow'], [on(T3, B3, 1.02, 8), 3.6, 'broad']],
      },
      {
        name: 'Boathouse', par: 3, tee: T4, basket: B4,
        trees: [[on(T4, B4, 0.35, 6.5), 4.5, 'willow'], [on(T4, B4, 0.6, -6.5), 5, 'broad'], [on(T4, B4, 0.85, 6), 3.8, 'willow'], [on(T4, B4, 1.12, -1), 3, 'bush']],
      },
      {
        name: 'Cottage Row', par: 4, tee: T5, basket: B5, via: [V5],
        trees: [
          [on(T5, V5, 0.5, -7), 4.5, 'broad'], [WL(55, 7), 5, 'broad'], [WL(40, -7), 5, 'broad'], [WL(22, 6.8), 4.5, 'broad'],
          [WL(12, -6.5), 4, 'birch'], [WL(-8, 14), 3, 'bush'],
        ],
        cars: [[WL(48, 2.3), 0], [WL(30, -2.3), Math.PI]],
      },
      {
        name: 'Towpath', par: 3, tee: T6, basket: B6,
        trees: [[on(T6, B6, 0.35, 6.5), 5, 'broad'], [on(T6, B6, 0.6, -6.5), 4.5, 'willow'], [on(T6, B6, 1.1, 1.5), 3.5, 'bush']],
      },
      {
        name: 'Oxbow', par: 3, tee: T7, basket: B7,
        trees: [[on(T7, B7, 0.2, -7), 4, 'broad'], [on(T7, B7, 0.92, 7), 3.6, 'willow'], [on(T7, B7, 1.12, -2), 3.4, 'birch']],
      },
      {
        name: 'Salmon Run', par: 3, tee: T8, basket: B8,
        trees: [[on(T8, B8, 0.85, 6.5), 4, 'broad'], [on(T8, B8, 0.88, -7), 3.6, 'pine'], [on(T8, B8, 1.04, 8), 3.5, 'broad']],
      },
      {
        name: 'Homecoming', par: 4, tee: T9, basket: B9,
        trees: [
          [on(T9, B9, 0.25, 7), 5, 'broad'], [on(T9, B9, 0.45, -6.5), 5.5, 'broad'], [on(T9, B9, 0.7, 6.5), 5, 'broad'],
          [on(T9, B9, 0.88, -6), 4.5, 'birch'], [on(T9, B9, 1.1, 2), 3, 'bush'],
        ],
      },
    ];
    for (const h of holes) {
      b.hole(h);
      // keep the woods off the thrower's shoulder
      const n = h.via ? h.via[0] : h.basket, l = Math.hypot(n.x - h.tee.x, n.z - h.tee.z);
      b.clearZone(h.tee.x - ((n.x - h.tee.x) / l) * 4.4, h.tee.z - ((n.z - h.tee.z) / l) * 4.4, 9);
    }

    // --------------------------------------------- bridges, docks, boathouse
    for (const x of BRIDGES) {
      const s = RIVER.sAlong(0, x), w = HW(s) + 4;
      const a = RIVER.offset(s, -w), c = RIVER.offset(s, w);
      b.span(a, c, 2.6, Math.max(b.hf.get(a.x, a.z), b.hf.get(c.x, c.z)) + 0.2, { kind: 'bridge', rails: true });
    }
    {
      const s = RIVER.sAlong(0, 150), hw = HW(s), q = RIVER.offset(s, hw + 0.8);
      b.placeHouse({
        kind: 'boathouse', x: q.x, z: q.z, ang: Math.atan2(q.tz, q.tx) - Math.PI / 2, hu: 4.8, hv: 3.4, front: 1, stories: 1,
        wallH: 3.6, roofH: 2.2, roof: 'gable', wall: '#b5452f', roofColor: '#3f4a45', trim: '#ffffff',
        shutters: null, chimney: false, windows: false,
      });
      b.span(RIVER.offset(s + 9, hw + 0.5), RIVER.offset(s + 9, hw - 9), 2.2, L + 0.55, { kind: 'dock' });
      const s2 = RIVER.sAlong(0, -60), hw2 = HW(s2);
      b.span(RIVER.offset(s2, -hw2 - 0.5), RIVER.offset(s2, -hw2 + 8), 2.2, L + 0.55, { kind: 'dock' });
    }

    // ----------------------------------------------------------- houses
    // High Street: the old town on the bluff, with a row of shops downtown
    for (let s = 14; s < high.length - 10; s += 25) {
      const p = high.at(s);
      const downtown = p.x > 15 && p.x < 100;
      b.houseIfClear(high, s, -1, downtown
        ? { setback: 4.5, stories: 2, driveway: false, porchChance: 0, fenceChance: 0, chimney: false, hu: 6.8, hv: 5 }
        : { twoStory: 0.6 });
    }
    for (let s = 26; s < high.length - 10; s += 27) b.houseIfClear(high, s, 1, { pad: 4.5 });
    for (const s of [30, 60, 90]) {
      b.houseIfClear(church, s, -1);
      b.houseIfClear(church, s + 12, 1);
      b.houseIfClear(mill, s, -1);
      b.houseIfClear(mill, s + 12, 1);
      b.houseIfClear(ferry, s, -1, { hu: 4.8, hv: 3.8, twoStory: 0.1 });
      b.houseIfClear(ferry, s + 12, 1, { hu: 4.8, hv: 3.8, twoStory: 0.1 });
    }
    // Willow Lane: little cottages on the low bank
    const cottage = () => ({ hu: b.R(4.6, 5.8), hv: b.R(3.6, 4.4), twoStory: 0.12, setback: b.R(8, 10), porchChance: 0.6, fenceChance: 0.35 });
    for (let s = 12; s < willow.length - 10; s += 21) b.houseIfClear(willow, s, 1, cottage());
    for (let s = 22; s < willow.length - 10; s += 21) b.houseIfClear(willow, s, -1, { ...cottage(), pad: 4.5 });

    // the old bell tower on its green by the corner of High St and Church St
    for (const [x, d] of [[-26, -17], [-32, -17], [-38, -18], [-26, 15], [4, -18], [8, 15]]) {
      const s = high.sAlong(0, x), g = high.offset(s, d);
      if (b.blocked(g.x, g.z, 4) || b.inCorridor(g.x, g.z, 9) || church.dist(g.x, g.z) < 8) continue;
      b.prop('steeple', g.x, g.z, { h: 19, w: 4, ang: Math.atan2(g.tz, g.tx), r: 2.6 });
      for (const k of [-1, 1]) {
        const p = high.offset(s + k * 5, d - Math.sign(d) * 5);
        if (!b.blocked(p.x, p.z, 1)) b.prop('bench', p.x, p.z, { ang: Math.atan2(g.tz, g.tx) + (d < 0 ? Math.PI : 0), r: 1 });
      }
      break;
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, turn] of h.cars || []) b.car(p, Math.atan2(p.tz, p.tx) + turn);
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
    }
    // hedges and a pool or two in the Willow Lane yards
    for (const h of [...b.houses]) {
      if (h.kind !== 'house' || willow.dist(h.cx, h.cz) > 30 || !b.chance(0.45)) continue;
      // a hedge down the side of the front garden, away from the driveway
      const side = Math.sign(h.doorU) || 1, u = side * (h.hu + 2.4);
      const local = (w) => ({ x: h.cx + u * h.cos - w * h.sin, z: h.cz + u * h.sin + w * h.cos });
      const a = local(h.front * (h.hv - 1)), c = local(h.front * (h.hv + h.setback - 1.8));
      let ok = true;
      for (let k = 0; k <= 5 && ok; k++) {
        const x = a.x + ((c.x - a.x) * k) / 5, z = a.z + ((c.z - a.z) * k) / 5;
        if (b.blocked(x, z, 1) || b.inCorridor(x, z, 4)) ok = false;
      }
      if (ok) b.hedge(a, c, { h: 1.2, w: 0.9 });
    }
    for (const h of b.houses) {
      if (h.kind !== 'house' || !b.chance(0.22)) continue;
      const back = -h.front, p = { x: h.cx - h.sin * back * (h.hv + 7), z: h.cz + h.cos * back * (h.hv + 7) };
      const rect = { cx: p.x, cz: p.z, hu: 4.4, hv: 2.8, cos: h.cos, sin: h.sin };
      if (b.rectClear(rect, 4) && !b.blocked(p.x, p.z, 4) && !b.wet(p.x, p.z, 1) && Math.abs(p.x) < 190 && Math.abs(p.z) < 140) b.pool(p, h.ang, 4.4, 2.8);
    }

    // downtown: parked cars and hydrants
    for (const x of [30, 44, 66, 88, 150]) {
      const p = high.offset(high.sAlong(0, x), -2.4);
      b.car(p, Math.atan2(p.tz, p.tx) + (b.chance(0.5) ? 0 : Math.PI));
    }
    for (let s = 40; s < high.length - 20; s += 70) {
      const p = high.offset(s, -4.6);
      if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
    }
    b.lampsAlong(high, 40, -4.8, 20);
    b.lampsAlong(high, 80, 4.8, 40);
    b.lampsAlong(willow, 62, 4.4, 30);

    // Bluff Park and the riverbanks
    const gz = RV(186, -58);
    if (!b.blocked(gz.x, gz.z, 4) && !b.inCorridor(gz.x, gz.z, 7)) b.prop('gazebo', gz.x, gz.z, { size: 4.2, r: 3.5, ang: Math.atan2(gz.tz, gz.tx) });
    for (const x of [-170, -100, -20, 40, 100, 172]) {
      const s = RIVER.sAlong(0, x), p = RIVER.offset(s, -(HW(s) + 2.6));
      if (!b.inCorridor(p.x, p.z, 3.5)) b.prop('bench', p.x, p.z, { ang: Math.atan2(p.tz, p.tx), r: 1 }); // facing the water
    }
    for (const x of [-190, -60, 10, 160]) {
      const s = RIVER.sAlong(0, x), p = RIVER.offset(s, HW(s) + 3);
      if (!b.inCorridor(p.x, p.z, 3.5)) b.prop('bench', p.x, p.z, { ang: Math.atan2(p.tz, p.tx) + Math.PI, r: 1 });
    }
    for (const [x, d, a] of [[-28, -50, 0.2], [70, -48, -0.3], [-112, -68, 0.5], [176, -62, 1.1]]) {
      const p = RV(x, d);
      if (!b.inCorridor(p.x, p.z, 4) && !b.blocked(p.x, p.z, 2)) b.prop('table', p.x, p.z, { ang: a, r: 1.3 });
    }
    for (const [x, d, a, color] of [[128, 16, 0.3, '#d9534f'], [133, 16.5, 0.2, '#2f7d6d'], [-66, -15.5, 2.9, '#f2b134']]) {
      const p = RV(x, d);
      b.prop('canoe', p.x, p.z, { ang: Math.atan2(p.tz, p.tx) + a, r: 2.4, color });
    }
    b.prop('bin', RV(-14, 18).x, RV(-14, 18).z, { r: 0.5 });
    b.prop('bin', RV(132, -18).x, RV(132, -18).z, { r: 0.5 });
    for (const [x, d, r] of [[-196, -24, 1.4], [70, -30, 1.6], [-2, -26, 1.2], [182, -30, 1.5]]) {
      const p = RV(x, d);
      if (!b.inCorridor(p.x, p.z, 4)) b.prop('boulder', p.x, p.z, { r });
    }

    // reeds along both banks, lily pads on the oxbow, ducks on the water
    const nearDeck = (x, z) => b.platforms.some((p) => Math.hypot(x - p.cx, z - p.cz) < p.hu + 3);
    for (let s = 8; s < RIVER.length - 8; s += 5) {
      for (const side of [-1, 1]) {
        if (!b.chance(0.3)) continue;
        const p = RIVER.offset(s, side * (HW(s) + b.R(-1.2, 0.4)));
        const g = b.hf.get(p.x, p.z) - L;
        if (g > -0.4 && g < 0.2 && !nearDeck(p.x, p.z) && !b.inCorridor(p.x, p.z, 2)) b.prop('reeds', p.x, p.z, { n: 5 + Math.floor(b.rng() * 8), r: 0.6 });
      }
    }
    for (const [px, pz] of oxbow.poly.pts) {
      const x = px + b.R(-1.5, 1.5), z = pz + b.R(-1.5, 1.5), g = b.hf.get(x, z) - OX;
      if (g > -0.4 && g < 0.2 && b.chance(0.6)) b.prop('reeds', x, z, { n: 5 + Math.floor(b.rng() * 8), r: 0.6 });
    }
    for (let i = 0; i < 160; i++) {
      const x = b.R(ob.minX, ob.maxX), z = b.R(ob.minZ, ob.maxZ), g = b.hf.get(x, z) - OX;
      if (g < -0.3 && b.chance(0.35)) b.prop('lily', x, z, { n: 3 + Math.floor(b.rng() * 5), r: 0.1 });
    }
    for (const x of [-170, -90, -20, 60, 160]) {
      const p = RV(x, b.R(-2, 2));
      b.ducks.push({ x: p.x, z: p.z, r: 5 + b.rng() * 1.5, speed: 0.35 + b.rng() * 0.3, phase: b.rng() * 6.3 });
    }
    { const p = RV(-118, 50); b.ducks.push({ x: p.x, z: p.z, r: 4, speed: 0.3, phase: 1.2 }); }

    // ------------------------------------------------------------ trees
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      const { s, d } = RIVER.project(x, z);
      const a = Math.abs(d) - HW(s);
      const road = Math.min(high.dist(x, z), willow.dist(x, z), church.dist(x, z), mill.dist(x, z), ferry.dist(x, z));
      if (d < 0 && a > 8 && a < 30 && road > 20) {
        if (b.rng() > 0.45) return null; // the wooded face of the bluff
        return { kind: u < 0.55 ? 'broad' : u < 0.8 ? 'pine' : 'birch', r: b.R(3, 5), tall: 1.1 };
      }
      if (a < 8) {
        if (b.rng() > 0.25) return null; // willows on the water's edge
        return { kind: u < 0.7 ? 'willow' : 'birch', r: b.R(3, 4.6), shoreRise: 0.6 };
      }
      if (road < 40) {
        if (b.rng() > 0.26) return null; // yards stay fairly open
        const kind = u < 0.55 ? 'broad' : u < 0.7 ? 'pine' : u < 0.84 ? 'birch' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      if (d > 0 && road > 40 && Math.abs(d) < 70) {
        if (b.rng() > 0.14) return null; // the open river meadow
        return { kind: u < 0.6 ? 'willow' : 'broad', r: b.R(3.2, 5.5) };
      }
      if (d < 0 && Math.abs(d) < 75) {
        if (b.rng() > 0.18) return null; // Bluff Park
        return { kind: u < 0.65 ? 'broad' : 'pine', r: b.R(3.5, 6) };
      }
      return { kind: u < 0.58 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.3 };
    });
  },
};

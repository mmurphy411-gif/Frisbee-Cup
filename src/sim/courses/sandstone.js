// Sandstone Gulch. A desert neighbourhood split by a deep dry arroyo. Tee off from the
// park on the gulch rim and throw rim to rim, swing round Red Butte, throw over the ford
// where Dip Rd runs through the wash, wander Adobe Way and the saguaro flats, dogleg past
// Snake Rock, climb to the hoodoos, play down the sandy floor of the gulch itself and
// finish at the splash pad.
import { smoothstep } from '../geom.js';
import { Path, catmullRom, segDist } from '../path.js';
import { DESERT } from './themes.js';

// Yuccas and Joshua trees are drawn as short palms, so give them a grey-green tuft.
const THEME = {
  ...DESERT,
  foliage: { ...DESERT.foliage, palm: ['#7f9460', '#8fa06a', '#73895a', '#9aa874'] },
  palmTrunk: '#8a7458',
};

const GULCH = [[-215, -118], [-165, -98], [-125, -86], [-90, -60], [-55, -44], [-20, -20], [15, 0], [50, 8], [85, 30], [118, 56], [150, 70], [185, 82], [215, 104]];
const BUTTE = { x: 72, z: -26, top: 8, foot: 17, h: 9 };
const HOODOO = { x: -158, z: -32, top: 3, foot: 17, h: 4 }; // gentle enough that a wet disc stays up top
const SNAKE = { x: -112, z: 100, top: 2, foot: 10, h: 4 };
const PARK = { x: -52, z: 22 };
const BULB = { x: 168, z: 128, r: 11 };
const SLUMP = { x: 159, z: 89 }; // a slumped stretch of the north bank, below The Dip's basket

const gulch = new Path(catmullRom(GULCH, 10), 12, 'gulch');

const knoll = (k, x, z) => k.h * (1 - smoothstep(k.top, k.foot, Math.hypot(x - k.x, z - k.z)));

function plain(x, z) {
  let h = 10 - 0.008 * z;
  h += 0.9 * Math.sin(0.023 * x + 0.3) * Math.cos(0.019 * z - 0.5) + 0.5 * Math.sin(0.05 * x + 0.04 * z);
  return h + knoll(BUTTE, x, z) + knoll(HOODOO, x, z) + knoll(SNAKE, x, z);
}

// the gulch: a flat sandy floor, steep banks and a raised lip along each rim
const carve = (dg) => (dg < 40 ? -8.5 * (1 - smoothstep(7, 21, dg)) + 1.6 * Math.exp(-(((dg - 24) / 6) ** 2)) : 0);
const base = (x, z) => plain(x, z) + carve(gulch.dist(x, z));

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);
// A point a fraction t of the way from a to c, pushed d metres to the right of travel.
const at = (a, c, t, d = 0) => {
  const dx = c.x - a.x, dz = c.z - a.z, l = Math.hypot(dx, dz);
  return { x: a.x + dx * t - (dz / l) * d, z: a.z + dz * t + (dx / l) * d };
};

export default {
  id: 'sandstone',
  name: 'Sandstone Gulch',
  blurb: 'Rim-top tees over a deep dry arroyo, adobe streets, Red Butte and a splash-pad park.',
  seed: 3954,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    const rimrock = b.road(
      [[-150, -158], [-100, -140], [-40, -118], [20, -98], [80, -78], [130, -54], [170, -24], [215, -10]],
      { width: 7, name: 'Rimrock Rd', lawn: 22, lines: true },
    );
    const adobe = b.road(
      [[-215, -40], [-160, -5], [-105, 32], [-50, 66], [0, 90], [50, 104], [95, 118], [125, 158]],
      { width: 7, name: 'Adobe Way', lawn: 22 },
    );
    // Dip Rd fords the wash: down one bank, across the sand and up the other
    const dip = b.road([[128, -56], [127, 0], [130, 60], [140, 100], [BULB.x - 2, BULB.z - 6], [BULB.x, BULB.z]], { width: 6, name: 'Dip Rd', lawn: 18, shoulder: 5 });
    b.terrain((x, z) => {
      const h0 = plain(x, z), dg = gulch.dist(x, z);
      let h = h0 + carve(dg);
      if (dg < 40) {
        // Dip Rd runs down a cutting in each bank at an easy grade instead of the cliff, and below
        // The Dip's basket the north bank has slumped to the same grade, so a disc can climb out
        const w = Math.max(1 - smoothstep(5, 11, dip.dist(x, z)), 1 - smoothstep(10, 18, Math.hypot(x - SLUMP.x, z - SLUMP.z)));
        if (w > 0) h += (h0 - 8.5 * (1 - Math.min(1, Math.max(0, dg - 7) / 30)) - h) * w;
      }
      const db = Math.hypot(x - BULB.x, z - BULB.z);
      if (db < BULB.r + 6) h += (base(BULB.x, BULB.z) - h) * (1 - smoothstep(BULB.r, BULB.r + 6, db));
      return h;
    });
    // sand along the floor of the wash, broken where Dip Rd crosses it
    const ford = gulch.project(130, 60).s;
    const sandRun = (s0, s1) => {
      const left = [], right = [];
      for (let s = s0; s <= s1; s += 6) {
        const w = 5.5 + 1.5 * Math.sin(s * 0.05);
        const p = gulch.offset(s, w), q = gulch.offset(s, -w);
        left.push([p.x, p.z]); right.push([q.x, q.z]);
      }
      b.sandArea([...left, ...right.reverse()]);
    };
    sandRun(0, ford - 12);
    sandRun(ford + 12, gulch.length);
    b.pavedArea(ring(BULB, BULB.r));
    b.lawnArea(ring(BULB, 5));
    b.lawnArea(ring(PARK, 30));
    b.footpath([[-30, 76], [-30, 54], [-26, 36], [-30, 18], [-40, 4], [-44, -2]], { name: 'Park Path', color: '#e0c9a0' });

    const G = (s, d) => gulch.offset(s, d);
    // ------------------------------------------------------------ holes
    const T = [
      { x: -48, z: -8 }, { x: 28, z: -40 }, { x: 114, z: 20 }, { x: 128, z: 112 }, { x: 12, z: 108 },
      { x: -62, z: 128 }, { x: -172, z: 54 }, G(50, 25), G(165, 26),
    ];
    const B = [
      { x: 21, z: -31 }, { x: 114, z: -18 }, { x: 146, z: 119 }, { x: 22, z: 84 }, { x: -52, z: 128 },
      { x: -166, z: 70 }, { x: HOODOO.x, z: HOODOO.z }, G(152, -1), { x: -42, z: 30 },
    ];
    const V = [null, { x: 70, z: -55 }, null, { x: 76, z: 100 }, null, { x: -118, z: 116 }, null, G(100, 1), null];
    // the way up from the wash to The Dip's basket, kept clear of bank scrub and boulders
    const climb = (x, z) => segDist(x, z, B[2].x, B[2].z, 165, 86) < 12 || Math.hypot(x - B[2].x, z - B[2].z) < 10;
    const holes = [
      {
        name: 'Rim to Rim', par: 3,
        trees: [[at(T[0], B[0], 0.85, 8), 2.6, 'broad'], [at(T[0], B[0], 0.9, -9), 2.2, 'pine'], [at(T[0], B[0], 1.12, 2), 2, 'bush'], [at(T[0], B[0], 0.48, 10), 3, 'broad']],
        rocks: [[at(T[0], B[0], 1.06, -5), 1.3], [at(T[0], B[0], 0.95, 6), 1.1]],
      },
      {
        name: 'Red Butte', par: 4,
        trees: [[at(T[1], V[1], 0.45, -8), 2.6, 'broad'], [at(T[1], V[1], 0.75, 8), 1.8, 'palm'], [at(V[1], B[1], 0.35, -8), 2.4, 'pine'], [at(V[1], B[1], 0.65, 8), 2.6, 'broad'], [at(V[1], B[1], 1.1, 2), 2.2, 'bush']],
        walls: [[at(V[1], B[1], 0.95, -7), 0.6, 4]],
      },
      {
        name: 'The Dip', par: 3,
        trees: [[at(T[2], B[2], 0.25, 9), 2.4, 'pine'], [at(T[2], B[2], 0.7, -10), 2.6, 'broad'], [at(T[2], B[2], 0.9, 8), 1.8, 'palm'], [at(T[2], B[2], 1.12, 0), 2.2, 'bush']],
        cars: [[dip.offset(dip.sAlong(1, 92), 2.1), 0]],
      },
      {
        name: 'Adobe Row', par: 4,
        trees: [[at(T[3], V[3], 0.4, 8), 2.6, 'broad'], [at(T[3], V[3], 0.7, -8), 1.8, 'palm'], [at(V[3], B[3], 0.4, 8), 2.4, 'broad'], [at(V[3], B[3], 0.7, -8), 2.6, 'broad'], [at(V[3], B[3], 1.1, 0), 2, 'bush']],
        walls: [[at(V[3], B[3], 0.15, -9), 0.3, 5], [at(T[3], V[3], 0.55, 9), 0.25, 4]],
      },
      {
        name: 'Saguaro Flats', par: 3,
        trees: [[at(T[4], B[4], 0.3, 7), 1.8, 'palm'], [at(T[4], B[4], 0.55, -7), 2, 'palm'], [at(T[4], B[4], 0.8, 7), 1.6, 'palm'], [at(T[4], B[4], 0.65, 11), 2.2, 'bush'], [at(T[4], B[4], 1.0, -12), 2.6, 'broad']],
      },
      {
        name: 'Rattlesnake', par: 4,
        trees: [[at(T[5], V[5], 0.5, 8), 2.6, 'broad'], [at(T[5], V[5], 0.85, -8), 2.2, 'pine'], [at(V[5], B[5], 0.4, 8), 2.4, 'broad'], [at(V[5], B[5], 0.7, -8), 1.8, 'palm'], [at(V[5], B[5], 1.12, 0), 2.2, 'bush'],
          [{ x: SNAKE.x + 2, z: SNAKE.z - 3 }, 2.4, 'pine'], [{ x: SNAKE.x - 4, z: SNAKE.z + 3 }, 2, 'bush']],
        rocks: [[{ x: SNAKE.x - 1, z: SNAKE.z + 0.5 }, 2.2], [{ x: SNAKE.x + 3, z: SNAKE.z + 4 }, 1.6]],
      },
      {
        name: 'Hoodoo Garden', par: 3,
        trees: [[at(T[6], B[6], 0.2, 8), 2.4, 'broad'], [at(T[6], B[6], 0.82, -8), 1.8, 'palm'], [at(T[6], B[6], 0.85, 8), 2, 'bush']],
        rocks: [[{ x: HOODOO.x - 4, z: HOODOO.z - 6 }, 2], [{ x: HOODOO.x + 6, z: HOODOO.z - 3 }, 1.6], [{ x: HOODOO.x - 6, z: HOODOO.z + 3 }, 1.4]],
      },
      {
        name: 'Down the Wash', par: 4,
        trees: [[G(78, 13), 2, 'bush'], [G(118, -12), 2.2, 'bush'], [G(138, 11), 1.6, 'palm'], [G(60, -14), 2.6, 'broad']],
        rocks: [[G(88, -4.5), 1.2], [G(128, 4.5), 1], [G(160, 3), 1.3]],
      },
      {
        name: 'Splash Pad', par: 3,
        trees: [[at(T[8], B[8], 0.45, 8), 3, 'broad'], [at(T[8], B[8], 1.15, 1), 3.2, 'broad'], [at(T[8], B[8], 0.6, -9), 2, 'bush']],
      },
    ];
    holes.forEach((h, i) => {
      h.tee = T[i]; h.basket = B[i];
      if (V[i]) h.via = [V[i]];
      b.hole(h);
    });

    // ----------------------------------------------------------- the park
    const pad = at(T[8], B[8], 0.78, 7);
    b.pool(pad, 0.5, 4, 3); // the splash pad
    b.prop('shelter', -70, 40, { size: 6, ang: 0.6, r: 4.5 }); // ramada
    b.prop('table', -70, 40, { ang: 0.6, r: 1 });
    b.prop('bench', -64, 26, { ang: 2.2, r: 1 });
    b.prop('bench', -28, 42, { ang: -0.4, r: 1 });
    b.prop('swing', -22, 22, { ang: -0.6, r: 2.6 });
    b.prop('slide', -27, 6, { ang: 0.9, r: 2 });
    b.prop('bin', -56, 44, { r: 0.6 });
    b.prop('bench', BUTTE.x - 2, BUTTE.z - 3, { ang: 0.2, r: 1 }); // lookout on top of the butte

    // ----------------------------------------------------------- houses
    // adobe homes have low parapet roofs that read as flat; the rest wear red tile
    const homes = [];
    const lots = (path, from, to, step, side) => {
      for (let s = from; s < to; s += step) {
        const q = path.offset(s, side * 20);
        if (Math.hypot(q.x - PARK.x, q.z - PARK.z) < 36) continue; // leave the park open
        if (gulch.dist(q.x, q.z) < 36) continue; // and keep off the banks of the gulch
        const o = { fenceChance: 0.3, twoStory: 0.15, hip: 0.6, porchChance: 0.2, driveSide: 1 }; // garages all on one side so neighbours never collide
        if (b.chance(0.6)) Object.assign(o, { roof: 'hip', roofH: b.R(0.3, 0.55), roofColor: b.pick(['#c9a27a', '#b88f68', '#d4b08a']), shutters: null, twoStory: 0.25 });
        const h = b.houseIfClear(path, s, side, o);
        if (h) homes.push(h);
      }
    };
    lots(rimrock, 12, rimrock.length - 10, 25, 1);
    lots(rimrock, 24, rimrock.length - 10, 25, -1);
    lots(adobe, 12, adobe.length - 10, 25, 1);
    lots(adobe, 24, adobe.length - 10, 25, -1);
    lots(dip, 14, dip.length - 20, 24, 1);
    lots(dip, 26, dip.length - 20, 24, -1);
    for (let deg = 200; deg < 360; deg += 50) {
      const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = BULB.r + 9 + hv;
      const x = BULB.x + R * Math.cos(t), z = BULB.z + R * Math.sin(t);
      const rect = { cx: x, cz: z, hu: 6.4, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
      if (!b.rectClear(rect, 5) || dip.dist(x, z) < 14 || gulch.dist(x, z) < 36 || Math.abs(x) > 186 || Math.abs(z) > 136) continue;
      if (b.houses.some((h) => Math.hypot(h.cx - x, h.cz - z) < 14)) continue;
      homes.push(b.placeHouse({ x, z, ang: t + Math.PI / 2, hu: b.R(5.6, 6.6), hv, front: 1, setback: 9, fenceChance: 0, hip: 0.6 }));
    }
    for (const h of homes) {
      if (!b.chance(0.4)) continue;
      const wx = -h.sin * -h.front, wz = h.cos * -h.front;
      const p = { x: h.cx + wx * (h.hv + 6), z: h.cz + wz * (h.hv + 6) };
      if (b.rectClear({ cx: p.x, cz: p.z, hu: 4.6, hv: 2.8, cos: h.cos, sin: h.sin }, 3) && !b.blocked(p.x, p.z, 3) && gulch.dist(p.x, p.z) > 26) b.pool(p, h.ang, 4.6, 2.8);
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind, kind === 'pine' ? { tall: 0.55 } : kind === 'broad' ? { tall: 0.75 } : kind === 'palm' ? { tall: 0.45 } : {});
      for (const [p, ang] of h.cars || []) b.car(p, Math.atan2(p.tz, p.tx) + ang);
      for (const [p, r] of h.rocks || []) b.prop('boulder', p.x, p.z, { r });
      // low adobe garden walls
      for (const [p, ang, hu] of h.walls || []) b.prop('wall', p.x, p.z, { ang, hu, h: 1.1, r: hu, color: '#c98f6a', cap: '#d9b48a' });
    }
    // boulders: round the butte and the rock outcrops, and tumbled down the banks of the gulch
    for (let i = 0; i < 320; i++) {
      const x = b.R(-196, 196), z = b.R(-146, 146);
      const dg = gulch.dist(x, z);
      const bank = dg > 8 && dg < 22;
      const butte = Math.abs(Math.hypot(x - BUTTE.x, z - BUTTE.z) - BUTTE.foot + 2) < 4;
      const rocky = Math.hypot(x - HOODOO.x, z - HOODOO.z) < 14 || Math.hypot(x - SNAKE.x, z - SNAKE.z) < 11;
      if (!((bank && b.chance(0.35)) || butte || rocky)) continue;
      if (b.inCorridor(x, z, 5) || b.blocked(x, z, 2) || (bank && climb(x, z))) continue;
      if (Math.min(rimrock.dist(x, z), adobe.dist(x, z), dip.dist(x, z)) < 10) continue;
      b.prop('boulder', x, z, { r: b.R(0.8, rocky ? 2.2 : 1.8) });
    }
    b.lampsAlong(rimrock, 66, 4.6, 30);
    b.lampsAlong(adobe, 64, -4.6, 35);
    b.lampsAlong(dip, 60, 4, 30);
    for (const [road, every] of [[rimrock, 90], [adobe, 100]]) {
      for (let s = 50; s < road.length - 30; s += every) {
        const p = road.offset(s, -4.4);
        if (!b.inCorridor(p.x, p.z, 3) && !b.blocked(p.x, p.z, 1)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
      }
    }

    // ------------------------------------------------------------ trees
    const roads = [rimrock, adobe, dip];
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      const dg = gulch.dist(x, z);
      if (dg < 9) {
        if (b.rng() > 0.25) return null; // a few mesquites on the sandy floor
        return { kind: u < 0.6 ? 'bush' : 'broad', r: b.R(1.4, 2.6), tall: 0.7 };
      }
      if (dg < 24) {
        if (b.rng() > 0.3) return null; // scrub clinging to the banks
        const t = { kind: u < 0.6 ? 'bush' : u < 0.85 ? 'pine' : 'palm', r: u < 0.85 ? b.R(1.2, 2.2) : b.R(1.4, 2), tall: u < 0.85 ? 0.5 : 0.45 };
        return climb(x, z) ? null : t;
      }
      if (Math.hypot(x - PARK.x, z - PARK.z) < 30) {
        if (b.rng() > 0.15) return null; // a few shade trees in the park
        return { kind: 'broad', r: b.R(2.8, 3.8), tall: 0.8 };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 26) {
        if (b.rng() > 0.22) return null;
        const kind = u < 0.35 ? 'broad' : u < 0.55 ? 'palm' : u < 0.7 ? 'pine' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(1.6, 2.6) : kind === 'palm' ? b.R(1.6, 2.2) : b.R(2.4, 3.6), tall: kind === 'palm' ? 0.5 : kind === 'pine' ? 0.6 : 0.8 };
      }
      if (b.rng() > 0.2) return null; // open desert
      const kind = u < 0.45 ? 'bush' : u < 0.65 ? 'palm' : u < 0.85 ? 'pine' : 'broad';
      return { kind, r: kind === 'bush' ? b.R(1.2, 2.2) : kind === 'palm' ? b.R(1.4, 2.1) : b.R(1.8, 3.2), tall: kind === 'palm' ? 0.45 : kind === 'pine' ? 0.5 : 0.7 };
    });
  },
};

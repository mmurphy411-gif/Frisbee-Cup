// Course 7: Mesa Vista. A desert subdivision under a mesa. Throw off the rim, follow the
// dry wash, tee off from the top of Lone Butte, cross into Coyote Court, play over the
// oasis pond and climb back up to the mesa to finish.
import { smoothstep } from '../geom.js';
import { Path, catmullRom } from '../path.js';
import { DESERT } from './themes.js';

const BUTTE = { x: -8, z: -32, top: 11, foot: 19, h: 10 };
const OASIS = { x: -72, z: 112 };
const BULB = { x: 130, z: 46, r: 11 };
const WASH = [[-215, 10], [-150, 24], [-90, 6], [-30, 24], [30, 12], [90, 30], [150, 16], [215, 26]];

const rim = (x) => -66 + 8 * Math.sin(0.028 * x + 1);

function base(x, z) {
  // the cliff eases into a long ramp at the west end, where the last hole climbs it
  const ramp = 16 * Math.exp(-(((x + 180) / 34) ** 2));
  let h = 6 + 18 * smoothstep(rim(x) + 12 + ramp, rim(x) - 12 - ramp, z);
  h += 0.9 * Math.sin(0.025 * x + 0.2) * Math.cos(0.021 * z + 0.4) + 0.5 * Math.sin(0.06 * x + 0.05 * z);
  const db = Math.hypot(x - BUTTE.x, z - BUTTE.z);
  h += BUTTE.h * (1 - smoothstep(BUTTE.top, BUTTE.foot, db));
  return h;
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'mesa',
  name: 'Mesa Vista',
  blurb: 'Desert drops off the mesa, a sandy wash, a butte-top tee and an oasis pond.',
  seed: 8086,
  world: { halfW: 200, halfH: 150 },
  theme: DESERT,

  create(b) {
    // ------------------------------------------------------------- plan
    const vista = b.road(
      [[-215, -112], [-120, -118], [-20, -110], [80, -118], [215, -112]],
      { width: 7, name: 'Mesa Vista Dr', lawn: 22 },
    );
    const arroyo = b.road(
      [[-215, 72], [-100, 66], [0, 74], [100, 64], [215, 70]],
      { width: 7, name: 'Arroyo Rd', lawn: 24, lines: true },
    );
    const coyote = b.road([[130, 66], [130, 56], [BULB.x, BULB.z]], { width: 6, name: 'Coyote Ct', lawn: 18 });
    const wash = new Path(catmullRom(WASH, 10), 9, 'wash');
    b.terrain((x, z) => {
      let h = base(x, z);
      const db = Math.hypot(x - BULB.x, z - BULB.z);
      if (db < BULB.r + 6) h += (base(BULB.x, BULB.z) - h) * (1 - smoothstep(BULB.r, BULB.r + 6, db));
      const dw = wash.dist(x, z);
      if (dw < 12) h -= 2.2 * (1 - smoothstep(3.5, 11, dw));
      const ox = x - OASIS.x, oz = z - OASIS.z;
      return h - 4.2 * Math.exp(-(ox * ox + oz * oz) / 420);
    });
    const oasisLevel = b.hf.get(OASIS.x, OASIS.z) + 2.1;
    b.pond(OASIS.x, OASIS.z, 24, oasisLevel, 'oasis');
    b.clearZone(OASIS.x, OASIS.z, 20);
    // the wash bed: a ribbon of sand along its line
    const left = [], right = [];
    for (let s = 0; s <= wash.length; s += 6) {
      const w = 5.5 + 1.5 * Math.sin(s * 0.05);
      const p = wash.offset(s, w), q = wash.offset(s, -w);
      left.push([p.x, p.z]); right.push([q.x, q.z]);
    }
    b.sandArea([...left, ...right.reverse()]);
    b.pavedArea(ring(BULB, BULB.r));
    b.lawnArea(ring(BULB, 5));
    b.lawnArea(ring(OASIS, 34));
    b.footpath([[-100, -18], [-112, -40], [-96, -56], [-112, -70], [-100, -88], [-110, -106]], { name: 'Rim Trail', color: '#c9a878' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Rim Shot', par: 3, tee: { x: -150, z: -88 }, basket: { x: -120, z: -30 },
        trees: [[{ x: -126, z: -42 }, 2.6, 'pine'], [{ x: -140, z: -36 }, 2, 'bush']],
      },
      {
        name: 'Dry Wash', par: 4, tee: { x: -112, z: -24 }, basket: { x: -20, z: 22 }, via: [{ x: -80, z: 10 }],
        trees: [[{ x: -92, z: -4 }, 3, 'broad'], [{ x: -56, z: 30 }, 2.2, 'bush'], [{ x: -40, z: 8 }, 3.2, 'broad']],
      },
      {
        name: 'Lone Butte', par: 3, tee: { x: -6, z: -34 }, basket: { x: 60, z: -8 },
        trees: [[{ x: 40, z: -6 }, 3, 'broad'], [{ x: 54, z: -22 }, 2.4, 'pine']],
      },
      {
        name: 'Mesquite', par: 4, tee: { x: 66, z: -4 }, basket: { x: 176, z: 6 }, via: [{ x: 120, z: -10 }],
        trees: [[{ x: 94, z: -16 }, 3.2, 'broad'], [{ x: 112, z: 0 }, 2.8, 'broad'], [{ x: 146, z: -12 }, 3, 'broad'], [{ x: 160, z: 2 }, 2.2, 'bush']],
      },
      {
        name: 'Coyote Court', par: 3, tee: { x: 184, z: -2 }, basket: { x: 130, z: 41.5 },
        trees: [[{ x: 150, z: 32 }, 2.8, 'broad']],
      },
      {
        name: 'Arroyo', par: 4, tee: { x: 60, z: 86 }, basket: { x: -36, z: 92 }, via: [{ x: 0, z: 100 }],
        trees: [[{ x: 34, z: 98 }, 3, 'broad'], [{ x: 14, z: 88 }, 2.2, 'bush'], [{ x: -18, z: 104 }, 3.2, 'broad']],
      },
      {
        name: 'Oasis', par: 3, tee: { x: -38, z: 130 }, basket: { x: -112, z: 96 },
        trees: [[{ x: -104, z: 106 }, 4, 'willow'], [{ x: -50, z: 120 }, 3.6, 'willow']],
      },
      {
        name: 'Ramada', par: 4, tee: { x: -124, z: 86 }, basket: { x: -168, z: -6 }, via: [{ x: -176, z: 56 }],
        trees: [[{ x: -150, z: 80 }, 3.4, 'broad'], [{ x: -164, z: 40 }, 2.4, 'bush'], [{ x: -180, z: 22 }, 3, 'broad']],
      },
      {
        name: 'Sunset Climb', par: 4, tee: { x: -178, z: -22 }, basket: { x: -180, z: -98 },
        trees: [[{ x: -184, z: -48 }, 2.6, 'pine'], [{ x: -172, z: -70 }, 2.4, 'pine']],
        rocks: [[{ x: -186, z: -62 }, 1.6], [{ x: -170, z: -56 }, 1.3]],
      },
    ];
    for (const h of holes) b.hole(h);

    // ------------------------------------------------------ butte lookout
    b.prop('bench', BUTTE.x - 6, BUTTE.z - 4, { ang: 0.3, r: 1 });
    b.prop('shelter', -130, 104, { size: 6, ang: 0.2, r: 4.5 }); // the ramada
    b.prop('table', -130, 104, { ang: 0.2, r: 1 });
    b.span({ x: -56, z: 104 }, { x: -64, z: 110 }, 2.2, oasisLevel + 0.5, { kind: 'dock' });

    // ----------------------------------------------------------- houses
    const homes = [];
    const lots = (path, from, to, step, side) => {
      for (let s = from; s < to; s += step) {
        const h = b.houseIfClear(path, s, side, { fenceChance: 0.35, twoStory: 0.2, hip: 0.6, porchChance: 0.15 });
        if (h) homes.push(h);
      }
    };
    lots(vista, 12, vista.length - 10, 25, 1);
    lots(vista, 24, vista.length - 10, 25, -1);
    lots(arroyo, 12, arroyo.length - 10, 25, 1);
    lots(arroyo, 24, arroyo.length - 10, 25, -1);
    for (let deg = 0; deg < 360; deg += 45) {
      const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = BULB.r + 9 + hv;
      const x = BULB.x + R * Math.cos(t), z = BULB.z + R * Math.sin(t);
      const rect = { cx: x, cz: z, hu: 6.4, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
      if (!b.rectClear(rect, 5) || coyote.dist(x, z) < 14 || arroyo.dist(x, z) < 16 || wash.dist(x, z) < hv + 14) continue;
      if (b.houses.some((h) => Math.hypot(h.cx - x, h.cz - z) < 14)) continue;
      homes.push(b.placeHouse({ x, z, ang: t + Math.PI / 2, hu: b.R(5.6, 6.8), hv, front: 1, setback: 9, fenceChance: 0, hip: 0.6 }));
    }
    for (const h of homes) {
      if (!b.chance(0.45)) continue;
      const wx = -h.sin * -h.front, wz = h.cos * -h.front;
      const p = { x: h.cx + wx * (h.hv + 6), z: h.cz + wz * (h.hv + 6) };
      if (b.rectClear({ cx: p.x, cz: p.z, hu: 4.6, hv: 2.8, cos: h.cos, sin: h.sin }, 3) && !b.blocked(p.x, p.z, 3) && wash.dist(p.x, p.z) > 14) b.pool(p, h.ang, 4.6, 2.8);
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind, kind === 'pine' ? { tall: 0.55 } : kind === 'broad' ? { tall: 0.75 } : {});
      for (const [p, r] of h.rocks || []) b.prop('boulder', p.x, p.z, { r });
    }
    // boulders along the foot of the cliff, round the butte and in the wash
    for (let i = 0; i < 260; i++) {
      const x = b.R(-196, 196), z = b.R(-140, 140);
      const cliff = Math.abs(z - rim(x)) < 14 && x > -140;
      const butte = Math.abs(Math.hypot(x - BUTTE.x, z - BUTTE.z) - BUTTE.foot) < 4;
      const inWash = wash.dist(x, z) < 6;
      if (!(cliff || butte || (inWash && b.chance(0.4)))) continue;
      if (b.inCorridor(x, z, 5) || b.blocked(x, z, 2) && !inWash) continue;
      if (vista.dist(x, z) < 12 || arroyo.dist(x, z) < 12) continue;
      b.prop('boulder', x, z, { r: b.R(0.8, cliff ? 2.4 : 1.6) });
    }
    b.lampsAlong(arroyo, 64, 4.6, 30);
    b.lampsAlong(vista, 70, -4.6, 40);
    b.ducks.push({ x: OASIS.x, z: OASIS.z, r: 7, speed: 0.35, phase: 0.2 });
    for (const [px, pz] of ring(OASIS, 17, 36)) {
      const g = b.hf.get(px, pz) - oasisLevel;
      if (g > -0.35 && g < 0.2 && b.chance(0.45)) b.prop('reeds', px + b.R(-1, 1), pz + b.R(-1, 1), { n: 4 + Math.floor(b.rng() * 6), r: 0.6 });
    }

    // ------------------------------------------------------------ trees
    const roads = [vista, arroyo, coyote];
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      if (Math.hypot(x - OASIS.x, z - OASIS.z) < 40) {
        if (b.rng() > 0.4) return null; // cottonwoods round the oasis
        return { kind: u < 0.6 ? 'willow' : 'broad', r: b.R(3.5, 5.5) };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 26) {
        if (b.rng() > 0.25) return null;
        const kind = u < 0.4 ? 'broad' : u < 0.6 ? 'pine' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(1.6, 2.6) : b.R(2.4, 3.8), tall: kind === 'pine' ? 0.6 : 0.8 };
      }
      if (b.rng() > 0.2) return null; // open desert
      if (wash.dist(x, z) < 16 && u < 0.5) return { kind: 'broad', r: b.R(2.6, 4), tall: 0.75 };
      const kind = u < 0.55 ? 'bush' : u < 0.82 ? 'pine' : 'broad';
      return { kind, r: kind === 'bush' ? b.R(1.2, 2.2) : b.R(1.8, 3.2), tall: kind === 'pine' ? 0.5 : 0.7 };
    });
  },
};

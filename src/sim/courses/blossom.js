// Course 6: Blossom Hill. Springtime round the elementary school: tee off by the front
// steps, thread the cherry orchard, climb Blossom Hill, throw down past the gym to the
// pitcher's mound, cross Schoolhouse Rd to the lily pond and finish back at the school.
import { smoothstep } from '../geom.js';
import { SPRING } from './themes.js';

const HILL = { x: 45, z: -60 };
const POND = { x: -100, z: 92 };
const FIELD = { x: -110, z: -32 }; // centre of the infield
const GREENS = ['#6fb352', '#7fbf5a', '#5ea84a', '#68ad4b'];
const BLOSSOM = ['#f2a7c3', '#f7c6d9', '#ffffff', '#e889ad'];

function base(x, z) {
  const hx = x - HILL.x, hz = z - HILL.z;
  return (
    6 + 13 * Math.exp(-(hx * hx + hz * hz) / 2048) +
    0.8 * Math.sin(0.021 * x + 0.3) * Math.cos(0.018 * z - 0.5) + 0.4 * Math.sin(0.047 * x - 0.033 * z)
  );
}

function land(x, z) {
  let h = base(x, z);
  // level pads for the school and the ballfield
  const school = Math.max(Math.abs(x + 40) - 46, Math.abs(z + 14) - 40);
  if (school < 12) h += (6.6 - h) * (1 - smoothstep(0, 12, school));
  const df = Math.hypot(x - FIELD.x, z - FIELD.z);
  if (df < 52) h += (base(FIELD.x, FIELD.z) - h) * (1 - smoothstep(36, 52, df));
  const px = x - POND.x, pz = z - POND.z;
  return h - 4 * Math.exp(-(px * px + pz * pz) / 650);
}

export default {
  id: 'blossom',
  name: 'Blossom Hill',
  blurb: 'Spring blossoms: a cherry orchard, a ballfield and a basket on the pitcher’s mound.',
  seed: 2604,
  world: { halfW: 200, halfH: 150 },
  theme: SPRING,

  create(b) {
    // ------------------------------------------------------------- plan
    const school = b.road(
      [[-215, 46], [-120, 38], [-20, 44], [80, 36], [215, 42]],
      { width: 7, name: 'Schoolhouse Rd', lawn: 34, lines: true },
    );
    const hilltop = b.road(
      [[150, -90], [100, -110], [40, -108], [-30, -100], [-90, -112], [-215, -106]],
      { width: 6.5, name: 'Hilltop Dr', lawn: 30 },
    );
    const cherry = b.road(
      [[146, -165], [150, -90], [152, 42], [150, 165]],
      { width: 6.5, name: 'Cherry Ln', lawn: 30 },
    );
    const pondLevel = land(POND.x, POND.z) + 2;
    b.terrain(land);
    b.pond(POND.x, POND.z, 28, pondLevel, 'lily pond');
    b.clearZone(POND.x, POND.z, 24);

    // campus: car park and its entrance, the infield skin and the playground sand
    b.pavedArea([[-76, 12], [-4, 12], [-4, 30], [-76, 30]]);
    b.pavedArea([[-46, 29], [-34, 29], [-34, 41], [-46, 41]]);
    b.lawnArea([[-100, -60], [20, -60], [20, 36], [-100, 36]]);
    const diamond = [0, 1, 2, 3].map((k) => {
      const t = Math.PI / 2 + (k * Math.PI) / 2;
      return [FIELD.x + 19 * Math.cos(t), FIELD.z + 19 * Math.sin(t)];
    });
    b.sandArea(diamond);
    b.lawnArea([[FIELD.x - 45, FIELD.z - 45], [FIELD.x + 45, FIELD.z - 45], [FIELD.x + 45, FIELD.z + 34], [FIELD.x - 45, FIELD.z + 34]]);
    b.sandArea([[6, -24], [26, -24], [28, -6], [6, -4]]);
    b.footpath([[-14, 6], [10, 0], [40, -22], [46, -48], [42, -62]], { name: 'Hill path' });
    b.footpath([[-150, 60], [-132, 72], [-126, 100], [-112, 118], [-84, 122], [-70, 104], [-70, 82], [-84, 66]], { name: 'Pond loop' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'First Bell', par: 3, tee: { x: 6, z: 24 }, basket: { x: 64, z: -4 },
        trees: [[{ x: 36, z: 4 }, 3.8, 'broad'], [{ x: 54, z: 10 }, 3.4, 'birch']],
      },
      {
        name: 'Orchard Row', par: 4, tee: { x: 97, z: 0 }, basket: { x: 97, z: -98 },
        trees: [],
      },
      {
        name: 'Blossom Hill', par: 3, tee: { x: 86, z: -97 }, basket: { x: 42, z: -58 },
        trees: [[{ x: 56, z: -76 }, 3.6, 'broad'], [{ x: 36, z: -50 }, 3, 'birch']],
      },
      {
        name: 'Recess', par: 4, tee: { x: 32, z: -66 }, basket: { x: -70, z: -66 },
        trees: [[{ x: 6, z: -60 }, 4, 'broad'], [{ x: -20, z: -72 }, 4.2, 'broad'], [{ x: -50, z: -58 }, 3.6, 'broad']],
      },
      {
        name: 'Pitcher’s Mound', par: 3, tee: { x: -66, z: -84 }, basket: { x: FIELD.x, z: FIELD.z },
        trees: [[{ x: -86, z: -70 }, 3.8, 'broad']],
      },
      {
        name: 'Crosswalk', par: 3, tee: { x: -128, z: 4 }, basket: { x: -158, z: 68 },
        trees: [[{ x: -148, z: 22 }, 4, 'broad'], [{ x: -134, z: 58 }, 3.6, 'birch']],
      },
      {
        name: 'Lily Pond', par: 4, tee: { x: -164, z: 82 }, basket: { x: -60, z: 116 }, via: [{ x: -130, z: 122 }],
        trees: [[{ x: -148, z: 112 }, 4, 'willow'], [{ x: -112, z: 128 }, 3.8, 'broad'], [{ x: -78, z: 124 }, 3.4, 'willow']],
      },
      {
        name: 'Crossing Guard', par: 4, tee: { x: -48, z: 106 }, basket: { x: 40, z: 60 }, via: [{ x: 8, z: 94 }],
        trees: [[{ x: -20, z: 96 }, 4, 'broad'], [{ x: 24, z: 82 }, 3.8, 'broad']],
      },
      {
        name: 'Last Bell', par: 3, tee: { x: 34, z: 54 }, basket: { x: -30, z: 5 },
        trees: [[{ x: 6, z: 40 }, 3.4, 'broad']],
      },
    ];
    for (const h of holes) b.hole(h);

    // --------------------------------------------------------- buildings
    b.placeHouse({
      kind: 'school', x: -40, z: -14, ang: 0, hu: 26, hv: 10, front: 1, stories: 2, wallH: 6.4, roofH: 2.6, roof: 'hip',
      wall: '#b5523b', roofColor: '#4f5560', trim: '#f4f1ea', door: '#2f5d8a', shutters: null, chimney: false, doorU: 0,
    });
    b.placeHouse({
      kind: 'school', x: -24, z: -38, ang: 0, hu: 11, hv: 7.5, front: 1, stories: 1, wallH: 6, roofH: 2, roof: 'gable',
      wall: '#c7664a', roofColor: '#4f5560', trim: '#f4f1ea', door: '#2f5d8a', shutters: null, chimney: false, doorU: 6,
    });
    b.span({ x: -98, z: 118 }, { x: -98, z: 104 }, 2.2, pondLevel + 0.5, { kind: 'dock' });

    const lots = (path, xs, side, axis = 0) => {
      for (const v of xs) b.houseIfClear(path, path.sAlong(axis, v), side, { fenceChance: 0.25 });
    };
    const across = [-190, -165, -140, -115, -90, -65, -40, -15, 10, 35, 60, 85, 110, 135, 185];
    lots(school, across, 1);
    lots(school, [-190, -165, 85, 110, 135, 185], -1);
    lots(hilltop, across, 1);
    lots(hilltop, [-190, -165, -140], -1);
    lots(cherry, [-130, -110, -60, -30, 0, 70, 95, 120], -1, 1);
    lots(cherry, [-130, 70, 95, 120], 1, 1);

    // ----------------------------------------------------------- orchard
    for (const x of [76, 90, 104, 118]) {
      for (let z = -86; z <= -14; z += 9) {
        if (Math.hypot(x - 97, z) < 6) continue;
        b.tree({ x: x + b.R(-0.6, 0.6), z: z + b.R(-0.6, 0.6) }, b.R(3, 3.6), 'broad', { color: b.pick(BLOSSOM), tall: 0.85 });
      }
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
    for (const [x, z, ang] of [[-70, 16, Math.PI / 2], [-62, 16, Math.PI / 2], [-46, 16, Math.PI / 2], [-30, 16, Math.PI / 2], [-14, 16, Math.PI / 2],
      [-66, 26, -Math.PI / 2], [-50, 26, -Math.PI / 2], [-26, 26, -Math.PI / 2], [-10, 26, -Math.PI / 2]]) {
      if (!b.inCorridor(x, z, 3)) b.car({ x, z }, ang);
    }
    // backstop behind home plate, and the dugout benches
    const home = { x: FIELD.x, z: FIELD.z + 19 };
    const arc = [-0.9, -0.3, 0.3, 0.9].map((t) => ({ x: home.x + 7 * Math.sin(t), z: home.z + 7 * Math.cos(t) }));
    for (let k = 1; k < arc.length; k++) b.fence(arc[k - 1], arc[k], 'privacy');
    b.prop('bench', FIELD.x + 22, FIELD.z + 14, { ang: 0.8, r: 1 });
    b.prop('bench', FIELD.x - 22, FIELD.z + 14, { ang: -0.8, r: 1 });
    b.prop('swing', 12, -18, { ang: 0, r: 2.6 });
    b.prop('slide', 22, -10, { ang: 1.2, r: 2 });
    b.prop('gazebo', 52, -50, { size: 4.2, r: 3.5 });
    b.prop('bench', 40, -70, { ang: 2.6, r: 1 });
    b.prop('hoop', -6, 4, { ang: Math.PI, r: 0.6 });
    for (const [x, z, ang] of [[-130, 108, 0.4], [-72, 114, -0.5], [-74, 74, 3.3]]) b.prop('bench', x, z, { ang, r: 1 });
    b.prop('table', -142, 92, { ang: 0.2, r: 1.2 });
    b.prop('bin', -16, 8, { r: 0.5 });
    b.lampsAlong(school, 60, 4.6, 30);
    b.lampsAlong(cherry, 64, -4.4, 30);
    b.ducks.push({ x: POND.x + 2, z: POND.z - 2, r: 6, speed: 0.4, phase: 0.5 });
    for (let i = 0; i < 400; i++) {
      const x = POND.x + b.R(-22, 22), z = POND.z + b.R(-22, 22);
      const g = b.hf.get(x, z) - pondLevel;
      if (g < -0.25 && g > -1.4 && Math.abs(x + 98) > 2 && b.chance(0.2)) b.prop('lily', x, z, { n: 3 + Math.floor(b.rng() * 5), r: 0.1 });
    }

    // ------------------------------------------------------------ trees
    b.scatter(8000, (x, z) => {
      const u = b.rng();
      const campus = x > -158 && x < 70 && z > -98 && z < 34;
      if (campus) {
        if (b.rng() > 0.08) return null;
        return { kind: 'broad', r: b.R(3, 4.5), color: b.pick(u < 0.6 ? BLOSSOM : GREENS) };
      }
      if (z < -114 || z > 124) {
        const kind = u < 0.62 ? 'broad' : u < 0.82 ? 'pine' : 'birch';
        return { kind, r: b.R(3.6, 6), tall: 1.2, color: kind === 'broad' ? b.pick(u < 0.15 ? BLOSSOM : GREENS) : undefined };
      }
      if (b.rng() > 0.3) return null;
      const kind = u < 0.55 ? 'broad' : u < 0.7 ? 'birch' : u < 0.82 ? 'pine' : 'bush';
      return { kind, r: kind === 'bush' ? b.R(2.2, 3.2) : b.R(2.8, 5), color: kind === 'broad' ? b.pick(u < 0.3 ? BLOSSOM : GREENS) : undefined };
    });
  },
};

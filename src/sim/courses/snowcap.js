// Snowcap Village. An alpine village in deep snow: tee off by the warming hut, carry the
// frozen pond on the village green, parade past the snowmen to the foot of the sledding
// hill, climb it and ride the toboggan run back down, then play home along the lamp-lit
// lanes between the chalets, behind the chimneys and back across Lantern Lane to cocoa.
import { smoothstep } from '../geom.js';
import { WINTER } from './themes.js';

const POND = { x: -40, z: 8 };
const SLED = { x: 104, z: -56 };
const RINK = { x: -36, z: -46 };
const ICE = '#cfe4ee';

// The same snowy palette with timber and painted chalets.
const SNOWCAP = {
  ...WINTER,
  walls: ['#8a5a3a', '#6e4a32', '#a8714a', '#7a4a2e', '#f2e8d5', '#b5452f', '#2f5d8a', '#3d6a5a', '#e8d4b8'],
  shutters: ['#2f6b3a', '#b5452f', '#2b4a5e', '#f2e8d5', '#5a3e2b'],
};

function base(x, z) {
  const sx = x - SLED.x, sz = z - SLED.z;
  return (
    7 + 20 * Math.exp(-(sx * sx + sz * sz) / 3200) + 3 * smoothstep(70, 150, z) +
    0.9 * Math.sin(0.019 * x + 0.4) * Math.cos(0.023 * z - 0.3) + 0.4 * Math.sin(0.05 * x - 0.04 * z)
  );
}

const GREEN_H = base(POND.x, POND.z);
const POND_LEVEL = GREEN_H - 2.2;

function land(x, z) {
  let h = base(x, z);
  // the village green is level, with the pond scooped out of the middle of it
  const dg = Math.hypot(x - POND.x, z - POND.z);
  if (dg < 60) h += (GREEN_H - h) * (1 - smoothstep(34, 60, dg));
  return h - 4.5 * Math.exp(-(dg * dg) / 700);
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);
const oval = (c, a, r, n = 28) => Array.from({ length: n }, (_, i) => [c.x + a * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'snowcap',
  name: 'Snowcap Village',
  blurb: 'Chalets and lamp-lit lanes, a frozen pond on the green and a sledding hill.',
  seed: 8826,
  world: { halfW: 200, halfH: 150 },
  theme: SNOWCAP,

  create(b) {
    // ------------------------------------------------------------- plan
    // s runs east; d > 0 is the far (north) side, away from the green
    const lantern = b.road(
      [[-215, 88], [-120, 82], [-30, 90], [60, 84], [150, 92], [215, 88]],
      { width: 7, name: 'Lantern Ln', lawn: 30, lines: true },
    );
    const chalet = b.road([[-132, -165], [-128, -90], [-134, -10], [-127, 84]], { width: 6.5, name: 'Chalet Row', lawn: 28 });
    const sleigh = b.road(
      [[-215, -100], [-129, -98], [-50, -106], [20, -100], [56, -118], [80, -165]],
      { width: 6.5, name: 'Sleigh Bell Rd', lawn: 26 },
    );
    const summit = b.road([[154, 91], [166, 20], [176, -50], [168, -120], [172, -165]], { width: 6, name: 'Summit Rd', lawn: 24 });
    b.terrain(land);
    b.pond(POND.x, POND.z, 28, POND_LEVEL, 'frozen pond');
    b.clearZone(POND.x, POND.z, 25);
    b.lawnArea(ring(POND, 56, 32)); // the village green
    b.lawnArea(ring(SLED, 46, 32)); // the open sledding slope
    b.pavedArea(oval(RINK, 14, 7), { color: ICE }); // the skating rink
    const loop = ring(POND, 31, 18);
    const pondPath = b.footpath([...loop, loop[0]], { name: 'Pond loop' });
    b.footpath([[-127, 60], [-110, 52], [-82, 38], [-70, 30]], { name: 'Green path' });
    const Lx = (x, d) => lantern.offset(lantern.sAlong(0, x), d);

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'First Tracks', par: 3, tee: { x: -104, z: 56 }, basket: { x: -86, z: -8 },
        trees: [[{ x: -112, z: 30 }, 3.6, 'pine'], [{ x: -88, z: 34 }, 3.4, 'broad'], [{ x: -98, z: 4 }, 3.2, 'pine'], [{ x: -74, z: 4 }, 3, 'birch']],
      },
      {
        name: 'Pond Hockey', par: 3, drop: [-54, -16], tee: { x: -78, z: -18 }, basket: { x: -4, z: 34 },
        trees: [[{ x: -64, z: -32 }, 3.4, 'pine'], [{ x: 10, z: 42 }, 3.6, 'broad'], [{ x: -14, z: 46 }, 3.2, 'pine'], [{ x: -22, z: 38 }, 3, 'willow']],
      },
      {
        name: 'Snowman Parade', par: 3, tee: { x: 6, z: 26 }, basket: { x: 46, z: -26 },
        trees: [[{ x: 19, z: -5 }, 3.2, 'broad'], [{ x: 38, z: -6 }, 3, 'pine'], [{ x: 56, z: -32 }, 3, 'pine']],
      },
      {
        name: 'Sledders’ Climb', par: 4, tee: { x: 50, z: -36 }, basket: { x: 102, z: -60 },
        trees: [[{ x: 70, z: -56 }, 3.2, 'pine'], [{ x: 84, z: -38 }, 3, 'pine']],
      },
      {
        name: 'Toboggan Chute', par: 4, tee: { x: 112, z: -54 }, basket: { x: 122, z: 52 }, via: [{ x: 140, z: -6 }],
        trees: [[{ x: 124, z: -8 }, 4.2, 'pine'], [{ x: 128, z: 10 }, 3.8, 'pine'], [{ x: 116, z: 20 }, 4, 'pine'], [{ x: 150, z: -26 }, 3.4, 'broad'], [{ x: 130, z: 62 }, 3, 'pine']],
      },
      {
        name: 'Lantern Lane', par: 4, tee: Lx(116, -12), basket: Lx(8, 9), via: [Lx(62, 0)],
        trees: [[Lx(98, -20), 4, 'broad'], [Lx(84, 7), 4.2, 'broad'], [Lx(44, -10), 4, 'broad'], [Lx(28, 14), 3.6, 'pine']],
        cars: [[Lx(70, 2.3), 0], [Lx(36, -2.3), Math.PI]],
      },
      {
        name: 'Chimney Smoke', par: 3, tee: { x: 2, z: 104 }, basket: { x: -58, z: 122 },
        trees: [[{ x: -24, z: 104 }, 3.6, 'pine'], [{ x: -28, z: 128 }, 3.4, 'broad'], [{ x: -66, z: 112 }, 3, 'pine']],
        hedges: [[{ x: -48, z: 131 }, { x: -36, z: 129 }]],
      },
      {
        name: 'Woodsmoke', par: 4, tee: { x: -66, z: 128 }, basket: { x: -166, z: 104 }, via: [{ x: -120, z: 124 }],
        tub: { x: -80, z: 116 },
        trees: [[{ x: -92, z: 118 }, 4, 'pine'], [{ x: -110, z: 134 }, 4, 'pine'], [{ x: -138, z: 124 }, 3.6, 'broad'], [{ x: -150, z: 100 }, 3.4, 'pine']],
      },
      {
        name: 'Home for Cocoa', par: 3, tee: { x: -160, z: 94 }, basket: { x: -112, z: 64 },
        trees: [[{ x: -146, z: 76 }, 3.4, 'broad'], [{ x: -120, z: 54 }, 3, 'pine']],
        cars: [[Lx(-140, 2.3), 0]],
      },
    ];
    for (const h of holes) b.hole(h);

    // --------------------------------------------------------- buildings
    // the village chapel faces Sleigh Bell Rd across the green from the pond
    b.placeHouse({
      kind: 'chapel', x: -22, z: -78, ang: 0, hu: 5.5, hv: 9, front: -1, stories: 1, wallH: 5.2, roofH: 4, roof: 'gable',
      wall: '#f2e8d5', roofColor: '#eef3f6', trim: '#ffffff', door: '#7a2f2f', shutters: null, chimney: false, doorU: 0,
    });
    b.prop('steeple', -22, -89.5, { h: 17, w: 3.4, r: 2 });

    const chaletOpts = () => ({ roof: 'gable', roofH: b.R(3, 3.9), twoStory: 0.5, porchChance: 0.5, fenceChance: 0.15, balcony: b.chance(0.4) ? 'balcony' : null });
    const lots = (path, from, step, side) => {
      for (let s = from; s < path.length - 10; s += step) b.houseIfClear(path, s, side, chaletOpts());
    };
    lots(lantern, 14, 25, 1);
    lots(lantern, 26, 25, -1);
    lots(chalet, 20, 25, 1);
    lots(chalet, 32, 25, -1);
    lots(sleigh, 14, 25, 1);
    lots(sleigh, 26, 25, -1);
    lots(summit, 20, 26, 1);
    lots(summit, 32, 26, -1);

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, turn] of h.cars || []) b.car(p, Math.atan2(p.tz, p.tx) + turn);
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
      if (h.tub) b.pool(h.tub, 0.3, 1.9, 1.9); // a hot tub steaming in the snow
    }
    // the snowman parade lines the third, and more are dotted round the village
    for (let k = 0; k < 5; k++) {
      const t = 0.18 + k * 0.16, x = 6 + 40 * t, z = 26 - 52 * t;
      b.prop('snowman', x + 0.79 * 9, z + 0.61 * 9, { size: b.R(0.85, 1.2), color: b.pick(['#d33a2c', '#2f5d8a', '#3d7a4a', '#c98a1b', '#7a2f4f']), ang: Math.atan2(-0.61, -0.79), r: 0.7 }); // facing the fairway
    }
    for (const [x, z, s, c] of [[-118, 44, 1, '#d33a2c'], [-60, -22, 0.9, '#2f5d8a'], [-6, 52, 1.1, '#3d7a4a'], [76, -72, 1, '#d33a2c'],
      [120, -76, 1.2, '#2f5d8a'], [150, 40, 0.9, '#c98a1b'], [-6, 116, 1, '#7a2f4f'], [-128, 112, 1, '#3d7a4a'], [-94, 70, 1.1, '#d33a2c'], [-48, -60, 0.9, '#c98a1b']]) {
      if (!b.inCorridor(x, z, 2.5)) b.prop('snowman', x, z, { size: s, color: c, ang: b.R(0, 6.3), r: 0.6 * s });
    }
    // boards round the rink
    for (let k = 0; k < 10; k++) {
      const t = (k / 10) * Math.PI * 2, x = RINK.x + 15 * Math.cos(t), z = RINK.z + 8 * Math.sin(t);
      const tx = -15 * Math.sin(t), tz = 8 * Math.cos(t);
      b.prop('wall', x, z, { ang: Math.atan2(tz, tx), hu: 2.2, h: 0.55, r: 1.4, color: '#ffffff', cap: '#d33a2c' });
    }
    // snow fort on the hillside
    for (const [x, z, ang] of [[78, -86, 0.4], [83, -88, 0.4], [88, -90, 0.4]]) {
      b.prop('wall', x, z, { ang, hu: 2.2, h: 1.1, r: 2.2, color: '#f2f6f9', cap: '#ffffff' });
    }
    b.prop('shelter', -86, 68, { size: 6, ang: 0.1, r: 4.5 }); // warming hut
    b.prop('table', -86, 68, { ang: 0.1, r: 1 });
    b.prop('bin', -79, 74, { r: 0.5 });
    b.prop('gazebo', -76, 34, { size: 4.2, r: 3.5 }); // bandstand on the green
    b.prop('shelter', 92, -76, { size: 5, ang: 0.5, r: 4 }); // sled hut at the top of the hill
    b.prop('bin', 98, -78, { r: 0.5 });
    for (const [x, z, ang] of [[-62, 26, 2.2], [-9, -8, -0.6], [-28, -32, 1.6], [-44, -32, 1.6], [96, -44, 2.6], [-92, 61, 0.4]]) b.prop('bench', x, z, { ang, r: 1 });
    for (let s = 50; s < lantern.length - 30; s += 90) {
      const p = lantern.offset(s, -4.4);
      if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
    }
    b.lampsAlong(lantern, 42, 4.6, 20);
    b.lampsAlong(lantern, 42, -4.6, 41);
    b.lampsAlong(chalet, 46, -4.4, 24);
    b.lampsAlong(sleigh, 50, 4.4, 30);
    b.lampsAlong(summit, 56, -4, 30);
    b.lampsAlong(pondPath, 24, 1.6, 6);

    // ------------------------------------------------------------ trees
    const roads = [lantern, chalet, sleigh, summit];
    b.scatter(10000, (x, z) => {
      const u = b.rng();
      if (Math.hypot(x - SLED.x, z - SLED.z) < 44) return null; // keep the sledding hill open
      const dg = Math.hypot(x - POND.x, z - POND.z);
      if (dg < 56) {
        if (b.rng() > 0.06) return null; // the green stays open
        return { kind: u < 0.7 ? 'pine' : 'birch', r: b.R(2.8, 4) };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 30) {
        if (b.rng() > 0.3) return null;
        const kind = u < 0.6 ? 'pine' : u < 0.85 ? 'broad' : 'birch';
        return { kind, r: b.R(2.8, 4.6) };
      }
      const kind = u < 0.78 ? 'pine' : u < 0.92 ? 'broad' : 'birch';
      return { kind, r: kind === 'pine' ? b.R(3, 5) : b.R(3.4, 5.2), tall: 1.25 };
    });
  },
};

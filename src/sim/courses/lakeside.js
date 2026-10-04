// Course 2: Lakeside Loop. Nine holes around a lake: along the lakefront yards, over the
// cove, through the nature preserve, out to an island green in the marsh, down the
// boardwalk, across the picnic grove, onto the peninsula and finally to a basket on
// the end of the swim dock.
import { smoothstep } from '../geom.js';
import { LAKESIDE } from './themes.js';

const L = 2; // lake level
const ISLAND = { x: -160, z: -4, r: 6.5 };

const LAKE = [
  [112, 4], [108, -18], [96, -34], [76, -44], [50, -49], [26, -50], [12, -54],
  [6, -66], [-6, -80], [-24, -86], [-42, -80], [-52, -66], [-58, -54],
  [-80, -50], [-106, -48], [-126, -42], [-142, -36], [-160, -34], [-178, -26], [-188, -8],
  [-184, 12], [-170, 26], [-150, 30], [-132, 34], [-110, 42], [-80, 46], [-50, 46], [-26, 44],
  [-10, 40], [-4, 26], [0, 12], [6, 4], [16, 4], [22, 14], [26, 28], [34, 40],
  [60, 40], [86, 32], [104, 20],
];

function height(lake, x, z) {
  const sd = lake.poly.sdf(x, z, 140);
  let h;
  if (sd >= 0) {
    const roll = 1.1 * Math.sin(0.021 * x + 0.7) * Math.cos(0.017 * z - 0.3) + 0.5 * Math.sin(0.043 * x - 0.031 * z + 1.1);
    const rise = 5.5 * smoothstep(-45, -135, z) + 2.5 * smoothstep(45, 135, z) + 1.5 * smoothstep(110, 200, x);
    const shore = L + Math.min(sd, 5) * 0.12 + Math.max(0, sd - 5) * 0.035;
    h = shore + Math.max(rise + roll, -0.4) * smoothstep(3, 30, sd);
  } else {
    // the west lobe is a shallow marsh; the rest shelves off to a few metres
    const cap = 3.2 - 2.5 * smoothstep(-128, -150, x);
    h = L - Math.min(cap, -sd * 0.45);
  }
  const ix = x - ISLAND.x, iz = z - ISLAND.z;
  return Math.max(h, L + 0.7 * (1 - (ix * ix + iz * iz) / (ISLAND.r * ISLAND.r)));
}

export default {
  id: 'lakeside',
  name: 'Lakeside Loop',
  blurb: 'Water carries, an island green and a basket on the end of the swim dock.',
  seed: 4242,
  world: { halfW: 210, halfH: 160 },
  theme: LAKESIDE,

  create(b) {
    // ------------------------------------------------------------- plan
    const lakeview = b.road(
      [[-215, -122], [-150, -118], [-80, -122], [-10, -126], [60, -121], [130, -114], [215, -108]],
      { width: 7, name: 'Lakeview Dr', lawn: 40, lines: true },
    );
    const park = b.road(
      [[150, -115], [154, -70], [160, -20], [160, 30], [154, 80], [150, 119]],
      { width: 6.5, name: 'Park Ln', lawn: 30 },
    );
    const shore = b.road(
      [[-215, 126], [-140, 120], [-60, 124], [20, 122], [90, 118], [150, 119], [215, 113]],
      { width: 7, name: 'Shore Rd', lawn: 44 },
    );
    const lake = b.lake(LAKE, L, { name: 'lake' });
    b.terrain((x, z) => height(lake, x, z));

    b.footpath([[-158, -46], [-140, -64], [-112, -84], [-80, -96], [-50, -100], [-20, -96], [10, -92], [40, -78], [70, -66], [110, -64], [140, -60]], { name: 'North trail' });
    b.footpath([[-158, 34], [-140, 46], [-112, 58], [-80, 58], [-46, 60], [-14, 58], [24, 56], [60, 52], [96, 44], [122, 36]], { name: 'Greenway' });
    b.sandArea([[100, -24], [122, -32], [140, -16], [142, 10], [138, 30], [118, 40], [98, 28], [110, 4]]);
    b.pavedArea([[168, -36], [198, -36], [198, 12], [168, 12]]);
    b.lawnArea([[-120, 40], [130, 30], [150, 112], [-120, 116]]);
    b.lawnArea([[-62, -60], [24, -60], [24, -116], [-62, -116]]);

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Beach Front', par: 3, tee: { x: 150, z: 16 }, basket: { x: 118, z: -54 },
        trees: [[{ x: 136, z: -22 }, 5.5, 'broad'], [{ x: 128, z: -40 }, 4, 'birch'], [{ x: 146, z: -32 }, 3.2, 'bush']],
      },
      {
        name: 'Lakefront', par: 4, tee: { x: 124, z: -62 }, basket: { x: 18, z: -62 },
        trees: [[{ x: 92, z: -56 }, 4.5, 'willow'], [{ x: 64, z: -66 }, 4.5, 'broad'], [{ x: 44, z: -56 }, 4.2, 'willow'], [{ x: 30, z: -70 }, 3.5, 'bush']],
      },
      {
        name: 'The Cove', par: 3, tee: { x: 14, z: -80 }, basket: { x: -66, z: -74 },
        trees: [[{ x: -76, z: -82 }, 4.5, 'pine'], [{ x: -70, z: -62 }, 4, 'willow'], [{ x: 22, z: -90 }, 4, 'broad']],
      },
      {
        name: 'Preserve', par: 4, tee: { x: -46, z: -104 }, basket: { x: -140, z: -62 }, via: [{ x: -110, z: -98 }], corridor: 5.5,
        trees: [[{ x: -84, z: -96 }, 4, 'pine'], [{ x: -124, z: -84 }, 4.5, 'broad'], [{ x: -122, z: -66 }, 3.8, 'birch']],
      },
      {
        name: 'Island Green', par: 3, tee: { x: -150, z: -52 }, basket: { x: -161, z: -6 },
        trees: [[{ x: -163, z: -1 }, 2.8, 'willow']],
      },
      {
        name: 'Boardwalk', par: 3, tee: { x: -157, z: -1.5 }, basket: { x: -146, z: 62 },
        trees: [[{ x: -136, z: 50 }, 4.5, 'broad'], [{ x: -158, z: 70 }, 4, 'pine'], [{ x: -132, z: 66 }, 3.6, 'birch']],
      },
      {
        name: 'Picnic Grove', par: 4, tee: { x: -136, z: 74 }, basket: { x: -34, z: 80 },
        trees: [[{ x: -95, z: 76 }, 6, 'broad'], [{ x: -62, z: 84 }, 5.5, 'broad'], [{ x: -112, z: 92 }, 5, 'broad'], [{ x: -40, z: 66 }, 4.2, 'willow']],
      },
      {
        name: 'Peninsula', par: 3, tee: { x: -28, z: 68 }, basket: { x: 11, z: 9 },
        trees: [[{ x: 20, z: 22 }, 3.6, 'willow'], [{ x: -16, z: 58 }, 4, 'broad']],
      },
      {
        name: 'Swim Dock', par: 3, tee: { x: 42, z: 54 }, basket: { x: 87.2, z: 2.5 },
        trees: [[{ x: 60, z: 48 }, 4.5, 'broad'], [{ x: 104, z: 32 }, 3.8, 'willow']],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------------- houses
    const lots = (path, xs, side, o) => {
      for (const x of xs) b.house(path, path.sAlong(0, x), side, o);
    };
    lots(lakeview, [-195, -165, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165, 195], -1);
    lots(lakeview, [58, 86], 1, { fenceChance: 1, garage: false });
    lots(shore, [-195, -165, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165, 195], 1);
    for (const z of [-92, -64, 52, 82]) b.house(park, park.sAlong(1, z), -1);

    b.placeHouse({
      kind: 'boathouse', x: 97.5, z: -37.5, ang: 2.25, hu: 4.8, hv: 3.4, front: 1, stories: 1,
      wallH: 3.6, roofH: 2.2, roof: 'gable', wall: '#b5452f', roofColor: '#3f4a45', trim: '#ffffff',
      shutters: null, chimney: false, windows: false,
    });

    // ---------------------------------------------------- docks and decks
    b.span({ x: 116, z: 2 }, { x: 90, z: 2 }, 3, L + 0.6, { kind: 'dock' });
    b.platform({ kind: 'dock', x: 87.4, z: 2, hu: 2.6, hv: 5, ang: 0, top: L + 0.6 });
    b.span({ x: 9, z: -70 }, { x: -8, z: -71 }, 2.2, L + 0.55, { kind: 'dock' });
    b.span({ x: -158, z: -38.5 }, { x: -158, z: -10.5 }, 2.6, L + 0.55, { kind: 'boardwalk', rails: true });
    b.span({ x: -158, z: 2.5 }, { x: -158, z: 32.5 }, 2.6, L + 0.55, { kind: 'boardwalk', rails: true });

    // ------------------------------------------------------------- park
    for (const [x, z, ang] of [[174, -30, 0], [174, -24, 0], [174, -12, 0], [174, -6, 0], [192, -28, Math.PI], [192, -16, Math.PI], [192, -4, Math.PI], [192, 2, Math.PI]]) {
      b.car({ x, z }, ang);
    }
    b.prop('umbrella', 124, -10, { r: 1.2, color: '#e94f37' });
    b.prop('umbrella', 129, 12, { r: 1.2, color: '#f2b134' });
    b.prop('umbrella', 121, 25, { r: 1.2, color: '#3a86c8' });
    b.prop('canoe', 132, 24, { ang: 1.2, r: 2.4, color: '#d9534f' });
    b.prop('canoe', 135, 19, { ang: 1.35, r: 2.4, color: '#2f7d6d' });
    b.prop('swing', 138, 46, { ang: 0.3, r: 2.6 });
    b.prop('slide', 128, 54, { ang: 1.4, r: 2 });
    b.prop('gazebo', 14, 34, { size: 4.2, r: 3.5 });
    for (const [x, z, ang] of [[-100, 64, 0.2], [-84, 92, -0.3], [-70, 62, 0.5], [-52, 94, 0.1]]) b.prop('table', x, z, { ang, r: 1.3 });
    for (const [x, z, ang] of [[-20, -98, 0], [-40, -94, 0.3], [62, 58, 2.9], [-8, 62, 3.3], [100, 40, 2.4], [-150, 40, 2.2]]) b.prop('bench', x, z, { ang, r: 1 });
    b.prop('bin', 118, 36, { r: 0.5 });
    b.prop('bin', -30, -96, { r: 0.5 });
    b.lampsAlong(lakeview, 60, 4.6, 30);
    b.lampsAlong(shore, 64, -4.6, 30);
    for (const [x, z, r] of [[40, -8, 9], [-60, 4, 12], [-20, 18, 7], [70, 12, 8], [-100, -16, 10]]) b.ducks.push({ x, z, r, speed: 0.4 + b.rng() * 0.3, phase: b.rng() * 6.3 });

    // reeds along the waterline (thick in the marsh), lily pads out on the marsh
    for (const [px, pz] of lake.poly.pts) {
      const n = px < -126 ? 2 : b.chance(0.14) ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const x = px + b.R(-2, 2), z = pz + b.R(-2, 2);
        const g = b.hf.get(x, z) - L;
        if (g > -0.35 && g < 0.15 && Math.abs(x + 158) > 2.2) b.prop('reeds', x, z, { n: 5 + Math.floor(b.rng() * 8), r: 0.6 });
      }
    }
    for (let i = 0; i < 700; i++) {
      const x = b.R(-188, -128), z = b.R(-34, 30);
      const g = b.hf.get(x, z) - L;
      if (g < -0.2 && g > -0.8 && Math.abs(x + 158) > 2.5 && Math.hypot(x - ISLAND.x, z - ISLAND.z) > 8 && b.chance(0.25)) {
        b.prop('lily', x, z, { n: 3 + Math.floor(b.rng() * 5), r: 0.1 });
      }
    }

    for (const h of holes) for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);

    // ------------------------------------------------------------ trees
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      const preserve = (x < -62 && z > -112 && z < -20) || (x < -120 && z > 30 && z < 112) || x < -186;
      if (preserve) return { kind: u < 0.42 ? 'pine' : u < 0.8 ? 'broad' : 'birch', r: b.R(3.2, 5.4), tall: 1.15 };
      const near = Math.min(lakeview.dist(x, z), shore.dist(x, z), park.dist(x, z));
      const greenway = z > 40 && z < 112 && x > -120 && x < 145;
      if (greenway) {
        if (b.rng() > 0.1) return null;
        return { kind: u < 0.7 ? 'broad' : 'willow', r: b.R(3.5, 6) };
      }
      if (near < 42) {
        if (b.rng() > 0.26) return null;
        const kind = u < 0.55 ? 'broad' : u < 0.72 ? 'pine' : u < 0.86 ? 'birch' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      if (z < -40 && z > -110 && x > -62) {
        if (b.rng() > 0.12) return null; // open lawns along the north shore
        return { kind: u < 0.5 ? 'willow' : 'broad', r: b.R(3, 5) };
      }
      return { kind: u < 0.55 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.3 };
    });
  },
};

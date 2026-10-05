// Sunset Heights. A summer hilltop neighbourhood: Hilltop Crescent wraps the hill on
// three sides, leaving the west slope open as a park. Tee off from the overlook at the
// crown, drop down to the lily pond, run Sunset Blvd, switchback up to the summit, bomb
// down to the ball field, play along Field St and Vista Ln and climb back to the top.
import { smoothstep } from '../geom.js';
import { SUMMER } from './themes.js';

const CROWN = { x: 0, z: -10 };
const POND = { x: -128, z: 50 };
const FIELD = { x: 115, z: 50 }; // centre of the infield
const HOME = { x: FIELD.x + 19 * Math.SQRT1_2, z: FIELD.z + 19 * Math.SQRT1_2 };

// warm evening pastels on the houses, otherwise a plain summer palette
const THEME = {
  ...SUMMER,
  walls: ['#f6dcc0', '#f2c9a8', '#efe3cf', '#e8c7b8', '#f4f1ea', '#f0d7a0', '#d9c6d6', '#e9d2b4', '#c9d7e0'],
  roofs: ['#7a3b34', '#6b4f3f', '#8a4a3a', '#55443a', '#4f5560', '#5b6470'],
  doors: ['#b5432f', '#2f5d8a', '#c98a1b', '#3d7a4a', '#7a2f4f', '#5a3e2b'],
};

function base(x, z) {
  const cx = x - CROWN.x, cz = z - CROWN.z;
  return (
    4 + 22 * Math.exp(-(cx * cx + cz * cz) / 6728) +
    0.9 * Math.sin(0.019 * x + 0.4) * Math.cos(0.023 * z - 0.6) +
    0.4 * Math.sin(0.043 * x - 0.031 * z + 1.1)
  );
}

function land(x, z) {
  let h = base(x, z);
  // the ball field is cut level into the foot of the hill
  const df = Math.hypot(x - FIELD.x, z - FIELD.z);
  if (df < 54) h += (base(FIELD.x, FIELD.z) - h) * (1 - smoothstep(38, 54, df));
  const px = x - POND.x, pz = z - POND.z;
  return h - 4.2 * Math.exp(-(px * px + pz * pz) / 420);
}

// A point a fraction t of the way from a to c, d metres to the right of travel.
const along = (a, c, t, d = 0) => {
  const dx = c.x - a.x, dz = c.z - a.z, l = Math.hypot(dx, dz);
  return { x: a.x + dx * t - (dz / l) * d, z: a.z + dz * t + (dx / l) * d };
};

export default {
  id: 'sunset',
  name: 'Sunset Heights',
  blurb: 'Summer on the hill: an overlook park, big drops, a ball field and a lily pond.',
  seed: 1590,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    // s runs from Vista Ln round the north, east and south of the hill, then down to
    // Sunset Blvd. d > 0 is the inside of the crescent, towards the summit.
    const ring = (deg, r = 56) => [CROWN.x + r * Math.cos((deg * Math.PI) / 180), CROWN.z + r * Math.sin((deg * Math.PI) / 180)];
    const crescent = b.road(
      [[-122, -112], [-98, -94], [-64, -76], ring(240), ring(270), ring(300), ring(330), ring(0), ring(30), ring(60), ring(90),
        [-28, 52], [-54, 74], [-66, 112]],
      { width: 7, name: 'Hilltop Crescent', lawn: 34 },
    );
    const sunset = b.road(
      [[-215, 108], [-140, 112], [-60, 108], [20, 113], [100, 108], [165, 110], [215, 106]],
      { width: 7.5, name: 'Sunset Blvd', lawn: 34, lines: true },
    );
    const field = b.road(
      [[163, -165], [166, -112], [162, -40], [166, 30], [164, 110]],
      { width: 6.5, name: 'Field St', lawn: 30 },
    );
    const vista = b.road(
      [[-215, -114], [-122, -112], [-40, -116], [60, -110], [166, -112]],
      { width: 6.5, name: 'Vista Ln', lawn: 30 },
    );
    b.terrain(land);
    const pondLevel = land(POND.x, POND.z) + 2.1;
    b.pond(POND.x, POND.z, 24, pondLevel, 'lily pond');
    b.clearZone(POND.x, POND.z, 20);

    // the ball field (outfield lawn and infield skin), the overlook park and the west slope
    b.lawnArea(Array.from({ length: 20 }, (_, i) => {
      const t = (i / 20) * Math.PI * 2;
      return [FIELD.x + 44 * Math.cos(t), FIELD.z + 44 * Math.sin(t)];
    }));
    const diamond = [0, 1, 2, 3].map((k) => {
      const t = Math.PI / 4 + (k * Math.PI) / 2;
      return [FIELD.x + 19 * Math.cos(t), FIELD.z + 19 * Math.sin(t)];
    });
    b.sandArea(diamond);
    b.lawnArea(Array.from({ length: 20 }, (_, i) => {
      const t = (i / 20) * Math.PI * 2;
      return [CROWN.x + 30 * Math.cos(t), CROWN.z + 30 * Math.sin(t)];
    }));
    b.lawnArea([[-24, -34], [-60, -44], [-100, -24], [-130, 5], [-168, 40], [-172, 96], [-120, 100], [-84, 82], [-62, 50], [-38, 30], [-22, 18]]);
    b.footpath([[-8, -2], [-30, 6], [-56, 18], [-80, 30], [-104, 34]], { name: 'Overlook path' });
    b.footpath([[-108, 36], [-110, 58], [-122, 76], [-142, 76], [-150, 60], [-146, 40], [-130, 30], [-110, 34]], { name: 'Pond loop' });

    // ------------------------------------------------------------ holes
    const T = {
      1: { x: -14, z: -16 }, 2: { x: -96, z: 14 }, 3: { x: -140, z: 100 }, 4: { x: -20, z: 84 }, 5: { x: 16, z: -12 },
      6: { x: 84, z: 30 }, 7: { x: 146, z: 46 }, 8: { x: 138, z: -66 }, 9: { x: 60, z: -90 },
    };
    const B = {
      1: { x: -88, z: 4 }, 2: { x: -150, z: 86 }, 3: { x: -30, z: 90 }, 4: { x: 4, z: 2 }, 5: { x: 80, z: 22 },
      6: { x: HOME.x, z: HOME.z }, 7: { x: 148, z: -60 }, 8: { x: 68, z: -82 }, 9: { x: -6, z: -28 },
    };
    const V = { 3: { x: -85, z: 103 }, 4: { x: 22, z: 40 }, 7: { x: 160, z: 4 }, 9: { x: 8, z: -86 } };
    const A = (n, t, d) => along(T[n], V[n] ?? B[n], t, d);
    const Z = (n, t, d) => along(V[n], B[n], t, d);

    const holes = [
      {
        name: 'Overlook', par: 3, tee: T[1], basket: B[1],
        trees: [[A(1, 0.38, 9), 4.6, 'broad'], [A(1, 0.55, -8.5), 4.2, 'broad'], [A(1, 0.78, 7.5), 3.6, 'birch'], [A(1, 1.1, 6), 3.2, 'bush']],
      },
      {
        name: 'Lily Pad', par: 3, tee: T[2], basket: B[2],
        trees: [[A(2, 0.2, -9), 4.2, 'broad'], [A(2, 0.95, -7), 3.8, 'willow'], [A(2, 0.82, -7.5), 3.6, 'willow']],
      },
      {
        name: 'Sunset Boulevard', par: 4, tee: T[3], basket: B[3], via: [V[3]],
        trees: [[A(3, 0.35, -7.5), 4.8, 'broad'], [A(3, 0.72, -7), 4.5, 'broad'], [Z(3, 0.3, 7.5), 5, 'broad'], [Z(3, 0.62, -7.5), 4.4, 'broad'], [Z(3, 1.0, 9), 3.2, 'bush']],
        cars: [[sunset.offset(sunset.sAlong(0, -108), -2.4), 0], [sunset.offset(sunset.sAlong(0, -54), -2.4), Math.PI]],
      },
      {
        name: 'Switchback', par: 4, tee: T[4], basket: B[4], via: [V[4]],
        trees: [[A(4, 0.4, -8), 4.6, 'broad'], [A(4, 0.62, 8), 4.2, 'pine'], [Z(4, 0.35, -7.5), 4, 'broad'], [Z(4, 0.6, 7.5), 3.8, 'birch']],
        hedges: [[A(4, 0.78, -7), A(4, 0.95, -8)]],
      },
      {
        name: 'Long Way Down', par: 3, tee: T[5], basket: B[5],
        trees: [[A(5, 0.42, -8.5), 4.4, 'broad'], [A(5, 0.6, 8.5), 4.8, 'broad'], [A(5, 0.8, -7.5), 3.6, 'birch']],
        pool: A(5, 0.75, -14),
      },
      {
        name: 'Home Plate', par: 3, tee: T[6], basket: B[6],
        trees: [],
      },
      {
        name: 'Field Street', par: 4, tee: T[7], basket: B[7], via: [V[7]],
        trees: [[A(7, 0.45, -8), 4.4, 'broad'], [Z(7, 0.3, 8), 4.8, 'broad'], [Z(7, 0.55, -8), 4.6, 'broad'], [Z(7, 0.82, 7.5), 4, 'pine'], [Z(7, 1.12, 1), 3.2, 'bush']],
        cars: [[field.offset(field.sAlong(1, -24), 2.3), 0]],
      },
      {
        name: 'Vista', par: 3, tee: T[8], basket: B[8],
        trees: [[A(8, 0.3, 8.5), 4.6, 'broad'], [A(8, 0.55, -8), 4.4, 'broad'], [A(8, 0.82, 7.5), 3.8, 'pine'], [A(8, 1.12, -2), 3, 'bush']],
        pool: A(8, 0.6, -16),
      },
      {
        name: 'Summit', par: 4, tee: T[9], basket: B[9], via: [V[9]],
        trees: [[A(9, 0.4, 7.5), 4.6, 'broad'], [A(9, 0.75, -7.5), 4.2, 'pine'], [Z(9, 0.32, -7.5), 4.2, 'broad'], [Z(9, 0.58, 7.5), 4, 'birch'], [Z(9, 0.8, -7), 3.4, 'broad']],
        hedges: [[A(9, 0.15, -6.5), A(9, 0.35, -6.5)]],
      },
    ];
    for (const h of holes) b.hole(h);

    // --------------------------------------------------------- houses
    const lots = (path, vs, side, axis = 0, o = {}) => {
      for (const v of vs) b.houseIfClear(path, path.sAlong(axis, v), side, { fenceChance: 0.25, ...o });
    };
    for (let s = 34, k = 0; s < crescent.length - 30; s += 27, k++) {
      b.houseIfClear(crescent, s, -1, { home: k === 4 });
      if (s > 80 && s < crescent.length - 70) b.houseIfClear(crescent, s + 13, 1, { setback: 9, fenceChance: 0 });
    }
    const across = [-190, -164, -138, -112, -86, -60, -34, -8, 18, 44, 70, 96, 122, 148, 186];
    lots(sunset, across, 1);
    lots(sunset, across.filter((x) => x < 80 || x > 160), -1); // the ball field runs down to the boulevard
    lots(vista, across.filter((x) => x < 160), -1);
    lots(vista, across.filter((x) => x < 160), 1);
    const north = [-140, -114, -88, -62, -36, -10, 16, 42, 68, 94];
    lots(field, north, -1, 1); // s runs south, so d < 0 is the east side
    lots(field, north.filter((z) => z < -50), 1, 1);

    // ------------------------------------------------- hole furniture
    const poolSpot = (p) => {
      for (const [ox, oz] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [6, 6], [-6, 6], [6, -6], [-6, -6], [9, 0], [-9, 0], [0, 9], [0, -9]]) {
        const x = p.x + ox, z = p.z + oz;
        if (b.blocked(x, z, 7) || b.inCorridor(x, z, 9) || b.wet(x, z, 0.5)) continue;
        if (b.roads.some((r) => r.dist(x, z) < r.width / 2 + 7)) continue;
        return { x, z };
      }
      return null;
    };
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, turn] of h.cars || []) b.car(p, Math.atan2(p.tz, p.tx) + turn);
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
      const spot = h.pool && poolSpot(h.pool);
      if (spot) b.pool(spot, b.R(0, Math.PI));
    }
    // backyard pools behind a few of the houses
    let pools = 0;
    for (const hs of b.houses) {
      if (hs.kind !== 'house' || pools >= 7 || !b.chance(0.3)) continue;
      const w = -hs.front * (hs.hv + 7.5);
      const p = { x: hs.cx - w * hs.sin, z: hs.cz + w * hs.cos };
      if (b.blocked(p.x, p.z, 5.6) || b.inCorridor(p.x, p.z, 8) || b.wet(p.x, p.z, 0.5)) continue;
      if (b.roads.some((r) => r.dist(p.x, p.z) < r.width / 2 + 7)) continue;
      if (Math.abs(p.x) > b.halfW - 8 || Math.abs(p.z) > b.halfH - 8 || Math.hypot(p.x - FIELD.x, p.z - FIELD.z) < 50 || Math.hypot(p.x - CROWN.x, p.z - CROWN.z) < 36) continue;
      b.pool(p, hs.ang, 4.6, 2.8);
      pools++;
    }
    const put = (type, x, z, o = {}) => {
      if (!b.inCorridor(x, z, (o.r ?? 1) + 3.5)) b.prop(type, x, z, o);
    };
    const facing = (fx, fz) => Math.atan2(-fx, fz); // bench angle that faces (fx, fz)

    // the overlook park at the crown: a gazebo, picnic tables and benches facing the sunset
    put('gazebo', CROWN.x + 1, CROWN.z - 2, { size: 4.2, r: 3.5 });
    put('table', -12, -32, { ang: 0.5, r: 1.2 });
    put('table', 14, -28, { ang: -0.3, r: 1.2 });
    put('table', -22, 12, { ang: 0.2, r: 1.2 });
    for (const deg of [140, 158, 198, 214]) {
      const t = (deg * Math.PI) / 180;
      put('bench', CROWN.x + 26 * Math.cos(t), CROWN.z + 26 * Math.sin(t), { ang: facing(Math.cos(t), Math.sin(t)), r: 1 });
    }
    put('bin', 8, -22, { r: 0.5 });
    put('bin', -4, 12, { r: 0.5 });
    for (const [x, z, r] of [[-44, -30, 1.4], [-60, 46, 1.2], [-40, 30, 1.6], [-72, -18, 1.3]]) put('boulder', x, z, { r });

    // the ball field: backstop behind home plate, dugout benches and a playground
    const arc = [-0.75, -0.25, 0.25, 0.75].map((t) => ({
      x: HOME.x + 7.5 * Math.cos(Math.PI / 4 + t), z: HOME.z + 7.5 * Math.sin(Math.PI / 4 + t),
    }));
    for (let k = 1; k < arc.length; k++) b.fence(arc[k - 1], arc[k], 'privacy');
    put('bench', FIELD.x + 26, FIELD.z - 4, { ang: facing(-1, 0.3), r: 1 });
    put('bench', FIELD.x - 4, FIELD.z + 26, { ang: facing(0.3, -1), r: 1 });
    put('shelter', FIELD.x + 34, FIELD.z + 32, { size: 5, ang: Math.PI / 4, r: 4 });
    put('swing', 136, 94, { ang: 0.1, r: 2.6 });
    put('slide', 124, 96, { ang: 1.4, r: 2 });
    put('bin', FIELD.x + 30, FIELD.z + 22, { r: 0.5 });

    // round the lily pond
    b.span({ x: POND.x + 12, z: POND.z - 4 }, { x: POND.x + 3, z: POND.z - 1 }, 2.2, pondLevel + 0.45, { kind: 'dock' });
    for (const [x, z, ang] of [[-112, 60, -0.6], [-151, 36, 2.4], [-134, 76, 3.3]]) put('bench', x, z, { ang, r: 1 });
    put('table', -160, 56, { ang: 0.3, r: 1.2 });
    b.ducks.push({ x: POND.x - 3, z: POND.z + 3, r: 5, speed: 0.4, phase: 1.2 });
    for (let i = 0; i < 360; i++) {
      const x = POND.x + b.R(-20, 20), z = POND.z + b.R(-20, 20);
      const g = b.hf.get(x, z) - pondLevel;
      if (g < -0.25 && g > -1.3 && b.chance(0.2)) b.prop('lily', x, z, { n: 3 + Math.floor(b.rng() * 5), r: 0.1 });
      else if (g > -0.15 && g < 0.25 && b.chance(0.25)) b.prop('reeds', x, z, { n: 5 + Math.floor(b.rng() * 6), r: 0.4 });
    }

    // streets
    b.lampsAlong(crescent, 58, -4.4, 30);
    b.lampsAlong(sunset, 64, 4.8, 30);
    b.lampsAlong(field, 70, 4.4, 30);
    b.lampsAlong(vista, 70, -4.4, 40);
    for (const [path, d] of [[crescent, -4.4], [sunset, -4.8], [vista, 4.4]]) {
      for (let s = 60; s < path.length - 30; s += 90) {
        const p = path.offset(s, d);
        if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
      }
    }
    for (const [p, ang] of [[sunset.offset(sunset.sAlong(0, 60), -2.6), 0], [sunset.offset(sunset.sAlong(0, -170), 2.6), Math.PI],
      [vista.offset(vista.sAlong(0, -60), 2.4), Math.PI], [field.offset(field.sAlong(1, -110), 2.3), Math.PI / 2],
      [crescent.offset(60, -2.3), 0]]) {
      if (!b.inCorridor(p.x, p.z, 3.5)) b.car(p, Math.atan2(p.tz, p.tx) + ang);
    }

    // ------------------------------------------------------------ trees
    b.scatter(10000, (x, z) => {
      const u = b.rng();
      const crown = Math.hypot(x - CROWN.x, z - CROWN.z);
      if (Math.hypot(x - FIELD.x, z - FIELD.z) < 48) return null;
      if (crown < 30) {
        if (b.rng() > 0.05) return null; // the overlook stays open
        return { kind: u < 0.7 ? 'broad' : 'birch', r: b.R(3, 4.5) };
      }
      const road = Math.min(crescent.dist(x, z), sunset.dist(x, z), field.dist(x, z), vista.dist(x, z));
      const park = x < -20 && x > -170 && z > -60 && z < 96 && road > 18;
      if (park) {
        if (b.rng() > (Math.hypot(x - POND.x, z - POND.z) < 36 ? 0.1 : 0.14)) return null;
        const kind = Math.hypot(x - POND.x, z - POND.z) < 40 && u < 0.5 ? 'willow' : u < 0.7 ? 'broad' : 'birch';
        return { kind, r: b.R(3.2, 5) };
      }
      if (road < 44) {
        if (b.rng() > 0.3) return null; // yards stay fairly open
        const kind = u < 0.6 ? 'broad' : u < 0.76 ? 'pine' : u < 0.88 ? 'bush' : 'birch';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      return { kind: u < 0.62 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.25 };
    });
  },
};

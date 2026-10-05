// Course 10: French Quarter. Nine holes through the old streets by the Mississippi:
// down Bourbon under the iron galleries, through Pirate's Alley beside the cathedral,
// across Jackson Square past the statue, to the café on the levee, along the Moonwalk
// with a paddle steamer moored alongside, up Toulouse, along Royal, down past the
// French Market and up St. Philip to the old blacksmith's shop.
import { NOLA } from './themes.js';

const RIVER = 1.0; // the river's level
const STREETS_EW = [['Decatur St', 90], ['Chartres St', 20], ['Royal St', -30], ['Bourbon St', -75], ['Dauphine St', -120]];
const STREETS_NS = [['St. Louis St', -190], ['Toulouse St', -120], ['St. Peter St', -52], ['St. Ann St', 52], ['Dumaine St', 120], ['St. Philip St', 190]];
const FRONT = 6.6; // street centre to building front: half the street, then the sidewalk
const DEEP = 6.5; // half the depth of a townhouse

function height(x, z) {
  let h = 3 + 0.12 * Math.sin(0.05 * x + 0.3) * Math.cos(0.04 * z);
  if (z > 116) h = Math.max(-2.2, 3 - (z - 116) * 0.85); // the riverbank
  return h;
}

export default {
  id: 'quarter',
  name: 'French Quarter',
  blurb: 'Bourbon Street balconies, Jackson Square, the levee and a brass band.',
  seed: 1718,
  world: { halfW: 225, halfH: 165 },
  theme: NOLA,

  create(b) {
    // ------------------------------------------------------------- plan
    const ew = STREETS_EW.map(([name, z]) => b.road([[-240, z], [240, z]], { width: 8, name, lawn: 0, shoulder: 3 }));
    const ns = STREETS_NS.map(([name, x]) => b.road([[x, -180], [x, 90]], { width: 8, name, lawn: 0, shoulder: 3 }));
    b.lake([[-300, 121], [300, 121], [300, 260], [-300, 260]], RIVER, { name: 'river', per: 1 });
    b.terrain(height);
    for (const r of [...ew, ...ns]) {
      for (const s of [-1, 1]) b.footpath(r.pts.map((p, i) => {
        const q = r.offset(r.cum[i], s * 5.2);
        return [q.x, q.z];
      }), { width: 2.4, name: 'sidewalk' });
    }
    // the alleys either side of the cathedral, the levee promenade and the square's walks
    b.footpath([[-17, -27], [-17, 15]], { width: 6, name: "Pirate's Alley" });
    b.footpath([[17, -27], [17, 15]], { width: 6, name: 'Père Antoine Alley' });
    b.pavedArea([[-240, 96], [240, 96], [240, 117], [-240, 117]], { color: '#b8a48c' });
    b.lawnArea([[-29, 27], [29, 27], [29, 84], [-29, 84]]);
    b.footpath([[-29, 27], [29, 84]], { width: 3, name: 'walk' });
    b.footpath([[29, 27], [-29, 84]], { width: 3, name: 'walk' });
    b.footpath([[0, 27], [0, 84]], { width: 3, name: 'walk' });
    b.lawnArea([[-13, -26], [13, -26], [13, -18], [-13, -18]]); // St. Anthony's garden

    // ------------------------------------------------------------ holes
    const holes = [
      { name: 'Bourbon Street', par: 4, tee: { x: -205, z: -75 }, basket: { x: -60, z: -75 } },
      { name: "Pirate's Alley", par: 3, tee: { x: -52, z: -50 }, via: [{ x: -17, z: -30 }], basket: { x: -17, z: 12 } },
      { name: 'Jackson Square', par: 3, tee: { x: -24, z: 21 }, basket: { x: 16, z: 74 } },
      { name: 'Café du Monde', par: 3, drop: [74, 112], tee: { x: 22, z: 79 }, basket: { x: 104, z: 111 } },
      { name: 'The Moonwalk', par: 4, drop: [-57, 103], tee: { x: 60, z: 112 }, basket: { x: -95, z: 111 } },
      { name: 'Toulouse Street', par: 4, tee: { x: -120, z: 104 }, via: [{ x: -120, z: 40 }], basket: { x: -120, z: -15 } },
      { name: 'Royal Street', par: 4, tee: { x: -105, z: -30 }, basket: { x: 35, z: -30 } },
      { name: 'French Market', par: 5, drop: [147, 90], tee: { x: 52, z: -18 }, via: [{ x: 54, z: 86 }], basket: { x: 175, z: 101 } },
      { name: "Lafitte's", par: 4, tee: { x: 192, z: 84 }, basket: { x: 192, z: -70 } },
    ];
    for (const h of holes) b.hole(h);

    // ------------------------------------------------- landmark buildings
    // St. Louis Cathedral with its three spires, between the Cabildo and the Presbytère
    b.placeHouse({ kind: 'cathedral', x: 0, z: -2, ang: 0, hu: 13, hv: 15, front: 1, stories: 3, wallH: 12, roofH: 3, roof: 'hip',
      wall: '#f4f1ea', roofColor: '#4a4f57', trim: '#ffffff', door: '#5a3e2b', shutters: null, chimney: false });
    b.prop('steeple', 0, 11, { h: 31, w: 6, r: 3.3 });
    for (const s of [-1, 1]) b.prop('steeple', s * 10, 11, { h: 20, w: 3.6, r: 2 });
    for (const s of [-1, 1]) {
      b.placeHouse({ kind: 'civic', x: s * 33.3, z: -2, ang: 0, hu: 12.2, hv: 13, front: 1, stories: 2, wallH: 7.6, roofH: 3.4, roof: 'hip',
        wall: '#e8e2d6', roofColor: '#4a4f57', trim: '#ffffff', door: '#2f4a3a', shutters: '#2f5d3a', chimney: false, balcony: 'balcony' });
    }
    // the Pontalba buildings: long red-brick rows with iron galleries along the square
    for (const s of [-1, 1]) {
      b.placeHouse({ kind: 'pontalba', x: s * (52 - FRONT - DEEP - 0.5), z: 55, ang: Math.PI / 2, hu: 30, hv: DEEP + 0.5, front: -s, stories: 3, wallH: 8, roofH: 1.6,
        roof: 'hip', wall: '#a0523d', roofColor: '#4a4f57', trim: '#e8e2d6', door: '#2f4a3a', shutters: '#1f3a2a', chimney: true, balcony: 'gallery' });
    }
    // Lafitte's Blacksmith Shop: a tumbledown brick cottage on the corner of Bourbon
    b.placeHouse({ kind: 'cottage', x: 190 + FRONT + 7, z: -75 - FRONT - 5, ang: 0, hu: 7, hv: 5, front: 1, stories: 1, wallH: 3.4, roofH: 3, roof: 'hip',
      wall: '#7a4a3a', roofColor: '#4a4f57', trim: '#d8cfc0', door: '#3a2a20', shutters: '#2b2b2b', chimney: true });

    // ------------------------------------------------- townhouse blocks
    const X = [-240, ...STREETS_NS.map(([, x]) => x), 240];
    const Z = [-180, ...STREETS_EW.map(([, z]) => z).reverse()];
    const street = (v, list) => list.some(([, s]) => s === v);
    const front = (ax, az, bx, bz, nx, nz, o = {}) => {
      // a row of townhouses whose fronts run from a to b, facing out along n
      const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
      const ang = Math.atan2(tz, tx), side = -tz * nx + tx * nz > 0 ? 1 : -1; // is n the local +w side?
      let s = 0;
      while (s < len - 5) {
        let hu = b.R(4, 6.5);
        if (len - s - 2 * hu < 7) hu = (len - s) / 2;
        const cs = s + hu, cx = ax + tx * cs - nx * DEEP, cz = az + tz * cs - nz * DEEP;
        if (!(o.skip && o.skip(cx, cz))) {
          const roll = b.rng(), stories = roll < 0.15 ? 1 : roll < 0.75 ? 2 : 3;
          const balcony = stories === 1 ? null : b.rng() < (o.galleries ?? 0.35) ? 'gallery' : b.rng() < 0.85 ? 'balcony' : null;
          const h = b.placeHouse({ kind: 'townhouse', x: cx, z: cz, ang, hu: hu - 0.05, hv: DEEP, front: side, stories, wallH: stories === 1 ? 3.6 : undefined,
            roofH: stories === 1 ? b.R(2.4, 3) : b.R(1.2, 1.8), roof: stories === 1 ? 'gable' : b.chance(0.5) ? 'hip' : 'gable',
            balcony, chimney: b.chance(0.4), doorU: b.R(-hu * 0.4, hu * 0.4) });
          if (balcony && o.beads && b.chance(0.5)) {
            const w = side * (DEEP + (balcony === 'gallery' ? 2.5 : 1.0));
            b.prop('beads', cx - w * Math.sin(ang), cz + w * Math.cos(ang), { y: h.base + 3.6, n: 4, spread: hu * 0.7, r: 0 });
          }
        }
        s += hu * 2;
      }
    };
    const lafitte = (x, z) => x > 190 && x < 215 && z > -95 && z < -78;
    for (let i = 0; i < X.length - 1; i++) {
      for (let j = 0; j < Z.length - 1; j++) {
        const x0 = X[i], x1 = X[i + 1], z0 = Z[j], z1 = Z[j + 1];
        if (z0 === 90) continue;
        if (x0 === -52 && x1 === 52 && z0 >= -30) continue; // cathedral block and the square
        const L = x0 + (street(x0, STREETS_NS) ? FRONT : 0), R = x1 - (street(x1, STREETS_NS) ? FRONT : 0);
        const T = z0 + (street(z0, STREETS_EW) ? FRONT : 0), B = z1 - (street(z1, STREETS_EW) ? FRONT : 0);
        const o = { skip: lafitte };
        if (street(z1, STREETS_EW)) front(L, B, R, B, 0, 1, { ...o, galleries: z1 === -75 ? 0.6 : 0.35, beads: z1 === -75 }); // south side, facing the next street down
        if (street(z0, STREETS_EW)) front(L, T, R, T, 0, -1, { ...o, galleries: z0 === -75 ? 0.6 : 0.35, beads: z0 === -75 });
        if (street(x0, STREETS_NS) && B - T > 30) front(L, T + 2 * DEEP + 0.2, L, B - 2 * DEEP - 0.2, -1, 0, o);
        if (street(x1, STREETS_NS) && B - T > 30) front(R, T + 2 * DEEP + 0.2, R, B - 2 * DEEP - 0.2, 1, 0, o);
      }
    }
    // the blocks either side of the cathedral front Royal Street too
    front(-45.6, -23.4, -21, -23.4, 0, -1);
    front(21, -23.4, 45.6, -23.4, 0, -1);

    // ----------------------------------------------------- Jackson Square
    b.prop('statue', 0, 56, { ang: Math.PI / 2, r: 2 });
    const rail = (a, c) => b.fence(a, c, 'iron');
    rail({ x: -29, z: 27 }, { x: -4, z: 27 }); rail({ x: 4, z: 27 }, { x: 29, z: 27 });
    rail({ x: -29, z: 84 }, { x: -4, z: 84 }); rail({ x: 4, z: 84 }, { x: 29, z: 84 });
    rail({ x: -29, z: 27 }, { x: -29, z: 84 }); rail({ x: 29, z: 27 }, { x: 29, z: 84 });
    for (const [x, z, ang] of [[-12, 44, 0.8], [12, 44, -0.8], [-12, 68, 2.3], [12, 68, -2.3], [-22, 56, 1.57], [22, 56, -1.57]]) b.prop('bench', x, z, { ang, r: 1 });
    for (const [x, z, r, kind] of [[-21, 36, 4.2, 'broad'], [21, 36, 4.2, 'broad'], [-21, 76, 4.2, 'broad'], [24, 66, 3.6, 'broad'], [-24, 56, 2.4, 'palm'], [24, 50, 2.4, 'palm'], [-8, 36, 2.2, 'palm'], [-8, 76, 2.2, 'palm']]) {
      if (!b.inCorridor(x, z, 4)) b.tree({ x, z }, r, kind, kind === 'broad' ? { color: '#3f6a38', tall: 0.9 } : {});
    }

    // ------------------------------------------------- the riverfront
    b.prop('cafe', 85, 104, { hu: 9, hv: 5.5, r: 9 });
    b.prop('market', 160, 112, { hu: 44, hv: 4.5, r: 1 });
    b.prop('steamboat', -20, 140, { y: RIVER, ang: 0, r: 15 });
    b.prop('streetcar', -175, 101, { r: 6 });
    for (const [x, z] of [[-200, 106], [-150, 108], [-60, 104], [10, 106], [120, 100], [-20, 100]]) {
      if (b.inCorridor(x, z, 6)) continue;
      const t = b.tree({ x, z }, b.R(5, 6.5), 'broad', { color: '#3f6a38', tall: 0.85 });
      b.prop('beads', t.x, t.z, { y: b.hf.get(t.x, t.z) + t.bottom + 0.2, n: 8, spread: t.r * 0.8, r: 0 });
    }
    for (const [x, z, ang] of [[-40, 117, 0], [-130, 117, 0], [30, 117, 0], [-180, 117, 0]]) b.prop('bench', x, z, { ang: Math.PI + ang, r: 1 });
    b.ducks.push({ x: 40, z: 145, r: 10, speed: 0.4, phase: 1 });

    // gas lamps along the sidewalks
    for (const r of [...ew, ...ns]) b.lampsAlong(r, 34, 4.6, 12);

    // ---------------------------------------------- courtyard gardens
    b.scatter(9000, (x, z) => {
      if (z > 90 || Math.abs(x) < 52 && z > -30) return null;
      const u = b.rng();
      if (b.rng() > 0.5) return null;
      return u < 0.45 ? { kind: 'palm', r: b.R(2, 2.8), tall: 0.6, roadPad: 6 } : u < 0.75 ? { kind: 'broad', r: b.R(2.2, 3.4), roadPad: 6, tall: 0.8 } : { kind: 'bush', r: b.R(1.2, 2), roadPad: 6 };
    });
  },
};

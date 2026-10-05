// Disc golfers in the same faceted, flat-shaded style as the trees and houses. Each player
// gets their own look (skin, hair, hat, build, a jersey in their colour with their number
// on the back, a disc bag) and a procedural rig: two-bone IK for arms and legs, a twisting
// torso and a head that follows the action.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { discGeometry } from './actors.js';

const UP = new THREE.Vector3(0, 1, 0);
const DEG = Math.PI / 180;
const THIGH = 0.44, SHIN = 0.42, ANKLE = 0.09, UPPER = 0.27, FORE = 0.29;
const PELVIS_H = 0.94; // pelvis height for a player standing tall
const HEAD = 0.8; // the head is modelled at 1/0.8 scale

const SKINS = ['#f1c7a1', '#c98e63', '#e3ad86', '#8a5a3b', '#f6d6bd', '#6e4630'];
const HAIRS = ['#2b1d14', '#e3c26b', '#5a3a22', '#121212', '#a8743a', '#8a2f1e'];
const SHORTS = ['#2f3b4c', '#c9b48a', '#3d4a3a', '#55595f'];
const SHOES = ['#f4f4f0', '#2f3640', '#e94f37', '#3b82f6'];
const STYLES = [
  { hat: 'cap', hair: 'short', build: 1 },
  { hat: 'visor', hair: 'ponytail', build: 0.92 },
  { hat: 'bucket', hair: 'long', build: 1.08 },
  { hat: 'none', hair: 'curly', build: 0.97 },
];

export function playerLook(index, player, weather) {
  const s = STYLES[index % STYLES.length], cold = weather === 'snow';
  return {
    color: player.color, hand: player.hand, number: index + 1,
    skin: SKINS[index % SKINS.length], hairColor: HAIRS[index % HAIRS.length],
    shorts: SHORTS[index % SHORTS.length], shoes: SHOES[index % SHOES.length],
    hair: s.hair, hat: cold ? 'beanie' : s.hat, sleeves: cold ? 'long' : 'short', legs: cold ? 'long' : 'short',
    build: s.build,
  };
}

// ---------------------------------------------------------------- geometry
const BODY = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const G = {
  ico: new THREE.IcosahedronGeometry(1, 2),
  gem: new THREE.IcosahedronGeometry(1, 1),
  sphere: new THREE.SphereGeometry(1, 10, 7),
  dome: new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  hair: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.56),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  band: new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
  crown: new THREE.CylinderGeometry(0.93, 1, 1, 12),
  cone: new THREE.CylinderGeometry(0, 1, 1, 4),
  box: new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.TorusGeometry(1, 0.25, 4, 12),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// A faceted solid swept up the y axis through elliptical rings [y, rx, rz, ox, oz]:
// rx is the half depth along x (front to back), rz the half width along z.
function loft(rings, segs = 8) {
  const pos = [], idx = [];
  for (const [y, rx, rz, ox = 0, oz = 0] of rings) {
    for (let i = 0; i < segs; i++) {
      const a = ((i + 0.5) / segs) * Math.PI * 2;
      pos.push(ox + Math.cos(a) * rx, y, oz + Math.sin(a) * rz);
    }
  }
  const n = rings.length;
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < segs; i++) {
      const a = r * segs + i, b = r * segs + ((i + 1) % segs), c = a + segs, d = b + segs;
      idx.push(a, c, b, b, c, d);
    }
  }
  // close both ends
  const [y0, , , ox0 = 0, oz0 = 0] = rings[0], [y1, , , ox1 = 0, oz1 = 0] = rings[n - 1];
  const bot = pos.length / 3; pos.push(ox0, y0, oz0);
  const top = bot + 1; pos.push(ox1, y1, oz1);
  for (let i = 0; i < segs; i++) {
    idx.push(bot, i, (i + 1) % segs);
    idx.push(top, (n - 1) * segs + ((i + 1) % segs), (n - 1) * segs + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A round limb segment through rings [y, r].
const limbLoft = (rings, segs = 7) => loft(rings.map(([y, r]) => [y, r, r]), segs);

// Collects coloured shapes for one body part into a single mesh.
class Part {
  constructor() { this.geos = []; }

  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(_m.compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...scale)));
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geos.push(g);
    return this;
  }

  // A geometry made just for this part (a loft): add it, then let it go.
  own(geo, color, pos, rot, scale) {
    this.add(geo, color, pos, rot, scale);
    geo.dispose();
    return this;
  }

  // A rod between two local points.
  rod(color, a, b, r) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A), len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add(G.cyl, color, A.add(B).multiplyScalar(0.5).toArray(), [e.x, e.y, e.z], [r, len, r]);
  }

  mesh() {
    const geo = mergeGeometries(this.geos);
    for (const g of this.geos) g.dispose();
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, BODY);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getStyle();
const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
const PANTS = '#3a4150';

// Modelled at 1/HEAD scale around the skull; the neck point is the origin.
function buildHead(L) {
  const p = new Part(), skin = L.skin, hair = L.hairColor;
  const C = (x, y, z) => [x, 0.1 + y, z]; // relative to the centre of the skull
  p.add(G.ico, skin, C(0, 0, 0), [0, 0, 0], [0.142, 0.155, 0.13]);
  p.add(G.ico, skin, C(0.032, -0.075, 0), [0, 0, -0.3], [0.098, 0.085, 0.092]); // jaw and chin
  p.add(G.cyl, skin, [-0.01, -0.07, 0], [0, 0, 0], [0.075, 0.14, 0.072]); // neck
  for (const s of [-1, 1]) {
    p.add(G.gem, skin, C(-0.005, -0.012, s * 0.128), [0, 0, 0], [0.024, 0.04, 0.02]); // ears
    p.add(G.gem, '#1d2430', C(0.122, 0.012, s * 0.05), [0, 0, 0], [0.014, 0.026, 0.02]); // eyes
    p.add(G.box, shade(hair, 0.9), C(0.128, 0.052, s * 0.052), [s * 0.12, 0, 0], [0.016, 0.013, 0.05]); // brows
  }
  p.add(G.cone, shade(skin, 0.94), C(0.142, -0.022, 0), [0, 0, -Math.PI / 2], [0.022, 0.05, 0.022]); // nose
  p.add(G.box, mixc(skin, '#7a3b34', 0.65), C(0.124, -0.072, 0), [0, 0, 0.25], [0.012, 0.011, 0.05]); // mouth

  // hair
  if (L.hair !== 'none') p.add(G.hair, hair, C(-0.012, 0.012, 0), [0, 0, 0.55], [0.15, 0.163, 0.139]);
  if (L.hair === 'short') {
    for (const s of [-1, 1]) p.add(G.box, hair, C(-0.02, -0.03, s * 0.126), [0, 0, 0], [0.07, 0.06, 0.016]); // sideburns
  } else if (L.hair === 'ponytail') {
    p.add(G.gem, hair, C(-0.145, 0.03, 0), [0, 0, 0], [0.045, 0.045, 0.045]);
    p.add(G.cone, hair, C(-0.19, -0.08, 0), [0, 0, -0.35], [0.045, 0.2, 0.04]);
  } else if (L.hair === 'long') {
    p.add(G.ico, hair, C(-0.1, -0.1, 0), [0, 0, 0], [0.07, 0.15, 0.135]);
    for (const s of [-1, 1]) p.add(G.box, hair, C(-0.03, -0.09, s * 0.12), [0, 0, 0], [0.11, 0.17, 0.03]);
  } else if (L.hair === 'curly') {
    for (let i = 0; i < 16; i++) {
      const th = 0.2 + (i % 3) * 0.45 + (i % 2) * 0.1, ph = (i / 16) * Math.PI * 2;
      const dir = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      if (th > 0.6 && dir[0] > 0.25) continue; // keep the face clear
      p.add(G.gem, hair, C(dir[0] * 0.145, dir[1] * 0.155, dir[2] * 0.132), [0, 0, 0], [0.052, 0.052, 0.052]);
    }
  }

  // hats
  const hat = shade(L.color, 0.78);
  if (L.hat === 'cap') {
    p.add(G.dome, hat, C(-0.008, 0.03, 0), [0, 0, 0], [0.152, 0.13, 0.142]);
    p.add(G.gem, hat, C(-0.008, 0.158, 0), [0, 0, 0], [0.015, 0.012, 0.015]);
    p.add(G.cyl, hat, C(0.14, 0.045, 0), [0, 0, -0.2], [0.085, 0.013, 0.1]);
  } else if (L.hat === 'visor') {
    p.add(G.band, hat, C(0, 0.06, 0), [0, 0, 0.12], [0.148, 0.045, 0.137]);
    p.add(G.cyl, hat, C(0.145, 0.05, 0), [0, 0, -0.2], [0.085, 0.013, 0.1]);
  } else if (L.hat === 'bucket') {
    p.add(G.crown, '#c9b48a', C(0, 0.085, 0), [0, 0, 0], [0.155, 0.12, 0.145]);
    p.add(G.cyl, '#c9b48a', C(0, 0.145, 0), [0, 0, 0], [0.144, 0.014, 0.135]);
    p.add(G.cyl, '#b9a47a', C(0, 0.03, 0), [0, 0, 0], [0.225, 0.014, 0.215]);
    p.add(G.band, shade(L.color, 0.9), C(0, 0.045, 0), [0, 0, 0], [0.158, 0.025, 0.148]);
  } else if (L.hat === 'beanie') {
    p.add(G.dome, L.color, C(-0.008, 0.02, 0), [0, 0, 0], [0.156, 0.178, 0.146]);
    p.add(G.cyl, '#f4f4f0', C(-0.008, 0.035, 0), [0, 0, 0], [0.166, 0.06, 0.156]);
    p.add(G.gem, '#f4f4f0', C(-0.008, 0.205, 0), [0, 0, 0], [0.042, 0.042, 0.042]);
  }
  const m = p.mesh();
  m.scale.setScalar(HEAD);
  return m;
}

// Chest and shoulders, from the waist (y 0) up to the collar; x is forwards.
function buildTorso(L, side) {
  const p = new Part(), shirt = L.color, k = L.build, trim = shade(shirt, 0.72);
  p.own(loft([
    [-0.01, 0.112 * k, 0.15 * k], [0.12, 0.116 * k, 0.152 * k, 0.004], [0.24, 0.124 * k, 0.163 * k, 0.01],
    [0.35, 0.128 * k, 0.176 * k, 0.012], [0.43, 0.118 * k, 0.182 * k, 0.006], [0.5, 0.092, 0.15 * k], [0.55, 0.058, 0.075],
  ], 10), shirt);
  for (const s of [-1, 1]) p.add(G.ico, shirt, [0, 0.43, s * 0.19], [0, 0, 0], [0.068, 0.062, 0.068]); // shoulders
  p.add(G.ring, trim, [0.006, 0.535, 0], [Math.PI / 2, 0, 0], [0.062, 0.07, 0.07]); // collar
  p.add(G.box, trim, [0.105 * k, 0.48, 0], [0, 0, -0.5], [0.012, 0.07, 0.035]); // placket
  p.own(loft([[-0.05, 0.116 * k, 0.156 * k], [0.0, 0.114 * k, 0.153 * k]], 10), trim); // hem
  // disc bag on the off-side hip, strap over the throwing shoulder
  const bz = -side * 0.215 * k;
  p.own(loft([[-0.2, 0.12, 0.05], [-0.16, 0.135, 0.065], [0.08, 0.135, 0.068], [0.12, 0.12, 0.058]], 8), '#2f3640', [-0.02, 0, bz]);
  p.own(loft([[0.0, 0.137, 0.07], [0.035, 0.137, 0.07]], 8), shirt, [-0.02, 0, bz]); // bag trim
  ['#ff7a3d', '#3b82f6', '#f4c20d'].forEach((c, i) => p.add(G.cyl, c, [-0.09 + i * 0.07, 0.15, bz + (i - 1) * 0.022], [Math.PI / 2, 0, 0], [0.095, 0.018, 0.095]));
  p.rod('#2f3640', [0.02, 0.12, bz], [0.11 * k, 0.4, side * 0.1], 0.016);
  p.rod('#2f3640', [-0.06, 0.12, bz], [-0.1 * k, 0.42, side * 0.1], 0.016);
  return p.mesh();
}

// Hips and shorts, around the hip joints at y -0.06.
function buildPelvis(L) {
  const p = new Part(), k = L.build, pants = L.legs === 'long' ? PANTS : L.shorts;
  p.own(loft([
    [-0.16, 0.085 * k, 0.11 * k], [-0.11, 0.112 * k, 0.16 * k], [-0.04, 0.118 * k, 0.168 * k], [0.03, 0.112 * k, 0.155 * k], [0.06, 0.108 * k, 0.15 * k],
  ], 10), pants);
  p.own(loft([[0.02, 0.116 * k, 0.156 * k], [0.065, 0.111 * k, 0.151 * k]], 10), shade(pants, 0.7)); // waistband
  return p.mesh();
}

// Hip (y 0) to knee (y THIGH).
function buildThigh(L) {
  const p = new Part(), k = L.build, long = L.legs === 'long', leg = long ? PANTS : L.skin;
  p.own(limbLoft([[-0.02, 0.084 * k], [0.1, 0.084 * k], [0.26, 0.07 * k], [0.38, 0.056 * k], [THIGH + 0.02, 0.05 * k]]), leg);
  if (!long) p.own(limbLoft([[-0.03, 0.092 * k], [0.12, 0.093 * k], [0.23, 0.087 * k]]), L.shorts); // short leg
  p.add(G.gem, leg, [0, THIGH, 0], [0, 0, 0], [0.053 * k, 0.055, 0.053 * k]); // knee
  return p.mesh();
}

// Knee (y 0) to ankle (y SHIN).
function buildShin(L) {
  const p = new Part(), k = L.build, long = L.legs === 'long', leg = long ? PANTS : L.skin;
  p.own(limbLoft([[0, 0.05 * k], [0.06, 0.057 * k], [0.15, 0.058 * k], [0.28, 0.042 * k], [SHIN - 0.04, 0.036 * k]]), leg);
  if (long) p.own(limbLoft([[0.25, 0.05 * k], [SHIN - 0.02, 0.048 * k]]), shade(PANTS, 0.85)); // trouser hem
  else p.own(limbLoft([[0.29, 0.043], [SHIN + 0.01, 0.042]]), '#f4f4f0'); // sock
  return p.mesh();
}

// A trainer: x is towards the toe, the ankle sits above the origin.
function buildFoot(L) {
  const p = new Part(), trim = L.shoes === '#f4f4f0' ? L.color : '#f4f4f0';
  // rings along the foot [x, half height, half width, centre height]
  const shoe = (rings) => loft(rings.map(([x, h, w, c]) => [x, h, w, -c]), 8);
  p.own(shoe([[-0.075, 0.03, 0.04, 0.055], [-0.055, 0.045, 0.05, 0.058], [0.02, 0.044, 0.05, 0.055], [0.1, 0.034, 0.046, 0.045], [0.165, 0.024, 0.036, 0.035], [0.19, 0.012, 0.02, 0.03]]),
    L.shoes, [0, 0, 0], [0, 0, -Math.PI / 2]);
  p.own(shoe([[-0.082, 0.012, 0.045, 0.014], [0.0, 0.013, 0.054, 0.013], [0.17, 0.011, 0.04, 0.013], [0.2, 0.008, 0.022, 0.014]]),
    trim, [0, 0, 0], [0, 0, -Math.PI / 2]); // sole
  return p.mesh();
}

// Shoulder (y 0) to elbow (y UPPER).
function buildUpperArm(L) {
  const p = new Part(), k = L.build, long = L.sleeves === 'long';
  p.own(limbLoft([[-0.02, 0.05 * k], [0.08, 0.05 * k], [0.18, 0.043 * k], [UPPER, 0.037 * k]]), long ? L.color : L.skin);
  if (!long) p.own(limbLoft([[-0.03, 0.064 * k], [0.08, 0.063 * k], [0.13, 0.06 * k]]), L.color); // sleeve
  p.add(G.gem, long ? L.color : L.skin, [0, UPPER, 0], [0, 0, 0], [0.038 * k, 0.038, 0.038 * k]); // elbow
  return p.mesh();
}

// Elbow (y 0) to the hand.
function buildForearm(L) {
  const p = new Part(), k = L.build, long = L.sleeves === 'long', wrist = FORE - 0.06;
  p.own(limbLoft([[0, 0.038 * k], [0.06, 0.042 * k], [0.18, 0.031 * k], [wrist, 0.026 * k]]), long ? L.color : L.skin);
  if (long) p.own(limbLoft([[wrist - 0.04, 0.036 * k], [wrist + 0.002, 0.035 * k]]), shade(L.color, 0.8)); // cuff
  p.add(G.ico, L.skin, [0, wrist + 0.045, 0], [0, 0, 0], [0.034, 0.052, 0.042]); // hand
  p.add(G.gem, L.skin, [0.028, wrist + 0.025, 0.018], [0, 0, 0.4], [0.014, 0.03, 0.014]); // thumb
  return p.mesh();
}

function numberDecal(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 96px Trebuchet MS, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = 'rgba(20,30,40,0.55)'; g.strokeText(String(n), 64, 70);
  g.fillStyle = '#ffffff'; g.fillText(String(n), 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshLambertMaterial({
    map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  m.position.set(-0.14, 0.3, 0);
  m.rotation.y = -Math.PI / 2;
  return m;
}

// ------------------------------------------------------------------- poses
// Key poses for a right-hander in the aim frame: a is towards the target, b towards
// the throwing side, c is height. Angles are degrees from the target line towards the
// throwing side. Left-handers are mirrored.
const POSES = {
  bh: {
    feet: [[0.36, 0.02, -75], [-0.36, -0.06, -95]],
    ready: { chest: -80, pelvis: -70, crouch: 0.04, shift: 0, lean: 6, hand: [0.12, -0.3, 1.12], off: [0.1, -0.34, 1.05] },
    back: { chest: -160, pelvis: -112, crouch: 0.11, shift: -0.6, lean: 10, hand: [-0.8, -0.1, 1.18], off: [0.42, -0.3, 1.22] },
    release: [
      [0.25, { chest: -60, pelvis: -50, crouch: 0.1, shift: 0.3, lean: 8, hand: [0.12, -0.22, 1.15], off: [0.22, -0.38, 1.1] }],
      [0.45, { chest: 0, pelvis: -15, crouch: 0.08, shift: 0.7, lean: 6, hand: [0.66, 0.12, 1.17], off: [-0.2, -0.36, 1.05] }],
      [1, { chest: 45, pelvis: 15, crouch: 0.05, shift: 0.85, lean: 4, hand: [0.25, 0.62, 1.35], off: [-0.3, -0.26, 1.0] }],
    ],
  },
  fh: {
    feet: [[-0.24, 0.2, 25], [0.3, -0.16, 10]],
    ready: { chest: 15, pelvis: 10, crouch: 0.05, shift: 0, lean: 6, hand: [0.12, 0.42, 1.0], off: [0.15, -0.3, 1.08] },
    back: { chest: 72, pelvis: 42, crouch: 0.1, shift: -0.5, lean: 10, hand: [-0.42, 0.55, 1.02], off: [0.34, -0.42, 1.26] },
    release: [
      [0.3, { chest: 40, pelvis: 25, crouch: 0.09, shift: 0.2, lean: 8, hand: [0.2, 0.52, 1.02], off: [0.25, -0.4, 1.18] }],
      [0.5, { chest: 0, pelvis: 0, crouch: 0.07, shift: 0.6, lean: 6, hand: [0.58, 0.3, 1.06], off: [0, -0.42, 1.08] }],
      [1, { chest: -35, pelvis: -15, crouch: 0.05, shift: 0.8, lean: 4, hand: [0.36, -0.2, 1.12], off: [-0.25, -0.34, 1.0] }],
    ],
  },
  oh: {
    feet: [[-0.28, 0.16, 30], [0.34, -0.12, 10]],
    ready: { chest: 30, pelvis: 22, crouch: 0.04, shift: 0, lean: 2, hand: [0, 0.27, 1.72], off: [0.3, -0.25, 1.32] },
    back: { chest: 78, pelvis: 42, crouch: 0.08, shift: -0.5, lean: -4, hand: [-0.38, 0.25, 1.82], off: [0.45, -0.26, 1.5] },
    release: [
      [0.35, { chest: 20, pelvis: 15, crouch: 0.07, shift: 0.3, lean: 6, hand: [0.26, 0.22, 1.95], off: [0.1, -0.34, 1.2] }],
      [0.6, { chest: -12, pelvis: -5, crouch: 0.06, shift: 0.7, lean: 14, hand: [0.55, 0.12, 1.5], off: [-0.1, -0.32, 1.05] }],
      [1, { chest: -40, pelvis: -18, crouch: 0.06, shift: 0.85, lean: 18, hand: [0.42, -0.1, 0.95], off: [-0.25, -0.3, 1.0] }],
    ],
  },
  putt: {
    feet: [[0.06, 0.2, 5], [-0.04, -0.2, -5]],
    ready: { chest: 0, pelvis: 0, crouch: 0.12, shift: 0, lean: 14, hand: [0.42, 0.07, 1.08], off: [0.12, -0.3, 0.92] },
    back: { chest: -8, pelvis: 0, crouch: 0.18, shift: -0.25, lean: 18, hand: [0.14, 0.06, 1.04], off: [0.16, -0.32, 0.95] },
    release: [
      [0.4, { chest: 0, pelvis: 0, crouch: 0.09, shift: 0.25, lean: 12, hand: [0.58, 0.07, 1.2], off: [0.1, -0.32, 0.95] }],
      [1, { chest: 4, pelvis: 0, crouch: 0.05, shift: 0.35, lean: 8, hand: [0.62, 0.08, 1.38], off: [0.06, -0.3, 0.98] }],
    ],
  },
  idle: {
    feet: [[0.02, 0.15, 6], [-0.02, -0.15, -6]],
    ready: { chest: 0, pelvis: 0, crouch: 0.02, shift: 0, lean: 2, hand: [0.03, 0.27, 0.86], off: [0.03, -0.27, 0.86] },
  },
};

const NUMS = ['chest', 'pelvis', 'crouch', 'shift', 'lean'];
const copyPose = (p) => ({ ...p, hand: [...p.hand], off: [...p.off], feet: p.feet.map((f) => [...f]) });
const ease = (t) => t * t * (3 - 2 * t);

function blend(a, b, t, out) {
  for (const k of NUMS) out[k] = a[k] + (b[k] - a[k]) * t;
  for (let i = 0; i < 3; i++) {
    out.hand[i] = a.hand[i] + (b.hand[i] - a.hand[i]) * t;
    out.off[i] = a.off[i] + (b.off[i] - a.off[i]) * t;
  }
  for (let f = 0; f < 2; f++) for (let i = 0; i < 3; i++) out.feet[f][i] = a.feet[f][i] + (b.feet[f][i] - a.feet[f][i]) * t;
  return out;
}

// Two-bone IK: place the elbow (or knee) so the chain reaches from S towards T.
const _d = new THREE.Vector3(), _pp = new THREE.Vector3();
function solve(S, T, L1, L2, pole, outJ, outE) {
  _d.subVectors(T, S);
  const dist = Math.min(Math.max(_d.length(), Math.abs(L1 - L2) + 0.01), (L1 + L2) * 0.999);
  _d.normalize();
  outE.copy(S).addScaledVector(_d, dist);
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  _pp.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_pp.lengthSq() < 1e-6) _pp.set(0, -1, 0);
  _pp.normalize();
  outJ.copy(S).addScaledVector(_d, a).addScaledVector(_pp, h);
}

const _dir = new THREE.Vector3();
function place(mesh, A, B) {
  mesh.position.copy(A);
  mesh.quaternion.setFromUnitVectors(UP, _dir.subVectors(B, A).normalize());
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const F = new THREE.Vector3(), B = new THREE.Vector3();
const V = () => new THREE.Vector3();

export class Avatar {
  constructor(scene, look) {
    this.scene = scene;
    this.look = look;
    this.side = look.hand === 'L' ? -1 : 1;
    this.group = new THREE.Group();
    this.pelvis = buildPelvis(look);
    this.torso = buildTorso(look, this.side);
    this.torso.add(numberDecal(look.number));
    this.head = buildHead(look);
    this.upper = [buildUpperArm(look), buildUpperArm(look)];
    this.fore = [buildForearm(look), buildForearm(look)];
    this.thigh = [buildThigh(look), buildThigh(look)];
    this.shin = [buildShin(look), buildShin(look)];
    this.foot = [buildFoot(look), buildFoot(look)];
    this.held = new THREE.Mesh(discGeometry(), new THREE.MeshLambertMaterial({ color: look.color, side: THREE.DoubleSide }));
    this.held.castShadow = true;
    this.group.add(this.pelvis, this.torso, this.head, ...this.upper, ...this.fore, ...this.thigh, ...this.shin, ...this.foot, this.held);
    this.group.visible = false;
    scene.add(this.group);

    this.cur = copyPose({ ...POSES.idle.ready, feet: POSES.idle.feet });
    this.tmp = copyPose(this.cur);
    this.release = 1;
    this.thrown = false;
    this.snapshot = null;
    this.time = Math.random() * 10;
    this.headYaw = 0;
    this.headPitch = 0;
    this.v = { hip: [V(), V()], knee: V(), ankle: V(), sh: [V(), V()], elbow: V(), wrist: V(), target: V(), pole: V(), neck: V() };
  }

  // Called when the disc leaves the hand: play the release from wherever the arm is.
  startThrow() {
    this.snapshot = copyPose(this.cur);
    this.release = 0;
    this.thrown = true;
  }

  hide() { this.group.visible = false; }

  // See-through and shadowless, for a replayed ghost player.
  ghostly() {
    this.group.traverse((o) => {
      if (!o.material) return;
      o.material = o.material.clone(); // the body material is shared, so the ghost gets its own
      Object.assign(o.material, { transparent: true, opacity: 0.38, depthWrite: false });
      o.material.emissive?.set('#3a5a8a');
      o.castShadow = false;
    });
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material && o.material !== BODY) { o.material.map?.dispose(); o.material.dispose(); }
    });
  }

  /**
   * o: { x, z, yaw, kind: 'bh' | 'fh' | 'oh' | 'putt' | 'idle', phase: 'aim' | 'throw' | 'idle',
   *      pull, tilt, look: {x, y, z} | null, heightAt(x, z) }
   */
  pose(o, dt) {
    this.group.visible = true;
    this.time += dt;
    const def = POSES[o.kind] ?? POSES.idle, target = this.tmp;
    if (o.phase === 'throw') {
      // release: run the throw's key poses, starting from the pose at the moment of release
      this.release = Math.min(1, this.release + dt * 2.1);
      const track = [[0, this.snapshot ?? { ...def.back, feet: def.feet }], ...def.release];
      let k = 1;
      while (k < track.length - 1 && this.release > track[k][0]) k++;
      const [t0, a] = track[k - 1], [t1, b] = track[k];
      const u = ease(Math.min(1, Math.max(0, (this.release - t0) / (t1 - t0))));
      blend(withFeet(a, def), withFeet(b, def), u, target);
      copyInto(target, this.cur);
    } else {
      const ready = withFeet(def.ready, def);
      if (def.back) blend(ready, withFeet(def.back, def), ease(o.pull || 0), target);
      else copyInto(ready, target);
      // breathing and the odd shift of weight
      target.crouch += Math.sin(this.time * 2.1) * 0.006;
      if (o.phase === 'idle') target.shift += Math.sin(this.time * 0.37) * 0.25;
      blend(this.cur, target, 1 - Math.exp(-14 * dt), this.cur);
    }
    this.apply(o, def, dt);
  }

  apply(o, def, dt) {
    const c = this.cur, s = this.side, v = this.v;
    const yaw = o.yaw;
    F.set(Math.cos(yaw), 0, Math.sin(yaw));
    B.set(-Math.sin(yaw) * s, 0, Math.cos(yaw) * s);
    const at = (a, b, out) => out.set(o.x + F.x * a + B.x * b, 0, o.z + F.z * a + B.z * b);

    // feet on the ground (throwing-side foot first)
    const ground = o.heightAt(o.x, o.z);
    for (let k = 0; k < 2; k++) {
      const [a, b, yd] = c.feet[k];
      at(a, b, this.foot[k].position);
      this.foot[k].position.y = o.heightAt(this.foot[k].position.x, this.foot[k].position.z);
      this.foot[k].rotation.set(0, -(yaw + s * yd * DEG), 0);
    }

    // pelvis between the feet, weighted towards the front or back foot
    const [fa, fb] = c.feet, front = fa[0] >= fb[0] ? fa : fb, back = front === fa ? fb : fa;
    const w = 0.5 + c.shift * 0.32;
    const pel = at(back[0] + (front[0] - back[0]) * w, back[1] + (front[1] - back[1]) * w, this.pelvis.position);
    const pYaw = yaw + s * c.pelvis * DEG, cYaw = yaw + s * c.chest * DEG;
    const rx = -Math.sin(pYaw), rz = Math.cos(pYaw); // the character's right
    let hipY = ground + PELVIS_H - 0.06 - c.crouch;
    for (let k = 0; k < 2; k++) {
      const sign = k === 0 ? s : -s, ft = this.foot[k].position;
      const hx = pel.x + rx * 0.1 * sign, hz = pel.z + rz * 0.1 * sign;
      const d = Math.hypot(ft.x - hx, ft.z - hz), reach = (THIGH + SHIN) * 0.97;
      hipY = Math.min(hipY, ft.y + ANKLE + Math.sqrt(Math.max(0, reach * reach - d * d)));
    }
    pel.y = hipY + 0.06;
    this.pelvis.rotation.set(0, -pYaw, 0);
    this.torso.position.copy(pel);
    this.torso.rotation.set(0, -cYaw, -c.lean * DEG, 'YXZ');
    this.torso.updateMatrixWorld();
    this.pelvis.updateMatrixWorld();

    // legs: knees bend forwards over the feet
    for (let k = 0; k < 2; k++) {
      const sign = k === 0 ? s : -s, ft = this.foot[k].position, fy = this.foot[k].rotation.y;
      v.hip[k].set(0, -0.06, 0.1 * sign).applyMatrix4(this.pelvis.matrixWorld);
      v.ankle.set(ft.x, ft.y + ANKLE, ft.z);
      v.pole.set(Math.cos(-fy), 0.15, Math.sin(-fy));
      solve(v.hip[k], v.ankle, THIGH, SHIN, v.pole, v.knee, v.target);
      place(this.thigh[k], v.hip[k], v.knee);
      place(this.shin[k], v.knee, v.target);
    }

    // arms reach for the pose's hand targets
    const drop = pel.y - ground - PELVIS_H;
    const cx = Math.cos(cYaw), cz = Math.sin(cYaw); // chest facing
    for (let k = 0; k < 2; k++) {
      const sign = k === 0 ? s : -s, h = k === 0 ? c.hand : c.off;
      v.sh[k].set(0, 0.45, 0.205 * sign).applyMatrix4(this.torso.matrixWorld);
      at(h[0], h[1], v.target).add(_p.set(pel.x - o.x, 0, pel.z - o.z));
      v.target.y = ground + drop + h[2];
      // elbows hang down and out; a forehand tucks the elbow back, an overhand lifts it
      const out = sign; // the shoulder's outward side, as the character's right (+) or left (-)
      v.pole.set(-cz * out * 0.6, -1, cx * out * 0.6);
      if (k === 0 && o.kind === 'fh') v.pole.set(-cx * 0.5, -1, -cz * 0.5);
      if (k === 0 && o.kind === 'oh') v.pole.set(-cz * out, 0.4, cx * out);
      solve(v.sh[k], v.target, UPPER, FORE, v.pole, v.elbow, v.wrist);
      place(this.upper[k], v.sh[k], v.elbow);
      place(this.fore[k], v.elbow, v.wrist);
      if (k === 0) {
        // the disc sits in the throwing hand
        _dir.subVectors(v.wrist, v.elbow).normalize();
        this.held.position.copy(v.wrist).addScaledVector(_dir, -0.01);
        if (o.kind === 'idle') {
          this.held.position.addScaledVector(B, 0.06);
          this.held.quaternion.setFromUnitVectors(UP, B);
        } else if (o.kind === 'oh') {
          this.held.quaternion.setFromUnitVectors(UP, _p.copy(B).multiplyScalar(-1));
        } else {
          const t = o.tilt || 0;
          this.held.quaternion.setFromUnitVectors(UP, _p.copy(UP).multiplyScalar(Math.cos(t)).addScaledVector(B, -Math.sin(t)));
          this.held.position.addScaledVector(F, 0.07);
        }
      }
    }

    // the head turns to watch whatever matters: the target, the thrower, the disc
    v.neck.set(0, 0.6, 0).applyMatrix4(this.torso.matrixWorld);
    let hy = 0, hp = 0;
    if (o.look) {
      hy = Math.max(-1.25, Math.min(1.25, wrap(Math.atan2(o.look.z - v.neck.z, o.look.x - v.neck.x) - cYaw)));
      hp = Math.max(-0.6, Math.min(0.5, Math.atan2(o.look.y - v.neck.y - 0.15, Math.hypot(o.look.x - v.neck.x, o.look.z - v.neck.z))));
    }
    const k = 1 - Math.exp(-8 * dt);
    this.headYaw += (hy - this.headYaw) * k;
    this.headPitch += (hp - this.headPitch) * k;
    this.head.position.copy(v.neck);
    this.head.rotation.set(0, -(cYaw + this.headYaw), this.headPitch, 'YXZ');
  }
}

function withFeet(p, def) {
  return p.feet ? p : { ...p, feet: def.feet };
}

function copyInto(src, out) {
  for (const k of NUMS) out[k] = src[k];
  for (let i = 0; i < 3; i++) { out.hand[i] = src.hand[i]; out.off[i] = src.off[i]; }
  for (let f = 0; f < 2; f++) for (let i = 0; i < 3; i++) out.feet[f][i] = src.feet[f][i];
  return out;
}

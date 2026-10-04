// Cartoon disc golfers. Each player gets their own look (skin, hair, hat, a jersey in
// their colour with their number on the back, a disc bag) and a procedural rig:
// two-bone IK for arms and legs, a twisting torso and a head that follows the action.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { discGeometry } from './actors.js';

const UP = new THREE.Vector3(0, 1, 0);
const DEG = Math.PI / 180;
const THIGH = 0.44, SHIN = 0.42, ANKLE = 0.09, UPPER = 0.27, FORE = 0.29;
const PELVIS_H = 0.94; // pelvis height for a player standing tall

const SKINS = ['#f1c7a1', '#c98e63', '#e3ad86', '#8a5a3b', '#f6d6bd', '#6e4630'];
const HAIRS = ['#2b1d14', '#e3c26b', '#5a3a22', '#121212', '#a8743a', '#8a2f1e'];
const SHORTS = ['#2f3b4c', '#c9b48a', '#3d4a3a', '#55595f'];
const SHOES = ['#f4f4f0', '#2f3640', '#e94f37', '#3b82f6'];
const STYLES = [
  { hat: 'cap', hair: 'short' },
  { hat: 'visor', hair: 'ponytail' },
  { hat: 'bucket', hair: 'long' },
  { hat: 'none', hair: 'curly' },
];

export function playerLook(index, player, weather) {
  const s = STYLES[index % STYLES.length], cold = weather === 'snow';
  return {
    color: player.color, hand: player.hand, number: index + 1,
    skin: SKINS[index % SKINS.length], hairColor: HAIRS[index % HAIRS.length],
    shorts: SHORTS[index % SHORTS.length], shoes: SHOES[index % SHOES.length],
    hair: s.hair, hat: cold ? 'beanie' : s.hat, sleeves: cold ? 'long' : 'short', legs: cold ? 'long' : 'short',
  };
}

// ---------------------------------------------------------------- geometry
const BODY = new THREE.MeshLambertMaterial({ vertexColors: true });
const G = {
  sphere: new THREE.SphereGeometry(1, 18, 12),
  dome: new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  hair: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  band: new THREE.CylinderGeometry(1, 1, 1, 18, 1, true),
  chest: new THREE.CylinderGeometry(1, 0.86, 1, 18),
  crown: new THREE.CylinderGeometry(0.93, 1, 1, 18),
  box: new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.TorusGeometry(1, 0.25, 8, 22),
  smile: new THREE.TorusGeometry(1, 0.22, 5, 12, Math.PI),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

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

  // A rod between two local points.
  rod(color, a, b, r) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A), len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add(G.cyl, color, A.add(B).multiplyScalar(0.5).toArray(), [e.x, e.y, e.z], [r, len, r]);
  }

  // A tapering limb segment from y = from*len to y = to*len, radius r0 at the joint end.
  limb(len, r0, r1, color, from = 0, to = 1, grow = 0) {
    const h = len * (to - from), ra = r0 + (r1 - r0) * from + grow, rb = r0 + (r1 - r0) * to + grow;
    return this.add(new THREE.CylinderGeometry(rb, ra, h, 14), color, [0, len * from + h / 2, 0]);
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

function buildHead(L) {
  const p = new Part(), skin = L.skin, hair = L.hairColor;
  const C = (x, y, z) => [x, 0.15 + y, z]; // relative to the centre of the skull
  p.add(G.sphere, skin, C(0, 0, 0), [0, 0, 0], [0.148, 0.158, 0.143]);
  p.add(G.sphere, skin, C(0.03, -0.07, 0), [0, 0, 0], [0.112, 0.085, 0.112]);
  for (const s of [-1, 1]) {
    p.add(G.sphere, skin, C(-0.005, -0.005, s * 0.143), [0, 0, 0], [0.026, 0.04, 0.02]);
    p.add(G.sphere, '#ffffff', C(0.128, 0.018, s * 0.052), [0, 0, 0], [0.016, 0.031, 0.027]);
    p.add(G.sphere, '#1d2430', C(0.14, 0.016, s * 0.054), [0, 0, 0], [0.009, 0.019, 0.017]);
    p.add(G.box, hair, C(0.137, 0.058, s * 0.056), [s * 0.18, 0, 0], [0.014, 0.012, 0.052]);
    p.add(G.sphere, mixc(skin, '#ff6b6b', 0.35), C(0.118, -0.035, s * 0.085), [0, 0, 0], [0.01, 0.022, 0.028]);
  }
  p.add(G.sphere, shade(skin, 0.92), C(0.146, -0.02, 0), [0, 0, 0], [0.024, 0.03, 0.022]);
  p.add(G.smile, '#7a3b34', C(0.138, -0.052, 0), [0, Math.PI / 2, Math.PI], [0.032, 0.032, 0.032]);

  // hair
  if (L.hair !== 'none') p.add(G.hair, hair, C(-0.008, 0.006, 0), [0, 0, 0.55], [0.156, 0.166, 0.151]);
  if (L.hair === 'ponytail') {
    p.add(G.sphere, hair, C(-0.15, 0.03, 0), [0, 0, 0], [0.045, 0.045, 0.045]);
    p.rod(hair, C(-0.165, 0.02, 0), C(-0.2, -0.15, 0), 0.032);
    p.add(G.sphere, hair, C(-0.2, -0.15, 0), [0, 0, 0], [0.03, 0.03, 0.03]);
  } else if (L.hair === 'long') {
    p.add(G.sphere, hair, C(-0.105, -0.1, 0), [0, 0, 0], [0.065, 0.15, 0.14]);
    for (const s of [-1, 1]) p.add(G.sphere, hair, C(-0.03, -0.08, s * 0.128), [0, 0, 0], [0.05, 0.11, 0.03]);
  } else if (L.hair === 'curly') {
    for (let i = 0; i < 18; i++) {
      const th = 0.15 + (i % 3) * 0.42 + (i % 2) * 0.1, ph = (i / 18) * Math.PI * 2;
      const dir = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      if (th > 0.6 && dir[0] > 0.25) continue; // keep the face clear
      p.add(G.sphere, hair, C(dir[0] * 0.152, dir[1] * 0.16, dir[2] * 0.146), [0, 0, 0], [0.05, 0.05, 0.05]);
    }
  }

  // hats
  const hat = shade(L.color, 0.78);
  if (L.hat === 'cap') {
    p.add(G.dome, hat, C(-0.005, 0.03, 0), [0, 0, 0], [0.16, 0.13, 0.156]);
    p.add(G.sphere, hat, C(-0.005, 0.158, 0), [0, 0, 0], [0.015, 0.012, 0.015]);
    p.add(G.cyl, hat, C(0.155, 0.035, 0), [0, 0, -0.14], [0.105, 0.012, 0.125]);
  } else if (L.hat === 'visor') {
    p.add(G.band, hat, C(0, 0.055, 0), [0, 0, 0.12], [0.156, 0.045, 0.152]);
    p.add(G.cyl, hat, C(0.16, 0.04, 0), [0, 0, -0.16], [0.105, 0.012, 0.125]);
  } else if (L.hat === 'bucket') {
    p.add(G.crown, '#c9b48a', C(0, 0.085, 0), [0, 0, 0], [0.162, 0.12, 0.158]);
    p.add(G.cyl, '#c9b48a', C(0, 0.145, 0), [0, 0, 0], [0.151, 0.012, 0.147]);
    p.add(G.cyl, '#b9a47a', C(0, 0.03, 0), [0, 0, 0], [0.235, 0.012, 0.23]);
    p.add(G.band, shade(L.color, 0.9), C(0, 0.045, 0), [0, 0, 0], [0.165, 0.025, 0.161]);
  } else if (L.hat === 'beanie') {
    p.add(G.dome, L.color, C(-0.005, 0.02, 0), [0, 0, 0], [0.163, 0.178, 0.159]);
    p.add(G.cyl, '#f4f4f0', C(-0.005, 0.035, 0), [0, 0, 0], [0.166, 0.055, 0.162]);
    p.add(G.sphere, '#f4f4f0', C(-0.005, 0.205, 0), [0, 0, 0], [0.042, 0.042, 0.042]);
  }
  return p.mesh();
}

function buildTorso(L, side) {
  const p = new Part(), shirt = L.color, skin = L.skin;
  p.add(G.sphere, shirt, [0, 0.1, 0], [0, 0, 0], [0.15, 0.13, 0.188]);
  p.add(G.chest, shirt, [0, 0.28, 0], [0, 0, 0], [0.155, 0.3, 0.2]);
  p.add(G.sphere, shirt, [0, 0.43, 0], [0, 0, 0], [0.152, 0.1, 0.205]);
  for (const s of [-1, 1]) p.add(G.sphere, shirt, [0, 0.45, s * 0.2], [0, 0, 0], [0.072, 0.072, 0.072]);
  p.add(G.ring, '#f4f4f0', [0.005, 0.53, 0], [Math.PI / 2, 0, 0], [0.068, 0.068, 0.068]);
  p.add(G.cyl, skin, [0, 0.59, 0], [0, 0, 0], [0.05, 0.12, 0.05]);
  // disc bag on the off-side hip, strap over the throwing shoulder
  const bz = -side * 0.27;
  p.add(G.box, '#2f3640', [-0.02, 0.06, bz], [0, 0, 0], [0.3, 0.34, 0.14]);
  p.add(G.box, shirt, [-0.02, 0.16, bz], [0, 0, 0], [0.302, 0.06, 0.142]);
  ['#ff7a3d', '#3b82f6', '#f4c20d'].forEach((c, i) => p.add(G.cyl, c, [-0.1 + i * 0.08, 0.23, bz + (i - 1) * 0.03], [Math.PI / 2, 0, 0], [0.1, 0.02, 0.1]));
  for (const x of [0.135, -0.135]) p.rod('#2f3640', [x, 0.22, -side * 0.2], [x * 0.85, 0.5, side * 0.12], 0.013);
  return p.mesh();
}

function buildPelvis(L) {
  const p = new Part(), pants = L.legs === 'long' ? '#3a4150' : L.shorts;
  p.add(G.sphere, pants, [0, -0.03, 0], [0, 0, 0], [0.16, 0.13, 0.205]);
  p.add(G.cyl, shade(pants, 0.75), [0, 0.07, 0], [0, 0, 0], [0.154, 0.045, 0.197]);
  return p.mesh();
}

function buildThigh(L) {
  const p = new Part(), long = L.legs === 'long', pants = long ? '#3a4150' : L.shorts;
  p.limb(THIGH, 0.074, 0.058, long ? pants : L.skin);
  if (!long) p.limb(THIGH, 0.074, 0.058, pants, 0, 0.5, 0.016);
  p.add(G.sphere, long ? pants : L.skin, [0, THIGH, 0], [0, 0, 0], [0.058, 0.058, 0.058]);
  return p.mesh();
}

function buildShin(L) {
  const p = new Part(), long = L.legs === 'long';
  const leg = long ? '#3a4150' : L.skin;
  p.limb(SHIN, 0.056, 0.044, leg);
  p.add(G.sphere, leg, [0, 0.13, 0], [0, 0, 0], [0.063, 0.12, 0.063]);
  p.limb(SHIN, 0.056, 0.044, '#f4f4f0', 0.74, 1, long ? 0.002 : 0.006);
  p.add(G.sphere, '#f4f4f0', [0, SHIN, 0], [0, 0, 0], [0.047, 0.047, 0.047]);
  return p.mesh();
}

function buildFoot(L) {
  const p = new Part();
  p.add(G.box, '#f4f4f0', [0.055, 0.018, 0], [0, 0, 0], [0.28, 0.036, 0.116]);
  p.add(G.sphere, L.shoes, [0.065, 0.058, 0], [0, 0, 0], [0.13, 0.06, 0.058]);
  p.add(G.sphere, L.shoes, [-0.045, 0.066, 0], [0, 0, 0], [0.062, 0.06, 0.056]);
  p.add(G.box, L.shoes === '#f4f4f0' ? L.color : '#f4f4f0', [0.03, 0.05, 0], [0, 0, 0], [0.16, 0.018, 0.118]);
  return p.mesh();
}

function buildUpperArm(L) {
  const p = new Part(), long = L.sleeves === 'long';
  p.limb(UPPER, 0.05, 0.043, long ? L.color : L.skin);
  if (!long) p.limb(UPPER, 0.05, 0.043, L.color, 0, 0.48, 0.016);
  p.add(G.sphere, long ? L.color : L.skin, [0, UPPER, 0], [0, 0, 0], [0.044, 0.044, 0.044]);
  return p.mesh();
}

function buildForearm(L) {
  const p = new Part(), long = L.sleeves === 'long', wrist = FORE - 0.06;
  p.limb(wrist, 0.043, 0.035, long ? L.color : L.skin);
  if (long) p.limb(wrist, 0.043, 0.035, shade(L.color, 0.8), 0.82, 1, 0.007);
  p.add(G.sphere, L.skin, [0, wrist + 0.05, 0], [0, 0, 0], [0.042, 0.06, 0.05]);
  p.add(G.sphere, L.skin, [0.03, wrist + 0.03, 0.02], [0, 0, 0], [0.018, 0.03, 0.018]);
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshLambertMaterial({
    map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  m.position.set(-0.152, 0.31, 0);
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
    this.head.scale.setScalar(1.1); // a slightly big head reads as friendlier
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

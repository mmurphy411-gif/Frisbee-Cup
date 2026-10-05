// Everything that stands on the ground: houses, trees, cars, fences, decks and
// bridges, park furniture, tee pads and signs, and the baskets.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundHeight } from '../sim/terrain.js';
import { BASKET } from '../sim/flight.js';
import { mulberry32 } from '../sim/rng.js';
import { Merge } from './merge.js';
import { U, enhance } from './shared.js';

const CAR_COLORS = ['#d9534f', '#3b7dd8', '#f2f2f2', '#2f3640', '#e6b422', '#4caf7d', '#8e44ad', '#c0c4c8'];
const FOUNDATION = '#a39a8c';
const WOOD = '#a07a52', WOOD_DARK = '#6e5238';
const _c = new THREE.Color();

function labelSprite(text, bg, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d'), r = size / 2;
  g.fillStyle = bg;
  g.beginPath(); g.arc(r, r, r * 0.9, 0, Math.PI * 2); g.fill();
  g.lineWidth = size / 16; g.strokeStyle = '#ffffff'; g.stroke();
  g.fillStyle = '#ffffff'; g.font = `bold ${size * 0.58}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, r, r * 1.08);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
}

// ------------------------------------------------------------------ houses
function roof(M, h, wallColor) {
  const top = h.base + h.wallH, ov = 0.45;
  const y0 = top - (h.roofH * ov) / h.hv, y1 = top + h.roofH;
  const Uo = h.hu + ov, Wo = h.hv + ov, rr = h.roof === 'hip' ? Math.max(0, h.hu - h.hv) : Uo;
  const L = (u, y, w) => [h.cx + u * h.cos - w * h.sin, y, h.cz + u * h.sin + w * h.cos];
  const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
  const t = [
    ...quad(L(-Uo, y0, Wo), L(Uo, y0, Wo), L(rr, y1, 0), L(-rr, y1, 0)),
    ...quad(L(Uo, y0, -Wo), L(-Uo, y0, -Wo), L(-rr, y1, 0), L(rr, y1, 0)),
  ];
  if (h.roof === 'hip') {
    t.push(...L(Uo, y0, -Wo), ...L(rr, y1, 0), ...L(Uo, y0, Wo));
    t.push(...L(-Uo, y0, Wo), ...L(-rr, y1, 0), ...L(-Uo, y0, -Wo));
  } else if (wallColor) {
    M.walls.tris([...L(h.hu, top, -h.hv), ...L(h.hu, y1, 0), ...L(h.hu, top, h.hv)], wallColor);
    M.walls.tris([...L(-h.hu, top, h.hv), ...L(-h.hu, y1, 0), ...L(-h.hu, top, -h.hv)], wallColor);
  }
  M.roofs.tris(t, h.roofColor);
  const trim = h.trim ?? '#ffffff';
  for (const s of [-1, 1]) M.detail.local(h, 'box', 0, y0 - 0.07, s * (Wo - 0.04), Uo * 2, 0.16, 0.08, trim);
  if (h.roof === 'hip') for (const s of [-1, 1]) M.detail.local(h, 'box', s * (Uo - 0.04), y0 - 0.07, 0, 0.08, 0.16, Wo * 2, trim);
  if (rr > 0.2) M.roofs.local(h, 'box', 0, y1 + 0.02, 0, rr * 2, 0.12, 0.3, _c.set(h.roofColor).multiplyScalar(0.75).getStyle());
  return { y0, y1, top };
}

function windowAt(M, h, u, y, w, axis, sign, shutter) {
  const o = (k) => sign * k;
  if (axis === 'w') {
    M.detail.local(h, 'box', u, y, w + o(0.03), 1.46, 1.36, 0.08, h.trim);
    M.glass.local(h, 'box', u, y, w + o(0.05), 1.18, 1.08, 0.06, '#ffffff');
    M.detail.local(h, 'box', u, y, w + o(0.085), 0.06, 1.08, 0.04, h.trim);
    M.detail.local(h, 'box', u, y, w + o(0.085), 1.18, 0.06, 0.04, h.trim);
    M.detail.local(h, 'box', u, y - 0.72, w + o(0.09), 1.62, 0.08, 0.2, h.trim);
    if (shutter) for (const s of [-1, 1]) M.detail.local(h, 'box', u + s * 0.94, y, w + o(0.05), 0.36, 1.3, 0.05, shutter);
  } else {
    M.detail.local(h, 'box', u + o(0.03), y, w, 0.08, 1.36, 1.46, h.trim);
    M.glass.local(h, 'box', u + o(0.05), y, w, 0.06, 1.08, 1.18, '#ffffff');
    M.detail.local(h, 'box', u + o(0.085), y, w, 0.04, 1.08, 0.06, h.trim);
    M.detail.local(h, 'box', u + o(0.085), y, w, 0.04, 0.06, 1.18, h.trim);
    M.detail.local(h, 'box', u + o(0.09), y - 0.72, w, 0.2, 0.08, 1.62, h.trim);
  }
}

function house(M, h, rng, decor, sprites) {
  const top = h.base + h.wallH, height = top - h.low;
  const wall = h.home ? '#ffd166' : h.wall;
  M.walls.local(h, 'box', 0, h.low + height / 2, 0, h.hu * 2, height, h.hv * 2, wall);
  const fh = h.base + 0.32 - h.low;
  M.detail.local(h, 'box', 0, h.low + fh / 2, 0, h.hu * 2 + 0.12, fh, h.hv * 2 + 0.12, h.kind === 'boathouse' ? '#6b5a48' : FOUNDATION);
  const r = roof(M, h, wall);
  const out = (d) => h.front * (h.hv + d);

  if (h.kind === 'garage') {
    const gw = h.hu * 2 - 1.3;
    M.detail.local(h, 'box', 0, h.base + 1.12, out(0.02), gw + 0.24, 2.36, 0.06, h.trim);
    M.detail.local(h, 'box', 0, h.base + 1.05, out(0.05), gw, 2.1, 0.06, '#efeee8');
    for (let k = 1; k < 4; k++) M.detail.local(h, 'box', 0, h.base + k * 0.52, out(0.085), gw, 0.04, 0.02, '#c9c7bd');
    return;
  }
  if (h.kind === 'boathouse') {
    const span = h.hv * 2 - 1.2, a = Math.atan2(2.6, span);
    M.detail.local(h, 'box', h.hu + 0.03, h.base + 1.4, 0, 0.06, 2.8, span, '#f4f1ea');
    for (const s of [-1, 1]) M.detail.local(h, 'box', h.hu + 0.07, h.base + 1.4, 0, 0.05, 0.14, Math.hypot(2.6, span), '#b5452f', s * a);
    for (const s of [-1, 1]) for (const u of [-0.45, 0.1]) windowAt(M, h, u * h.hu, h.base + 1.9, s * h.hv, 'w', s, null);
    return;
  }

  // front door, its frame and step
  M.detail.local(h, 'box', h.doorU, h.base + 1.12, out(0.02), 1.32, 2.34, 0.06, h.trim);
  M.detail.local(h, 'box', h.doorU, h.base + 1.05, out(0.05), 1.0, 2.1, 0.06, h.door);
  M.detail.local(h, 'box', h.doorU + 0.32, h.base + 1.0, out(0.1), 0.08, 0.08, 0.06, '#d9b45a');
  if (!h.porch) M.detail.local(h, 'box', h.doorU, h.base - 0.1, out(0.55), 1.7, 0.3, 1.1, '#c4bfb2');

  for (let floor = 0; floor < h.stories; floor++) {
    const y = h.base + 1.55 + floor * 2.6;
    for (const k of [-0.62, -0.2, 0.2, 0.62]) {
      const u = k * h.hu;
      if (floor === 0 && Math.abs(u - h.doorU) < 1.35) continue;
      windowAt(M, h, u, y, h.front * h.hv, 'w', h.front, h.shutters);
      windowAt(M, h, u, y, -h.front * h.hv, 'w', -h.front, null);
    }
    for (const s of [-1, 1]) {
      if (h.garage && h.garage.side === s && floor === 0) continue;
      for (const k of h.hv > 4.3 ? [-0.42, 0.42] : [0]) windowAt(M, h, s * h.hu, y, k * h.hv, 'u', s, null);
    }
  }

  if (h.balcony) {
    const deep = h.balcony === 'gallery' ? 2.6 : 1.1, iron = '#1d1e22';
    for (let floor = 1; floor < h.stories; floor++) {
      const y = h.base + floor * 2.6 + 0.15;
      M.detail.local(h, 'box', 0, y - 0.08, out(deep / 2), h.hu * 2, 0.16, deep, '#8a8378');
      for (const ry of [0.98, 0.12]) M.detail.local(h, 'box', 0, y + ry, out(deep - 0.04), h.hu * 2, 0.06, 0.06, iron);
      for (let u = -h.hu + 0.05; u <= h.hu; u += 0.42) M.detail.local(h, 'box', u, y + 0.55, out(deep - 0.04), 0.035, 0.9, 0.035, iron);
      for (const s of [-1, 1]) M.detail.local(h, 'box', s * (h.hu - 0.03), y + 0.55, out(deep / 2), 0.04, 0.9, deep, iron);
      if (h.balcony === 'gallery' && floor === h.stories - 1) {
        M.roofs.local(h, 'box', 0, y + 2.45, out(deep / 2), h.hu * 2 + 0.2, 0.1, deep + 0.2, h.roofColor);
      }
    }
    if (h.balcony === 'gallery') {
      const n = Math.max(1, Math.round((h.hu * 2) / 3));
      for (let k = 0; k <= n; k++) {
        const u = -h.hu + 0.2 + (k * (h.hu * 2 - 0.4)) / n;
        const topY = h.base + (h.stories - 1) * 2.6 + 2.5;
        M.detail.local(h, 'box', u, (h.low + topY) / 2, out(deep - 0.12), 0.12, topY - h.low, 0.12, iron);
      }
    }
  }

  if (h.chimney) {
    const cu = -Math.sign(h.doorU || 1) * h.hu * 0.5, cw = -h.front * h.hv * 0.35;
    const yr = top + h.roofH * 0.65, y2 = r.y1 + 0.7;
    M.detail.local(h, 'box', cu, (yr - 0.5 + y2) / 2, cw, 0.8, y2 - yr + 0.5, 0.8, '#9a5b47');
    M.detail.local(h, 'box', cu, y2 + 0.06, cw, 0.96, 0.12, 0.96, '#5b4a42');
  }

  if (h.porch) {
    const p = h.porch, wc = h.front * (h.hv + p.depth / 2);
    M.detail.local(h, 'box', p.u, h.base - 0.06, wc, p.width, 0.32, p.depth, '#bdb6a6');
    for (const s of [-1, 1]) M.detail.local(h, 'box', p.u + s * (p.width / 2 - 0.15), h.base + 1.2, out(p.depth - 0.15), 0.16, 2.4, 0.16, h.trim);
    M.roofs.local(h, 'box', p.u, h.base + 2.52, wc + h.front * 0.12, p.width + 0.5, 0.12, p.depth + 0.5, h.roofColor, h.front * 0.17);
    M.detail.local(h, 'box', p.u, h.base + 2.36, out(p.depth - 0.12), p.width, 0.18, 0.14, h.trim);
  }

  if (decor === 'pumpkins' && rng() < 0.8) {
    const n = 1 + Math.floor(rng() * 3), y = h.base + (h.porch ? 0.1 : -0.05);
    for (let k = 0; k < n; k++) {
      const u = h.doorU + (k % 2 ? 1 : -1) * (0.85 + 0.4 * Math.floor(k / 2)), w = out(h.porch ? 0.5 : 0.75), s = 0.26 + rng() * 0.12;
      M.detail.local(h, 'smooth', u, y + s * 0.7, w, s * 2, s * 1.5, s * 2, '#f08a24');
      M.detail.local(h, 'box', u, y + s * 1.45, w, 0.05, 0.12, 0.05, '#4f6b2a');
    }
  } else if (decor === 'flowers') {
    for (let u = -h.hu + 0.7; u < h.hu - 0.5; u += 1.3 + rng() * 0.5) {
      if (Math.abs(u - h.doorU) < 1.2 || (h.porch && Math.abs(u - h.porch.u) < h.porch.width / 2 + 0.3)) continue;
      const s = 0.5 + rng() * 0.25;
      M.flat.local(h, 'ball', u, h.base - 0.1 + s * 0.4, out(0.55), s * 1.2, s, s * 1.2, rng() < 0.5 ? '#3f8f3d' : '#4f9f45');
    }
  }
  if (h.home) {
    const star = labelSprite('★', '#ff7a3d');
    star.scale.set(1.5, 1.5, 1);
    const w = out(0.4);
    star.position.set(h.cx + h.doorU * h.cos - w * h.sin, h.base + 3.0, h.cz + h.doorU * h.sin + w * h.cos);
    sprites.push(star);
  }
}

// ------------------------------------------------------------------- trees
function shade(geo, lo, hi, axisMin, axisMax, seed) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), rng = mulberry32(seed);
  for (let i = 0; i < pos.count; i += 3) {
    const jitter = 0.92 + rng() * 0.16;
    for (let k = 0; k < 3; k++) {
      const t = (pos.getY(i + k) - axisMin) / (axisMax - axisMin);
      const v = (lo + (hi - lo) * Math.max(0, Math.min(1, t))) * jitter;
      col.set([v, v, v], (i + k) * 3);
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function fitUnit(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, c = new THREE.Vector3(), s = new THREE.Vector3();
  b.getCenter(c); b.getSize(s);
  geo.translate(-c.x, -c.y, -c.z);
  geo.scale(2 / s.x, 2 / s.y, 2 / s.z);
  return geo;
}

function lobeCanopy(seed) {
  const rng = mulberry32(seed), parts = [new THREE.IcosahedronGeometry(0.72, 1)];
  const n = 4 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.6, el = -0.25 + rng() * 0.8, d = 0.5;
    const g = new THREE.IcosahedronGeometry(0.42 + rng() * 0.2, 1);
    g.translate(Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d);
    parts.push(g);
  }
  const crown = new THREE.IcosahedronGeometry(0.42, 1);
  crown.translate((rng() - 0.5) * 0.25, 0.58, (rng() - 0.5) * 0.25);
  parts.push(crown);
  return shade(fitUnit(mergeGeometries(parts)), 0.6, 1.1, -1, 1, seed);
}

function willowCanopy() {
  const segs = 16;
  const prof = [[0.01, 1], [0.45, 0.94], [0.78, 0.7], [0.95, 0.35], [1.0, -0.05], [0.97, -0.5], [0.93, -1]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, segs).toNonIndexed();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > 0.55) continue;
    // alternate columns hang as fronds or tuck in as gaps, more so lower down
    const a = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
    const gap = Math.round(a / ((Math.PI * 2) / segs)) % 2 === 1, t = Math.min(1, (0.55 - y) / 1.2);
    const k = gap ? 1 - 0.18 * t : 1 + 0.03 * t;
    pos.setXYZ(i, x * k, y + (gap ? 0.3 * t * t : -0.05 * t), z * k);
  }
  geo.computeVertexNormals();
  return shade(geo, 0.62, 1.08, -1, 1, 4);
}

function pineCanopy() {
  const parts = [[0, 0.56, 1], [0.3, 0.82, 0.74], [0.56, 1, 0.47]].map(([y0, y1, r]) => {
    const g = new THREE.ConeGeometry(r, y1 - y0, 9, 1);
    g.translate(0, (y0 + y1) / 2, 0);
    return g.toNonIndexed();
  });
  return shade(mergeGeometries(parts), 0.58, 1.05, 0, 1, 8);
}

// Fronds radiating from the crown and drooping at their tips.
function palmCanopy() {
  const parts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.25;
    const g = new THREE.BoxGeometry(1, 0.05, 0.3, 5, 1, 1);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k) + 0.5; // 0 at the crown, 1 at the tip
      pos.setXYZ(k, x, pos.getY(k) + 0.3 * x - 0.85 * x * x + (i % 3) * 0.06, pos.getZ(k) * (1.2 - 0.9 * x));
    }
    g.rotateY(-a);
    parts.push(g.toNonIndexed());
  }
  const crown = new THREE.IcosahedronGeometry(0.14, 0).toNonIndexed();
  crown.deleteAttribute('uv');
  for (const p of parts) p.deleteAttribute('uv');
  const geo = mergeGeometries([...parts, crown]);
  geo.computeVertexNormals();
  return shade(geo, 0.55, 1.08, -0.6, 0.2, 11);
}

function buildTrees(L, group) {
  const theme = L.theme, trees = L.trees;
  const canopyMat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { sway: 0.55, snow: true, see: true });
  const pineMat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { sway: 0.3, snow: true, see: true });
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1.15, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const meshes = {
    lobe: [lobeCanopy(1), lobeCanopy(2), lobeCanopy(3)].map((g) => new THREE.InstancedMesh(g, canopyMat, trees.length)),
    willow: new THREE.InstancedMesh(willowCanopy(), canopyMat, trees.length),
    pine: new THREE.InstancedMesh(pineCanopy(), pineMat, trees.length),
    palm: new THREE.InstancedMesh(palmCanopy(), pineMat, trees.length),
    trunk: new THREE.InstancedMesh(trunkGeo, enhance(new THREE.MeshLambertMaterial(), { see: true }), trees.length),
  };
  const all = [...meshes.lobe, meshes.willow, meshes.pine, meshes.palm, meshes.trunk];
  for (const m of all) { m.count = 0; m.castShadow = true; m.receiveShadow = true; }
  const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const put = (mesh, x, y, z, sx, sy, sz, yaw, color) => {
    const i = mesh.count++;
    mesh.setMatrixAt(i, mat.compose(p.set(x, y, z), q.setFromAxisAngle(up, yaw), s.set(sx, sy, sz)));
    mesh.setColorAt(i, _c.set(color));
  };
  for (const t of trees) {
    const y = groundHeight(t.x, t.z), yaw = t.tint * 6.283;
    const tint = (c) => _c.set(c).multiplyScalar(0.9 + t.tint * 0.2).getHex();
    const trunkTop = t.kind === 'pine' ? t.h * 0.55 : t.kind === 'palm' ? t.h - 0.1 : (t.bottom + t.h) / 2;
    const bark = t.kind === 'birch' ? '#ece7dc' : t.kind === 'pine' ? theme.pineTrunk : t.kind === 'palm' ? (theme.palmTrunk ?? '#9c8a68') : theme.trunk;
    put(meshes.trunk, t.x, y - 0.3, t.z, t.trunkR, trunkTop + 0.3, t.trunkR, yaw, bark);
    const ry = (t.h - t.bottom) / 2;
    if (t.kind === 'palm') {
      put(meshes.palm, t.x, y + t.h - 0.15, t.z, t.r, t.r, t.r, yaw, tint(t.color));
    } else if (t.kind === 'pine') {
      put(meshes.pine, t.x, y + t.bottom, t.z, t.r * 0.62, t.h - t.bottom, t.r * 0.62, yaw, tint(t.color));
    } else if (t.kind === 'willow') {
      put(meshes.willow, t.x, y + t.bottom + ry, t.z, t.r, ry, t.r, yaw, tint(t.color));
    } else {
      const k = t.kind === 'birch' ? 0.85 : 1;
      put(meshes.lobe[t.variant], t.x, y + t.bottom + ry, t.z, t.r * k, ry, t.r * k, yaw, tint(t.color));
    }
  }
  for (const m of all) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    if (m.count) group.add(m);
  }
}

// --------------------------------------------------------------- tee signs
function signTexture(hole) {
  const W = 256, H = 320, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#1f5a3d'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(8, 8, W - 16, H - 16);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.font = 'bold 26px sans-serif'; g.fillText('HOLE', W / 2, 46);
  g.font = 'bold 84px sans-serif'; g.fillText(String(hole.number), W / 2, 128);
  g.font = 'bold 26px sans-serif';
  g.fillText(`PAR ${hole.par}  ·  ${Math.round(hole.playLength * 3.28084)} FT`, W / 2, 166);
  // little map of the line of play
  const r = hole.route, xs = r.map((p) => p.x), zs = r.map((p) => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const k = Math.min(180 / Math.max(maxX - minX, 1), 110 / Math.max(maxZ - minZ, 1));
  const P = (p) => [W / 2 + (p.x - (minX + maxX) / 2) * k, 246 + (p.z - (minZ + maxZ) / 2) * k];
  g.strokeStyle = '#9fd47a'; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); r.forEach((p, i) => (i ? g.lineTo(...P(p)) : g.moveTo(...P(p)))); g.stroke();
  const [tx, tz] = P(r[0]), [bx, bz] = P(r[r.length - 1]);
  g.fillStyle = '#ffffff'; g.fillRect(tx - 8, tz - 8, 16, 16);
  g.fillStyle = '#ff7a3d'; g.beginPath(); g.arc(bx, bz, 10, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ----------------------------------------------------------------- baskets
function basketMesh(number) {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: '#c9ced6' });
  const open = (color) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  const add = (geo, mat, y, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y; m.rotation.x = rx; m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.CylinderGeometry(BASKET.poleR, BASKET.poleR, 1.58, 8), metal, 0.79);
  add(new THREE.CylinderGeometry(0.36, 0.3, 0.18, 20, 1, true), open('#b9bfc8'), BASKET.trayY);
  add(new THREE.CircleGeometry(0.3, 20), metal, BASKET.trayY - 0.08, -Math.PI / 2);
  add(new THREE.TorusGeometry(0.36, 0.018, 6, 24), metal, BASKET.trayY + 0.09, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 20, 1, true), open('#ffcf33'), BASKET.topY + 0.04);
  add(new THREE.TorusGeometry(0.31, 0.02, 6, 24), open('#ffcf33'), BASKET.topY + 0.1, Math.PI / 2);
  // chains: outer and inner rings of strands bowing out between the band and the pole
  const pts = [];
  const strand = (a, r0, bow) => {
    const top = [Math.cos(a) * r0, BASKET.topY, Math.sin(a) * r0];
    const mid = [Math.cos(a) * bow, (BASKET.topY + BASKET.trayY) / 2 + 0.05, Math.sin(a) * bow];
    const bot = [Math.cos(a) * 0.05, BASKET.trayY + 0.12, Math.sin(a) * 0.05];
    pts.push(...top, ...mid, ...mid, ...bot);
  };
  for (let i = 0; i < 16; i++) strand((i / 16) * Math.PI * 2, 0.28, 0.22);
  for (let i = 0; i < 8; i++) strand((i / 8 + 0.06) * Math.PI * 2, 0.15, 0.13);
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const chains = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: '#9aa1aa' }));
  g.add(chains);
  const flag = labelSprite(String(number), '#ff7a3d');
  flag.scale.set(0.8, 0.8, 1);
  flag.position.y = 2.2;
  g.add(flag);
  return { group: g, chains, shake: 0 };
}

// ------------------------------------------------------------------- build
export function buildScenery(L, world, group) {
  const theme = L.theme, rng = mulberry32(31);
  const vc = (extra) => new THREE.MeshLambertMaterial({ vertexColors: true, ...extra });
  const mats = {
    walls: enhance(vc(), { see: true }),
    roofs: enhance(vc({ side: THREE.DoubleSide }), { snow: true, see: true }),
    detail: enhance(vc(), { see: true }),
    flat: enhance(vc({ flatShading: true }), { snow: true, see: true }),
    glass: enhance(new THREE.MeshLambertMaterial({ color: '#8fc7e3', emissive: '#22445a' }), { see: true }),
    glow: enhance(new THREE.MeshLambertMaterial({ color: '#fff3c4', emissive: '#ffcf70', emissiveIntensity: 0 }), { see: true }),
  };
  const M = { walls: new Merge(), roofs: new Merge(), detail: new Merge(), flat: new Merge(), glass: new Merge(), glow: new Merge() };
  const sprites = [];
  const G = (x, z) => groundHeight(x, z);
  const frame = (o) => ({ cx: o.x ?? o.cx, cz: o.z ?? o.cz, cos: Math.cos(o.ang), sin: Math.sin(o.ang), ang: o.ang });

  for (const h of L.houses) house(M, h, rng, theme.porchDecor, sprites);
  buildTrees(L, group);

  // ---- cars
  for (const c of L.cars) {
    const y = G(c.cx, c.cz), col = CAR_COLORS[c.color % CAR_COLORS.length];
    M.detail.local(c, 'box', 0, y + 0.58, 0, 4.3, 0.62, 1.8, col);
    M.detail.local(c, 'box', 1.6, y + 0.85, 0, 1.0, 0.06, 1.7, col);
    M.glass.local(c, 'box', -0.15, y + 1.16, 0, 2.3, 0.56, 1.62, '#ffffff');
    M.detail.local(c, 'box', -0.15, y + 1.47, 0, 2.06, 0.08, 1.58, col);
    for (const [u, w] of [[1.35, 0.86], [1.35, -0.86], [-1.35, 0.86], [-1.35, -0.86]]) {
      M.detail.local(c, 'cyl', u, y + 0.34, w, 0.68, 0.24, 0.68, '#1d1e22', Math.PI / 2);
      M.detail.local(c, 'cyl', u, y + 0.34, w * 1.02, 0.36, 0.25, 0.36, '#b8bcc2', Math.PI / 2);
    }
    for (const w of [-0.62, 0.62]) {
      M.glow.local(c, 'box', 2.16, y + 0.66, w, 0.04, 0.16, 0.32, '#ffffff');
      M.detail.local(c, 'box', -2.16, y + 0.66, w, 0.04, 0.16, 0.32, '#d33a2c');
    }
  }

  // ---- street furniture
  for (const m of L.mailboxes) {
    const y = G(m.x, m.z), f = frame(m);
    M.detail.local(f, 'box', 0, y + 0.5, 0, 0.1, 1.05, 0.1, '#7d5c3e');
    M.detail.local(f, 'box', 0, y + 1.12, 0, 0.5, 0.26, 0.24, '#2f3640');
    M.detail.local(f, 'box', 0.12, y + 1.3, 0.13, 0.03, 0.18, 0.02, '#d9534f');
  }
  for (const l of L.lamps) {
    const y = G(l.x, l.z), f = frame(l);
    M.detail.put('cyl', l.x, y + 2.8, l.z, 0.16, 5.6, 0.16, '#3a4350');
    M.detail.local(f, 'box', 0, y + 5.5, -0.9, 0.1, 0.1, 1.9, '#3a4350');
    M.detail.local(f, 'box', 0, y + 5.42, -1.75, 0.36, 0.12, 0.55, '#3a4350');
    M.glow.local(f, 'box', 0, y + 5.33, -1.75, 0.3, 0.06, 0.45, '#ffffff');
  }
  for (const hd of L.hedges) {
    const len = Math.hypot(hd.bx - hd.ax, hd.bz - hd.az), ang = Math.atan2(hd.bz - hd.az, hd.bx - hd.ax);
    const n = Math.max(1, Math.round(len / 1.4));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = hd.ax + (hd.bx - hd.ax) * t, z = hd.az + (hd.bz - hd.az) * t, y = G(x, z);
      M.flat.put('box', x, y + hd.h / 2 - 0.1, z, len / n + 0.05, hd.h + 0.2, hd.w, '#2f7a35', -ang);
      M.flat.put('ball', x, y + hd.h, z, len / n * 1.1, 0.6, hd.w * 1.05, k % 2 ? '#3a8a3e' : '#347f38', -ang);
    }
  }
  for (const f of L.fences) {
    const len = Math.hypot(f.bx - f.ax, f.bz - f.az), ang = Math.atan2(f.bz - f.az, f.bx - f.ax);
    if (f.kind === 'iron') {
      // black railings with spear tops, on a low stone curb
      const iron = '#1d1e22', n = Math.max(1, Math.round(len / 0.32));
      const mid = { x: (f.ax + f.bx) / 2, z: (f.az + f.bz) / 2 }, gy = G(mid.x, mid.z);
      M.flat.put('box', mid.x, gy + 0.12, mid.z, len, 0.3, 0.42, '#b9b2a6', -ang);
      for (const ry of [0.42, f.h - 0.12]) M.detail.put('box', mid.x, gy + ry, mid.z, len, 0.06, 0.06, iron, -ang);
      for (let k = 0; k <= n; k++) {
        const x = f.ax + ((f.bx - f.ax) * k) / n, z = f.az + ((f.bz - f.az) * k) / n;
        M.detail.put('box', x, gy + f.h / 2 + 0.15, z, 0.035, f.h - 0.1, 0.035, iron, -ang);
        if (k % 3 === 0) M.detail.put('cone', x, gy + f.h + 0.17, z, 0.09, 0.2, 0.09, '#b08a3a');
      }
      continue;
    }
    const n = Math.max(1, Math.ceil(len / 2.4)), picket = f.kind === 'picket';
    const wood = picket ? '#f4f2ec' : '#a5825c', post = picket ? '#ffffff' : '#7a5c3e';
    for (let k = 0; k <= n; k++) {
      const x = f.ax + ((f.bx - f.ax) * k) / n, z = f.az + ((f.bz - f.az) * k) / n, y = G(x, z);
      M.detail.put('box', x, y + f.h / 2, z, 0.12, f.h + 0.12, 0.12, post, -ang);
    }
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = f.ax + (f.bx - f.ax) * t, z = f.az + (f.bz - f.az) * t, y = G(x, z), seg = len / n;
      if (!picket) {
        M.detail.put('box', x, y + f.h / 2, z, seg, f.h, 0.06, k % 2 ? wood : '#9c7a55', -ang);
        M.detail.put('box', x, y + f.h + 0.03, z, seg, 0.06, 0.12, post, -ang);
        continue;
      }
      for (const ry of [0.35, 0.8]) M.detail.put('box', x, y + ry, z, seg, 0.07, 0.04, wood, -ang);
      const m = Math.round(seg / 0.24);
      for (let i = 0; i < m; i++) {
        const tt = (k + (i + 0.5) / m) / n, px = f.ax + (f.bx - f.ax) * tt, pz = f.az + (f.bz - f.az) * tt;
        M.detail.put('box', px, G(px, pz) + f.h / 2, pz, 0.08, f.h, 0.03, wood, -ang);
      }
    }
  }
  for (const p of L.pools) {
    M.detail.local(p, 'box', 0, (p.top + p.low) / 2, 0, p.hu * 2, p.top - p.low, p.hv * 2, '#ddd8cb');
    for (const s of [-1, 1]) {
      M.detail.local(p, 'box', 0, p.top + 0.03, s * (p.hv - 0.72), p.hu * 2 - 1.1, 0.06, 0.3, '#f4f2ec');
      M.detail.local(p, 'box', s * (p.hu - 0.72), p.top + 0.03, 0, 0.3, 0.06, p.hv * 2 - 1.1, '#f4f2ec');
    }
    M.detail.local(p, 'box', p.hu - 0.3, p.top + 0.32, 0, 1.6, 0.07, 0.5, '#f4f2ec');
  }

  // ---- decks, docks, boardwalks and bridges
  for (const p of L.platforms) {
    if (p.kind === 'stone') {
      // an old stone footbridge: one slab, a shallow arch beneath and low parapets
      const stone = '#bdb5a5', dark = '#9c9384';
      M.flat.local(p, 'box', 0, p.top - 0.2, 0, p.hu * 2, 0.4, p.hv * 2, stone);
      M.flat.local(p, 'box', 0, p.top - 0.75, 0, p.hu * 1.4, 0.7, p.hv * 2 - 0.2, dark);
      for (const s of [-1, 1]) {
        M.flat.local(p, 'box', 0, p.top + 0.3, s * (p.hv - 0.18), p.hu * 2, 0.6, 0.36, stone);
        M.flat.local(p, 'box', 0, p.top + 0.63, s * (p.hv - 0.18), p.hu * 2 + 0.1, 0.08, 0.44, dark);
      }
      continue;
    }
    const wood = p.kind === 'bridge' ? '#8a6748' : WOOD, n = Math.round((p.hu * 2) / 0.32), plank = (p.hu * 2) / n;
    for (let k = 0; k < n; k++) {
      M.detail.local(p, 'box', -p.hu + (k + 0.5) * plank, p.top - 0.05, 0, plank - 0.04, 0.1, p.hv * 2, k % 3 === 0 ? '#93704b' : wood);
    }
    for (const s of [-1, 1]) M.detail.local(p, 'box', 0, p.top - 0.26, s * (p.hv - 0.3), p.hu * 2, 0.3, 0.16, WOOD_DARK);
    for (let u = -p.hu + 0.3; u <= p.hu - 0.1; u += 2.6) {
      for (const s of [-1, 1]) {
        const w = s * (p.hv - 0.2), x = p.cx + u * p.cos - w * p.sin, z = p.cz + u * p.sin + w * p.cos, gy = G(x, z);
        if (p.top - gy > 0.5) M.detail.put('cyl', x, (gy - 0.3 + p.top - 0.1) / 2, z, 0.24, p.top - gy + 0.2, 0.24, WOOD_DARK);
      }
    }
    if (!p.rails) continue;
    for (const s of [-1, 1]) {
      const w = s * (p.hv - 0.06);
      for (let u = -p.hu + 0.05; u <= p.hu; u += 1.8) M.detail.local(p, 'box', Math.min(u, p.hu - 0.05), p.top + 0.5, w, 0.1, 1.0, 0.1, wood);
      M.detail.local(p, 'box', 0, p.top + 0.98, w, p.hu * 2, 0.08, 0.13, wood);
      M.detail.local(p, 'box', 0, p.top + 0.52, w, p.hu * 2, 0.05, 0.06, wood);
    }
  }

  // ---- park furniture and odds and ends
  for (const p of L.props) {
    const y = p.y ?? G(p.x, p.z), f = frame(p);
    switch (p.type) {
      case 'bench':
        M.detail.local(f, 'box', 0, y + 0.45, 0, 1.8, 0.07, 0.42, WOOD);
        M.detail.local(f, 'box', 0, y + 0.78, -0.2, 1.8, 0.36, 0.06, WOOD);
        for (const s of [-1, 1]) M.detail.local(f, 'box', s * 0.75, y + 0.38, 0, 0.08, 0.76, 0.46, '#3b3f45');
        break;
      case 'table':
        M.detail.local(f, 'box', 0, y + 0.76, 0, 1.9, 0.07, 0.8, WOOD);
        for (const s of [-1, 1]) {
          M.detail.local(f, 'box', 0, y + 0.45, s * 0.66, 1.9, 0.06, 0.3, WOOD);
          M.detail.local(f, 'box', s * 0.72, y + 0.38, 0, 0.08, 0.76, 1.6, WOOD_DARK);
        }
        break;
      case 'umbrella':
        M.detail.put('cyl', p.x, y + 1.15, p.z, 0.06, 2.3, 0.06, '#e8e8e8');
        M.detail.put('cone', p.x, y + 2.25, p.z, 2.5, 0.55, 2.5, p.color ?? '#e94f37');
        M.detail.put('smooth', p.x, y + 2.55, p.z, 0.12, 0.12, 0.12, '#ffffff');
        break;
      case 'canoe':
        M.detail.put('smooth', p.x, y + 0.2, p.z, 4.4, 0.42, 0.85, p.color ?? '#d9534f', -p.ang);
        M.detail.put('smooth', p.x, y + 0.31, p.z, 3.9, 0.26, 0.6, '#5a3e2b', -p.ang);
        break;
      case 'swing': {
        for (const s of [-1, 1]) {
          const cu = s * 2.3, top = [p.x + cu * f.cos, y + 2.4, p.z + cu * f.sin];
          for (const w of [-1.0, 1.0]) M.detail.beam('box', [p.x + cu * f.cos - w * f.sin, y, p.z + cu * f.sin + w * f.cos], top, 0.1, '#3a86c8');
        }
        M.detail.local(f, 'box', 0, y + 2.4, 0, 4.8, 0.1, 0.1, '#3a86c8');
        for (const u of [-0.9, 0.9]) {
          for (const s of [-0.22, 0.22]) M.detail.local(f, 'box', u + s, y + 1.45, 0, 0.03, 1.9, 0.03, '#9aa1aa');
          M.detail.local(f, 'box', u, y + 0.5, 0, 0.55, 0.05, 0.25, '#d9534f');
        }
        break;
      }
      case 'slide':
        M.detail.local(f, 'box', 0, y + 1.05, 0, 3.4, 0.06, 0.6, '#f2b134', 0, -Math.atan2(1.5, 3.1));
        M.detail.local(f, 'box', -1.8, y + 0.95, 0, 0.1, 1.9, 0.7, '#3a86c8');
        M.detail.local(f, 'box', -1.55, y + 1.85, 0, 0.6, 0.08, 0.7, '#3a86c8');
        break;
      case 'gazebo':
      case 'shelter': {
        const half = p.size / 2, gz = p.type === 'gazebo';
        M.detail.local(f, 'box', 0, y + 0.06, 0, p.size + 0.8, 0.2, p.size + 0.8, gz ? '#cdbfa5' : '#b9b4a8');
        for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.detail.local(f, 'box', u * half, y + 1.3, w * half, 0.2, 2.6, 0.2, '#ffffff');
        if (gz) {
          M.roofs.put('cone', p.x, y + 2.6 + 0.8, p.z, (half + 0.7) * 2.83, 1.6, (half + 0.7) * 2.83, '#3f4a45', -p.ang + Math.PI / 4);
          M.detail.put('smooth', p.x, y + 4.25, p.z, 0.25, 0.25, 0.25, '#ffffff');
        } else {
          roof(M, { ...f, hu: half + 0.4, hv: half + 0.4, base: y + 2.6, wallH: 0, roofH: 1.2, roof: 'gable', roofColor: '#6b3a2f', trim: '#ffffff' }, '#a5825c');
        }
        break;
      }
      case 'hoop':
        M.detail.put('cyl', p.x, y + 1.55, p.z, 0.14, 3.1, 0.14, '#3a4350');
        M.detail.local(f, 'box', 0.5, y + 3.35, 0, 0.05, 1.05, 1.8, '#ffffff');
        M.detail.local(f, 'box', 0.53, y + 3.3, 0, 0.02, 0.45, 0.6, '#e2572b');
        M.detail.local(f, 'torus', 0.85, y + 3.05, 0, 0.45, 0.45, 0.45, '#e2572b', Math.PI / 2);
        break;
      case 'hydrant':
        M.detail.put('cyl', p.x, y + 0.3, p.z, 0.28, 0.6, 0.28, '#d33a2c');
        M.detail.put('smooth', p.x, y + 0.64, p.z, 0.3, 0.2, 0.3, '#d33a2c');
        M.detail.put('cyl', p.x, y + 0.42, p.z, 0.12, 0.12, 0.5, '#e9e9e9', 0, Math.PI / 2);
        break;
      case 'bin':
        M.detail.put('cyl', p.x, y + 0.5, p.z, 0.6, 1.0, 0.6, '#3f6b4a');
        M.detail.put('cyl', p.x, y + 1.03, p.z, 0.66, 0.06, 0.66, '#2f4f38');
        break;
      case 'boulder': {
        const r = p.r ?? 1;
        M.flat.put('rock', p.x, y + r * 0.35, p.z, r * 2, r * 1.5, r * 2, rng() < 0.5 ? '#8f8b84' : '#9a958c', rng() * 6.3);
        break;
      }
      case 'leafpile': {
        const r = p.r ?? 1.5, colors = theme.foliage.broad;
        for (let k = 0; k < 7; k++) {
          const a = rng() * 6.3, d = rng() * r * 0.55, s = r * (0.8 + rng() * 0.5);
          M.flat.put('ball', p.x + Math.cos(a) * d, y + 0.18, p.z + Math.sin(a) * d, s, 0.55 + rng() * 0.3, s, colors[Math.floor(rng() * colors.length)], rng() * 6);
        }
        break;
      }
      case 'snowman': {
        const s = p.size ?? 1, snow = '#f6f9fb';
        M.flat.put('smooth', p.x, y + 0.4 * s, p.z, 1.0 * s, 0.9 * s, 1.0 * s, snow);
        M.flat.put('smooth', p.x, y + 1.05 * s, p.z, 0.72 * s, 0.66 * s, 0.72 * s, snow);
        M.flat.put('smooth', p.x, y + 1.55 * s, p.z, 0.5 * s, 0.48 * s, 0.5 * s, snow);
        M.detail.local(f, 'cone', 0.36 * s, y + 1.55 * s, 0, 0.09 * s, 0.32 * s, 0.09 * s, '#f08a24', 0, -Math.PI / 2);
        for (const w of [-0.1, 0.1]) M.detail.local(f, 'smooth', 0.22 * s, y + 1.64 * s, w * s, 0.06 * s, 0.06 * s, 0.06 * s, '#1d1e22');
        for (const k of [0, 1, 2]) M.detail.local(f, 'smooth', 0.35 * s, y + (0.95 + k * 0.13) * s, 0, 0.06 * s, 0.06 * s, 0.06 * s, '#1d1e22');
        M.detail.put('cyl', p.x, y + 1.3 * s, p.z, 0.56 * s, 0.12 * s, 0.56 * s, p.color ?? '#d33a2c');
        M.detail.put('cyl', p.x, y + 1.8 * s, p.z, 0.5 * s, 0.04 * s, 0.5 * s, '#1d1e22');
        M.detail.put('cyl', p.x, y + 1.96 * s, p.z, 0.32 * s, 0.32 * s, 0.32 * s, '#1d1e22');
        break;
      }
      case 'steeple': {
        // a square bell tower capped with a slate spire and a gilt cross
        const h = p.h ?? 20, w = p.w ?? 4, towerH = h * 0.58;
        M.walls.put('box', p.x, y + towerH / 2, p.z, w, towerH, w, '#f4f1ea', -p.ang);
        M.detail.put('box', p.x, y + towerH - 0.2, p.z, w + 0.3, 0.4, w + 0.3, '#e2ddd0', -p.ang);
        for (const [du, dw] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          M.detail.put('box', p.x + (du * w * Math.cos(p.ang) - dw * w * Math.sin(p.ang)) * 0.501, y + towerH * 0.78, p.z + (du * w * Math.sin(p.ang) + dw * w * Math.cos(p.ang)) * 0.501,
            du ? 0.06 : w * 0.34, w * 0.5, dw ? 0.06 : w * 0.34, '#2f3640', -p.ang);
        }
        M.roofs.put('cone6', p.x, y + towerH + (h - towerH) / 2, p.z, w * 1.05, h - towerH, w * 1.05, '#3f4650', -p.ang);
        M.detail.put('box', p.x, y + h + 0.6, p.z, 0.12, 1.2, 0.12, '#c9a23a');
        M.detail.put('box', p.x, y + h + 0.85, p.z, 0.6, 0.12, 0.12, '#c9a23a', -p.ang);
        break;
      }
      case 'statue': {
        // an equestrian bronze on a granite plinth
        const bronze = '#3d4a3f';
        M.flat.put('box', p.x, y + 1.3, p.z, 3.2, 2.6, 2.2, '#b9b2a6', -p.ang);
        M.flat.put('box', p.x, y + 2.68, p.z, 3.5, 0.16, 2.5, '#a39c90', -p.ang);
        M.flat.local(f, 'box', 0.1, y + 3.55, 0, 2.0, 0.8, 0.7, bronze, 0, 0.45);
        M.flat.local(f, 'box', 0.95, y + 4.25, 0, 0.5, 0.9, 0.4, bronze, 0, 0.9);
        M.flat.local(f, 'box', 1.25, y + 4.55, 0, 0.6, 0.32, 0.3, bronze);
        for (const w of [-0.25, 0.25]) M.flat.local(f, 'box', -0.75, y + 3.1, w, 0.16, 0.9, 0.14, bronze, 0, -0.2);
        M.flat.local(f, 'box', -0.05, y + 4.35, 0, 0.36, 0.9, 0.4, bronze);
        M.flat.local(f, 'smooth', -0.02, y + 4.95, 0, 0.32, 0.36, 0.32, bronze);
        M.flat.local(f, 'box', 0.15, y + 5.1, 0, 0.08, 0.6, 0.08, bronze, 0, -0.6);
        break;
      }
      case 'cafe':
      case 'market': {
        // an open pavilion: columns and a striped (cafe) or slate (market) roof
        const cafe = p.type === 'cafe', top = y + 2.8;
        const n = Math.max(1, Math.round(p.hu / 3.5));
        for (let k = 0; k <= n; k++) {
          const u = -p.hu + (k * p.hu * 2) / n;
          for (const w of [-p.hv, p.hv]) M.detail.local(f, 'box', u, y + 1.4, w, 0.24, 2.8, 0.24, cafe ? '#f4f1ea' : '#7a6a58');
        }
        M.detail.local(f, 'box', 0, top, 0, p.hu * 2 + 0.4, 0.3, p.hv * 2 + 0.4, cafe ? '#2f6b3a' : '#5a4a3c');
        if (cafe) {
          const stripes = Math.round((p.hu * 2) / 0.9);
          for (const s of [-1, 1]) {
            for (let k = 0; k < stripes; k++) {
              const u = -p.hu + (k + 0.5) * ((p.hu * 2) / stripes);
              M.roofs.local(f, 'box', u, top + 0.55, s * p.hv * 0.5, (p.hu * 2) / stripes + 0.02, 0.1, p.hv + 0.4, k % 2 ? '#2f6b3a' : '#f4f1ea', s * 0.42);
            }
          }
          for (let k = 0; k < 6; k++) {
            const u = -p.hu + 1.5 + (k % 3) * (p.hu - 1.5), w = k < 3 ? -p.hv * 0.45 : p.hv * 0.45;
            M.detail.local(f, 'cyl', u, y + 0.75, w, 0.9, 0.06, 0.9, '#f4f1ea');
            M.detail.local(f, 'cyl', u, y + 0.37, w, 0.08, 0.74, 0.08, '#2b2b2b');
          }
        } else {
          roof(M, { ...f, hu: p.hu + 0.4, hv: p.hv + 0.4, base: top + 0.1, wallH: 0, roofH: 1.6, roof: 'gable', roofColor: '#5b6470', trim: '#e8e2d6' }, '#7a6a58');
          for (let k = 0; k < Math.round(p.hu / 2); k++) {
            const u = -p.hu + 2 + k * 4;
            if (u > p.hu - 1) break;
            M.detail.local(f, 'box', u, y + 0.5, 0, 2.6, 1.0, 1.4, ['#c9a24a', '#a8472f', '#5a8a3a', '#d9b45a'][k % 4]);
          }
        }
        break;
      }
      case 'steamboat': {
        // a white sternwheeler with twin stacks and a red paddle wheel
        const white = '#f4f1ea', trim = '#c23b2f';
        M.walls.local(f, 'box', 0, y + 0.6, 0, 30, 2.2, 9, white);
        M.detail.local(f, 'box', 0, y + 1.75, 0, 30.4, 0.18, 9.4, trim);
        M.walls.local(f, 'box', -1, y + 3.1, 0, 24, 2.4, 8, white);
        M.walls.local(f, 'box', -2, y + 5.4, 0, 18, 2.2, 7, white);
        for (const yy of [y + 4.35, y + 6.55]) M.detail.local(f, 'box', -1, yy, 0, 24.4, 0.15, 8.4, trim);
        M.walls.local(f, 'box', 3, y + 7.4, 0, 5, 1.8, 4, white);
        M.roofs.local(f, 'box', 3, y + 8.4, 0, 5.6, 0.2, 4.6, trim);
        for (const w of [-2.2, 2.2]) {
          M.detail.local(f, 'cyl', 9, y + 9.5, w, 0.9, 7, 0.9, '#1d1e22');
          M.detail.local(f, 'cyl', 9, y + 13.1, w, 1.4, 0.5, 1.4, '#c9a23a');
        }
        M.detail.local(f, 'cyl', -16.5, y + 2.4, 0, 5.2, 7.6, 5.2, trim, Math.PI / 2);
        for (let k = 0; k < 8; k++) M.detail.local(f, 'box', -16.5, y + 2.4, 0, 0.3, 5.6, 7.8, '#8a2a22', (k / 8) * Math.PI);
        break;
      }
      case 'streetcar': {
        const red = '#c8102e';
        M.walls.local(f, 'box', 0, y + 1.6, 0, 12.4, 2.4, 2.7, red);
        M.glass.local(f, 'box', 0, y + 2.2, 0, 11.6, 0.8, 2.74, '#ffffff');
        M.roofs.local(f, 'box', 0, y + 3.0, 0, 12.6, 0.4, 2.5, '#e8dcc0');
        M.detail.local(f, 'box', 0, y + 0.35, 0, 11, 0.5, 2.2, '#2b2b2b');
        M.detail.local(f, 'box', 0, y + 3.9, 0, 0.1, 1.6, 0.1, '#2b2b2b', 0, 0.8);
        break;
      }
      case 'beads': {
        // Mardi Gras beads draped over a branch
        const colors = ['#6a2c91', '#1f8a3b', '#e0b21c'];
        for (let k = 0; k < (p.n ?? 5); k++) {
          const a = rng() * 6.3, d = rng() * (p.spread ?? 2.5), s = 0.16 + rng() * 0.12;
          M.detail.put('torus', p.x + Math.cos(a) * d, y - rng() * 1.2, p.z + Math.sin(a) * d, s, s * 1.7, s, colors[k % 3], a);
        }
        break;
      }
      case 'lighthouse': {
        const h = p.h ?? 14, R0 = 2.2, R1 = 0.76 * R0;
        const rAt = (yy) => R0 + (R1 - R0) * (yy / h);
        M.flat.put('box', p.x, y + 0.3, p.z, R0 * 2 + 1.4, 0.6, R0 * 2 + 1.4, '#8f8b84');
        M.walls.put('taper', p.x, y + h / 2, p.z, R0 * 2, h, R0 * 2, '#f4f1ea');
        for (const yy of [h * 0.22, h * 0.55, h * 0.86]) M.walls.put('cyl', p.x, y + yy, p.z, rAt(yy) * 2 + 0.06, h * 0.12, rAt(yy) * 2 + 0.06, '#d33a2c');
        M.detail.put('cyl', p.x, y + h + 0.12, p.z, R1 * 2 + 0.8, 0.24, R1 * 2 + 0.8, '#2f3640');
        M.glow.put('cyl', p.x, y + h + 1.05, p.z, R1 * 1.3, 1.6, R1 * 1.3, '#ffffff');
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          M.detail.put('box', p.x + Math.cos(a) * R1 * 0.66, y + h + 1.05, p.z + Math.sin(a) * R1 * 0.66, 0.1, 1.6, 0.1, '#2f3640');
        }
        M.roofs.put('cone', p.x, y + h + 2.45, p.z, R1 * 1.9, 1.3, R1 * 1.9, '#b5432f');
        break;
      }
      case 'wall':
        M.flat.local(f, 'box', 0, y + (p.h ?? 1) / 2 - 0.2, 0, p.hu * 2, (p.h ?? 1) + 0.4, 0.6, p.color ?? '#9a958c');
        M.flat.local(f, 'box', 0, y + (p.h ?? 1) + 0.02, 0, p.hu * 2 + 0.1, 0.1, 0.72, p.cap ?? '#b3aea4');
        break;
      case 'reeds':
        for (let k = 0; k < p.n; k++) {
          const a = rng() * 6.3, d = rng() * 0.6, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, gy = G(x, z), hh = 1.1 + rng() * 0.8;
          M.detail.put('box', x, gy + hh / 2, z, 0.04, hh, 0.04, rng() < 0.7 ? '#5e8f3a' : '#7da04a', rng() * 3, (rng() - 0.5) * 0.25);
          if (rng() < 0.4) M.detail.put('cyl', x, gy + hh - 0.08, z, 0.07, 0.24, 0.07, '#6b4a2b');
        }
        break;
      case 'lily': {
        const w = world.waterAt(p.x, p.z);
        if (!w) break;
        const level = world.waterLevel(w, p.x, p.z);
        for (let k = 0; k < p.n; k++) {
          const x = p.x + (rng() - 0.5) * 2, z = p.z + (rng() - 0.5) * 2, d = 0.35 + rng() * 0.35;
          M.detail.put('cyl', x, level + 0.015, z, d, 0.02, d, rng() < 0.5 ? '#4f8f3a' : '#5ea14a');
          if (rng() < 0.2) M.detail.put('smooth', x, level + 0.07, z, 0.14, 0.1, 0.14, '#f2a7c4');
        }
        break;
      }
      default:
        break;
    }
  }

  // ---- tee pads and signs
  const signBoards = [];
  for (const hole of L.holes) {
    const y = world.standHeight(hole.tee.x, hole.tee.z);
    const f = { cx: hole.tee.x, cz: hole.tee.z, cos: Math.cos(hole.teeYaw), sin: Math.sin(hole.teeYaw), ang: hole.teeYaw };
    M.detail.local(f, 'box', 0, y + 0.04, 0, 3.6, 0.12, 1.7, '#59636e');
    M.detail.local(f, 'box', 1.72, y + 0.105, 0, 0.12, 0.02, 1.6, '#ffffff');
    if (!hole.sign) continue;
    const s = hole.sign, gy = G(s.x, s.z);
    const fx = hole.tee.x - s.x - Math.cos(hole.teeYaw) * 3, fz = hole.tee.z - s.z - Math.sin(hole.teeYaw) * 3;
    const face = Math.atan2(fx, fz);
    M.detail.put('box', s.x, gy + 0.85, s.z, 0.1, 1.7, 0.1, '#5a4a3a');
    M.detail.put('box', s.x, gy + 1.45, s.z, 0.98, 1.22, 0.06, '#3b3127', face);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.12), new THREE.MeshLambertMaterial({ map: signTexture(hole) }));
    board.position.set(s.x + Math.sin(face) * 0.035, gy + 1.45, s.z + Math.cos(face) * 0.035);
    board.rotation.y = face;
    signBoards.push(board);
  }

  // ---- merge everything into a handful of meshes
  for (const [k, m] of Object.entries(M)) if (!m.empty) group.add(m.mesh(mats[k], k !== 'glass' && k !== 'glow'));
  for (const s of [...sprites, ...signBoards]) group.add(s);

  const baskets = L.holes.map((hole) => {
    const b = basketMesh(hole.number);
    b.group.position.set(hole.basket.x, world.standHeight(hole.basket.x, hole.basket.z), hole.basket.z);
    group.add(b.group);
    return b;
  });

  // ---- ducks paddling round the lake
  const ducks = L.ducks.map((d) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshLambertMaterial({ color: '#8a6a4a' }));
    body.scale.set(1.4, 0.75, 0.9);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshLambertMaterial({ color: '#2f7a4a' }));
    head.position.set(0.24, 0.17, 0);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), new THREE.MeshLambertMaterial({ color: '#f2a23a' }));
    beak.position.set(0.36, 0.15, 0);
    g.add(body, head, beak);
    const w = world.waterAt(d.x + d.r, d.z);
    d.level = w ? world.waterLevel(w, d.x, d.z) : groundHeight(d.x, d.z);
    group.add(g);
    return { g, d };
  });

  return {
    baskets,
    update(dt, time) {
      mats.glass.emissive.set('#22445a').lerp(_c.set('#ffb860'), U.uGlow.value * 0.85);
      mats.glow.emissiveIntensity = U.uGlow.value * 1.6;
      for (const b of baskets) {
        if (b.shake <= 0) continue;
        b.shake = Math.max(0, b.shake - dt);
        const k = b.shake * b.shake;
        b.chains.rotation.y = Math.sin(time * 30) * 0.12 * k;
        b.chains.position.x = Math.sin(time * 23) * 0.025 * k;
      }
      for (const { g, d } of ducks) {
        const a = d.phase + (time * d.speed) / d.r;
        g.position.set(d.x + Math.cos(a) * d.r, d.level + 0.04 + Math.sin(time * 2 + d.phase) * 0.015, d.z + Math.sin(a) * d.r);
        g.rotation.y = -a - Math.PI / 2;
      }
    },
    shake(index) {
      if (baskets[index]) baskets[index].shake = 1.2;
    },
  };
}

// Things that move: the disc, its tracer and the aim preview. Players live in avatar.js.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISC_RADIUS } from '../sim/flight.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

export function discGeometry() {
  // squat lathe profile: flat plate with a rounded rim
  const r = DISC_RADIUS;
  const pts = [[0, 0.012], [r * 0.82, 0.012], [r * 0.97, 0.004], [r, -0.008], [r * 0.93, -0.014], [r * 0.88, -0.004], [0, 0.002]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28);
}

// A little two-ink club stamp. It stays on the flat part of the original disc, so
// the rim, silhouette and physical size are unchanged. One small texture per disc
// lets each avatar dispose its own artwork along with the rest of its kit.
export function makeDiscMesh(color) {
  const mesh = new THREE.Mesh(discGeometry(), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const cream = '#fff3d5';
  g.strokeStyle = cream; g.fillStyle = cream;
  g.lineWidth = 4;
  g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2;
  g.beginPath(); g.arc(64, 64, 49, 0.45, Math.PI * 1.2); g.stroke();
  // The club's tiny flying saucer: an off-centre star makes the spin legible.
  g.beginPath(); g.ellipse(63, 60, 26, 9, -0.18, 0, Math.PI * 2); g.fill();
  g.lineWidth = 4;
  g.beginPath(); g.ellipse(63, 54, 14, 10, -0.18, Math.PI, Math.PI * 2); g.stroke();
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(36 + i * 8, 74 + i * 3); g.lineTo(45 + i * 8, 72 + i * 3); g.stroke();
  }
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 3 : 9;
    const x = 94 + Math.cos(a) * r, y = 35 + Math.sin(a) * r;
    if (!i) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill();
  g.font = 'bold 10px Trebuchet MS, sans-serif';
  g.textAlign = 'center'; g.fillText('FLIGHT CLUB', 63, 99);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(DISC_RADIUS * 1.62, DISC_RADIUS * 1.62),
    new THREE.MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  stamp.rotation.x = -Math.PI / 2;
  stamp.position.y = 0.0125;
  mesh.add(stamp);
  mesh.castShadow = true;
  return mesh;
}

export class DiscMesh {
  constructor(scene) {
    this.mesh = makeDiscMesh('#ff7a3d');
    this.material = this.mesh.material;
    this.mesh.visible = false;
    this.angle = 0;
    scene.add(this.mesh);
  }

  setColor(color) { this.material.color.set(color); }

  // Discs are tiny at range, so they are drawn larger the farther the camera is.
  update(state, dt, camera) {
    this.mesh.visible = true;
    this.mesh.position.set(state.p.x, state.p.y, state.p.z);
    this.angle += state.spin * dt;
    _q.setFromUnitVectors(UP, _v.set(state.n.x, state.n.y, state.n.z));
    _q2.setFromAxisAngle(UP, this.angle);
    this.mesh.quaternion.copy(_q).multiply(_q2);
    const d = camera.position.distanceTo(this.mesh.position);
    this.mesh.scale.setScalar(THREE.MathUtils.clamp(d / 9, 1, 7));
  }

  hide() { this.mesh.visible = false; }
}

// A fat line that can be rewritten every frame.
class Ribbon {
  constructor(scene, opts) {
    this.material = new LineMaterial({ color: opts.color, linewidth: opts.width, transparent: true, opacity: opts.opacity ?? 1,
      dashed: !!opts.dashed, dashSize: 1.6, gapSize: 1.2, depthWrite: false });
    this.line = new Line2(new LineGeometry(), this.material);
    this.line.frustumCulled = false;
    this.line.visible = false;
    this.dashed = !!opts.dashed;
    scene.add(this.line);
  }

  set(points) {
    if (points.length < 6) { this.line.visible = false; return; }
    this.line.geometry.dispose();
    this.line.geometry = new LineGeometry();
    this.line.geometry.setPositions(points);
    if (this.dashed) this.line.computeLineDistances();
    this.line.visible = true;
  }

  hide() { this.line.visible = false; }
}

export class Tracer extends Ribbon {
  constructor(scene) {
    super(scene, { color: '#ffffff', width: 3.5, opacity: 0.85 });
    this.points = [];
  }

  reset(color) { this.points.length = 0; this.material.color.set(color); this.hide(); }

  push(p) {
    this.points.push(p.x, p.y, p.z);
    this.set(this.points);
  }
}

export class Preview extends Ribbon {
  constructor(scene) {
    super(scene, { color: '#fff4d8', width: 2.5, opacity: 0.8, dashed: true });
    const ring = new THREE.RingGeometry(0.96, 1.08, 40);
    ring.rotateX(-Math.PI / 2);
    // Four little compass ticks give the target a designed, park-map quality.
    const parts = [ring];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const tick = new THREE.BoxGeometry(0.08, 0.002, 0.25);
      tick.rotateY(a).translate(Math.sin(a) * 1.25, 0, Math.cos(a) * 1.25);
      parts.push(tick);
    }
    this.ring = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.9, depthWrite: false }));
    for (const part of parts) part.dispose();
    this.ring.visible = false;
    scene.add(this.ring);
  }

  show(points, landing, y) {
    this.set(points);
    this.ring.visible = true;
    this.ring.position.set(landing.x, y + 0.12, landing.z);
  }

  hide() { super.hide(); if (this.ring) this.ring.visible = false; }
}

// Flat coloured disc left on the ground at each player's lie.
export function makeMarker(scene, color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 20), new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true;
  m.visible = false;
  scene.add(m);
  return m;
}

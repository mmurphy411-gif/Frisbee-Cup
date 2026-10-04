// Things that move: the disc, its tracer and the aim preview. Players live in avatar.js.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { DISC_RADIUS } from '../sim/flight.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

export function discGeometry() {
  // squat lathe profile: flat plate with a rounded rim
  const r = DISC_RADIUS;
  const pts = [[0, 0.012], [r * 0.82, 0.012], [r * 0.97, 0.004], [r, -0.008], [r * 0.93, -0.014], [r * 0.88, -0.004], [0, 0.002]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28);
}

export class DiscMesh {
  constructor(scene) {
    this.material = new THREE.MeshLambertMaterial({ color: '#ff7a3d', side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(discGeometry(), this.material);
    // a stripe so the spin reads
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(DISC_RADIUS * 1.5, 0.004, 0.02), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    stripe.position.y = 0.014;
    this.mesh.add(stripe);
    this.mesh.castShadow = true;
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
    super(scene, { color: '#ffffff', width: 3, opacity: 0.8, dashed: true });
    const ring = new THREE.RingGeometry(0.9, 1.25, 28);
    ring.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false }));
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

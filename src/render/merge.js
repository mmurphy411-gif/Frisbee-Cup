// Collects many small coloured shapes into one big mesh, so a whole street of houses
// or every fence on the course costs a single draw call.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();

const prep = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.computeVertexNormals();
  return n;
};

// Unit shapes: 1 m across and 1 m tall, centred on the origin.
export const SHAPES = {
  box: prep(new THREE.BoxGeometry(1, 1, 1)),
  cyl: prep(new THREE.CylinderGeometry(0.5, 0.5, 1, 10)),
  cyl6: prep(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
  taper: prep(new THREE.CylinderGeometry(0.38, 0.5, 1, 8)),
  cone: prep(new THREE.ConeGeometry(0.5, 1, 10)),
  cone6: prep(new THREE.ConeGeometry(0.5, 1, 6)),
  ball: prep(new THREE.IcosahedronGeometry(0.5, 1)),
  rock: prep(new THREE.IcosahedronGeometry(0.5, 0)),
  smooth: prep(new THREE.SphereGeometry(0.5, 14, 10)),
  torus: prep(new THREE.TorusGeometry(0.5, 0.06, 6, 14)),
};

export class Merge {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.col = [];
  }

  get empty() {
    return this.pos.length === 0;
  }

  add(geo, matrix, color) {
    const p = geo.attributes.position.array, n = geo.attributes.normal.array;
    _nm.getNormalMatrix(matrix);
    _c.set(color);
    for (let i = 0; i < p.length; i += 3) {
      _v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(matrix);
      this.pos.push(_v.x, _v.y, _v.z);
      _v.set(n[i], n[i + 1], n[i + 2]).applyMatrix3(_nm).normalize();
      this.nrm.push(_v.x, _v.y, _v.z);
      this.col.push(_c.r, _c.g, _c.b);
    }
  }

  // A shape centred at (x, y, z), scaled, then turned by yaw (three.js sense), pitch and roll.
  put(shape, x, y, z, sx, sy, sz, color, yaw = 0, pitch = 0, roll = 0) {
    _e.set(pitch, yaw, roll, 'YXZ');
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz));
    this.add(typeof shape === 'string' ? SHAPES[shape] : shape, _m, color);
  }

  // The same, in an object's local frame: u along (cos, sin), w across it.
  local(f, shape, u, y, w, su, sy, sw, color, pitch = 0, roll = 0) {
    this.put(shape, f.cx + u * f.cos - w * f.sin, y, f.cz + u * f.sin + w * f.cos, su, sy, sw, color, -f.ang, pitch, roll);
  }

  // A beam between two world points.
  beam(shape, a, b, thick, color) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
    const len = _a.distanceTo(_b);
    _n.subVectors(_b, _a).normalize();
    _q.setFromUnitVectors(_v.set(0, 1, 0), _n);
    _m.compose(_p.addVectors(_a, _b).multiplyScalar(0.5), _q, _s.set(thick, len, thick));
    this.add(typeof shape === 'string' ? SHAPES[shape] : shape, _m, color);
  }

  // Raw triangles in world space, flat shaded: [x, y, z, x, y, z, x, y, z, ...].
  tris(v, color) {
    _c.set(color);
    for (let i = 0; i < v.length; i += 9) {
      _a.set(v[i + 3] - v[i], v[i + 4] - v[i + 1], v[i + 5] - v[i + 2]);
      _b.set(v[i + 6] - v[i], v[i + 7] - v[i + 1], v[i + 8] - v[i + 2]);
      _n.crossVectors(_a, _b).normalize();
      for (let k = 0; k < 9; k += 3) {
        this.pos.push(v[i + k], v[i + k + 1], v[i + k + 2]);
        this.nrm.push(_n.x, _n.y, _n.z);
        this.col.push(_c.r, _c.g, _c.b);
      }
    }
  }

  mesh(material, shadows = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.castShadow = shadows;
    m.receiveShadow = true;
    return m;
  }
}

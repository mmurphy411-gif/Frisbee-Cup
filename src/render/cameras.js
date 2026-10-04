// Camera rig modelled on golf games: a hole flyover, an over-the-shoulder aim view,
// a chase camera for the flight, a short look at where the disc came to rest, and an
// overhead map view.
import * as THREE from 'three';
import { groundHeight } from '../sim/terrain.js';

const _pos = new THREE.Vector3(), _look = new THREE.Vector3(), _up = new THREE.Vector3(), _anchor = new THREE.Vector3();
const smooth = (rate, dt) => 1 - Math.exp(-rate * dt);

function routeLength(route) {
  let len = 0;
  for (let k = 1; k < route.length; k++) len += Math.hypot(route[k].x - route[k - 1].x, route[k].z - route[k - 1].z);
  return len || 1;
}

// Point at distance s along a polyline, extended straight past either end.
function routeAt(route, s, out) {
  let k = 1;
  for (; k < route.length - 1; k++) {
    const seg = Math.hypot(route[k].x - route[k - 1].x, route[k].z - route[k - 1].z);
    if (s <= seg) break;
    s -= seg;
  }
  const a = route[k - 1], b = route[k];
  const seg = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return out.set(a.x + ((b.x - a.x) / seg) * s, 0, a.z + ((b.z - a.z) / seg) * s);
}

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.mode = 'idle';
    this.look = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.t = 0;
    this.snap = true;
    this.chaseDir = new THREE.Vector3(1, 0, 0);
    // what the player needs to see past nearby scenery for, or null when the view is wide open
    this.sight = new THREE.Vector3();
    this.seeing = false;
  }

  set(mode, data = {}) {
    if (mode === 'chase' && this.mode !== 'chase') this.chaseDir.set(Math.cos(data.yaw), 0, Math.sin(data.yaw));
    this.mode = mode;
    this.data = data;
    this.t = 0;
  }

  cut() { this.snap = true; }

  // Don't let the camera sink into a hillside or sit inside a house or a tree.
  clearOf(pos, anchor) {
    for (let i = 0; i < 6 && this.world.houseAt(pos.x, pos.z); i++) pos.lerp(anchor, 0.3);
    for (let i = 0; i < 6 && this.inFoliage(pos); i++) pos.lerp(anchor, 0.25);
    pos.y = Math.max(pos.y, groundHeight(pos.x, pos.z) + 0.7);
  }

  inFoliage(p) {
    for (const c of this.world.near(p.x, p.z)) {
      const dx = p.x - c.x, dz = p.z - c.z;
      if (c.t === 'canopy') {
        const dy = p.y - c.y, r = c.r + 0.4, ry = c.ry + 0.4;
        if ((dx * dx + dz * dz) / (r * r) + (dy * dy) / (ry * ry) < 1) return true;
      } else if (c.t === 'cone') {
        const f = (c.y1 - p.y) / (c.y1 - c.y0);
        if (f > 0 && f < 1.05 && dx * dx + dz * dz < (c.r * f + 0.4) ** 2) return true;
      }
    }
    return false;
  }

  update(dt) {
    const d = this.data || {};
    this.t += dt;
    let rate = 5;
    this.seeing = this.mode === 'aim' || this.mode === 'chase' || this.mode === 'rest';
    _up.set(0, 1, 0);
    if (this.mode === 'flyover') {
      // sweep down the line of play from above and behind the tee, round any dogleg
      const k = Math.min(1, this.t / d.duration), e = k * k * (3 - 2 * k);
      const len = routeLength(d.route);
      const h = THREE.MathUtils.lerp(30, 15, e);
      routeAt(d.route, THREE.MathUtils.lerp(-26, len - 22, e), _pos);
      _pos.y = Math.max(groundHeight(_pos.x, _pos.z), groundHeight(d.route[0].x, d.route[0].z) * (1 - e)) + h;
      routeAt(d.route, THREE.MathUtils.lerp(len * 0.45, len, e), _look);
      _look.y = groundHeight(_look.x, _look.z) + 1;
      rate = 8;
    } else if (this.mode === 'aim') {
      const cx = Math.cos(d.yaw), cz = Math.sin(d.yaw);
      const back = 4.4, side = 1.0 * (d.side || 1);
      const base = d.y ?? groundHeight(d.x, d.z);
      _pos.set(d.x - cx * back - cz * side * -1, 0, d.z - cz * back + cx * side * -1);
      _pos.y = base + 2.1;
      // tilt the view to follow the ground: down a slope, or up a hill ahead
      const ahead = groundHeight(d.x + cx * 24, d.z + cz * 24);
      let ly = base + 1.2 + Math.tan(d.loft || 0) * 9 + Math.min(0, ahead - base) * 0.45;
      ly = Math.max(ly, ahead + 1.5);
      _look.set(d.x + cx * 24, ly, d.z + cz * 24);
      this.clearOf(_pos, _anchor.set(d.x, base + 2, d.z));
      this.sight.set(d.x + cx * 12, base + 1, d.z + cz * 12); // down the line of play
      rate = 7;
    } else if (this.mode === 'map') {
      // straight down, with the aim line pointing up the screen
      const mx = (d.x + d.tx) / 2, mz = (d.z + d.tz) / 2;
      const span = Math.hypot(d.tx - d.x, d.tz - d.z);
      _pos.set(mx, groundHeight(mx, mz) + Math.max(55, span * 1.25 + 25), mz);
      _look.set(mx, groundHeight(mx, mz), mz);
      _up.set(Math.cos(d.yaw), 0, Math.sin(d.yaw));
      rate = 6;
    } else if (this.mode === 'chase') {
      const p = d.state.p, v = d.state.v;
      const hs = Math.hypot(v.x, v.z);
      if (hs > 2) {
        const k = smooth(2.5, dt);
        this.chaseDir.x += (v.x / hs - this.chaseDir.x) * k;
        this.chaseDir.z += (v.z / hs - this.chaseDir.z) * k;
        this.chaseDir.normalize();
      }
      const dist = 7.5;
      _pos.set(p.x - this.chaseDir.x * dist, p.y + 2.2, p.z - this.chaseDir.z * dist);
      _look.set(p.x + this.chaseDir.x * 4, p.y + 0.2, p.z + this.chaseDir.z * 4);
      this.clearOf(_pos, _look);
      this.sight.set(p.x, p.y, p.z);
      rate = 6;
    } else if (this.mode === 'rest') {
      // slow arc around the disc where it stopped
      const a = d.yaw + Math.PI + 0.5 + this.t * 0.25;
      const base = groundHeight(d.x, d.z);
      _pos.set(d.x + Math.cos(a) * 6.5, Math.max(base, d.y) + 2.6, d.z + Math.sin(a) * 6.5);
      _look.set(d.x, d.y + 0.3, d.z);
      this.clearOf(_pos, _look);
      this.sight.set(d.x, d.y, d.z);
      rate = 3;
    } else if (this.mode === 'orbit') {
      // slow circle over the neighbourhood behind the menu
      const a = this.t * 0.06 + 0.8;
      _pos.set(Math.cos(a) * 150, 78, Math.sin(a) * 120);
      _look.set(0, 6, 0);
      rate = 4;
    } else {
      return;
    }
    if (this.snap) {
      this.camera.position.copy(_pos);
      this.look.copy(_look);
      this.up.copy(_up);
      this.snap = false;
    } else {
      const k = smooth(rate, dt);
      this.camera.position.lerp(_pos, k);
      this.look.lerp(_look, k);
      this.up.lerp(_up, k).normalize();
    }
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.look);
  }
}

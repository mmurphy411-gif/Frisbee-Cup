// Little bursts of life: dust where a disc lands, splashes and rings on water, leaves
// knocked out of trees, confetti for a birdie, and leaves drifting down in autumn.
import * as THREE from 'three';

const MAX = 900;

const VERT = /* glsl */ `
attribute float size;
attribute float alpha;
attribute vec3 tint;
attribute vec2 shape;
varying float vAlpha;
varying vec3 vTint;
varying vec2 vShape;
uniform float uScale;
void main() {
  vAlpha = alpha;
  vTint = tint;
  vShape = shape;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = size * uScale / max( -mv.z, 0.1 );
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;
varying vec2 vShape;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot( d, d );
  float cover;
  if ( vShape.x > 2.5 ) {
    // Paper confetti and little almond-shaped leaves, in the existing point batch.
    float c = cos( vShape.y ), s = sin( vShape.y );
    vec2 p = mat2( c, -s, s, c ) * d;
    if ( vShape.x > 3.5 ) {
      vec2 edge = abs( p ) - vec2( 0.26, 0.42 );
      cover = 1.0 - smoothstep( -0.025, 0.015, max( edge.x, edge.y ) );
    } else {
      float leaf = abs( p.x ) / 0.25 + p.y * p.y / 0.19;
      cover = 1.0 - smoothstep( 0.87, 1.0, leaf );
    }
  } else {
    cover = 1.0 - smoothstep( 0.12, 0.25, r );
  }
  if ( cover < 0.01 ) discard;
  gl_FragColor = vec4( vTint, vAlpha * cover );
  #include <colorspace_fragment>
}`;

const _c = new THREE.Color();

export class Effects {
  constructor(scene) {
    this.p = Array.from({ length: MAX }, () => ({ life: 0 }));
    this.next = 0;
    const g = (this.geo = new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAX), 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAX), 1));
    g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    g.setAttribute('shape', new THREE.BufferAttribute(new Float32Array(MAX * 2), 2));
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 400 } },
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.rings = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, opacity: 0 }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      return { m, t: 0 };
    });
    this.ambient = null;
    this.ambientT = 0;
  }

  spawn(x, y, z, vx, vy, vz, life, size, color, kind = 0) {
    const q = this.p[this.next];
    this.next = (this.next + 1) % MAX;
    Object.assign(q, { x, y, z, vx, vy, vz, life, max: life, size, kind, ph: Math.random() * 6.3 });
    _c.set(color);
    q.r = _c.r; q.g = _c.g; q.b = _c.b;
  }

  dust(x, y, z, strength, color = '#b8a07a') {
    const n = Math.round(6 + strength * 12);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.3, s = 0.4 + Math.random() * strength;
      this.spawn(x, y + 0.05, z, Math.cos(a) * s, 0.4 + Math.random() * 0.8, Math.sin(a) * s, 0.6 + Math.random() * 0.5, 0.18 + Math.random() * 0.2, color, 1);
    }
  }

  splash(x, y, z, strength = 1) {
    for (let i = 0; i < 26 + strength * 10; i++) {
      const a = Math.random() * 6.3, s = 0.4 + Math.random() * 1.6;
      this.spawn(x, y + 0.05, z, Math.cos(a) * s, 2 + Math.random() * 2.5 * strength, Math.sin(a) * s, 0.8 + Math.random() * 0.4, 0.07 + Math.random() * 0.08, Math.random() < 0.5 ? '#ffffff' : '#bfe6ff', 2);
    }
    let k = 0;
    for (const r of this.rings) {
      if (r.t > 0) continue;
      r.m.position.set(x, y + 0.03, z);
      r.t = 1.6 + k * 0.35;
      r.m.visible = true;
      if (++k === 2) break;
    }
  }

  leaves(x, y, z, colors, amount = 10) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * 6.3, s = 0.5 + Math.random() * 1.5;
      this.spawn(x, y, z, Math.cos(a) * s, 0.5 + Math.random() * 1.5, Math.sin(a) * s, 2.5 + Math.random() * 1.5, 0.1 + Math.random() * 0.07, colors[i % colors.length], 3);
    }
  }

  confetti(x, y, z) {
    const colors = ['#ec764a', '#609baf', '#f2cc67', '#a694bc', '#638b65', '#fff5dc', '#d88690'];
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * 6.3, s = Math.random() * 2.2;
      this.spawn(x, y + 1.5, z, Math.cos(a) * s, 3 + Math.random() * 4, Math.sin(a) * s, 2.4 + Math.random() * 1.2, 0.12 + Math.random() * 0.07, colors[i % colors.length], 4);
    }
  }

  // Autumn: a few leaves always drifting down somewhere near the camera.
  setAmbient(colors, kind = 3) {
    this.ambient = colors;
    this.ambientKind = kind;
  }

  update(dt, camera, viewportHeight, wind) {
    if (this.ambient) {
      this.ambientT -= dt;
      while (this.ambientT <= 0) {
        this.ambientT += 0.09;
        const a = Math.random() * 6.3, d = 4 + Math.random() * 22;
        const x = camera.position.x + Math.cos(a) * d, z = camera.position.z + Math.sin(a) * d;
        this.spawn(x, camera.position.y + 3 + Math.random() * 7, z, 0, -0.3, 0, 6 + Math.random() * 3, 0.1 + Math.random() * 0.05,
          this.ambient[Math.floor(Math.random() * this.ambient.length)], this.ambientKind);
      }
    }
    const pos = this.geo.attributes.position.array, size = this.geo.attributes.size.array;
    const alpha = this.geo.attributes.alpha.array, tint = this.geo.attributes.tint.array;
    const shape = this.geo.attributes.shape.array;
    const wx = wind?.x || 0, wz = wind?.z || 0;
    let live = 0;
    for (let i = 0; i < MAX; i++) {
      const q = this.p[i];
      if (q.life <= 0) { alpha[i] = 0; continue; }
      q.life -= dt;
      const k = Math.max(0, q.life / q.max);
      live++;
      if (q.kind === 1) {
        // dust: drifts up and spreads, slowing quickly
        q.vx *= 1 - 2.5 * dt; q.vz *= 1 - 2.5 * dt; q.vy *= 1 - 2 * dt;
        q.size += dt * 0.5;
      } else if (q.kind === 2) {
        q.vy -= 9.8 * dt; // droplets
      } else {
        // leaves and confetti: flutter down on the breeze
        q.vy = Math.max(q.vy - 4 * dt, -0.7 - 0.2 * Math.sin(q.ph));
        q.vx += (wx * 0.4 - q.vx) * dt + Math.sin(q.life * 4 + q.ph) * 1.6 * dt;
        q.vz += (wz * 0.4 - q.vz) * dt + Math.cos(q.life * 3.3 + q.ph) * 1.6 * dt;
      }
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
      size[i] = q.size;
      alpha[i] = q.kind === 1 ? 0.5 * k : Math.min(1, k * 3);
      tint[i * 3] = q.r; tint[i * 3 + 1] = q.g; tint[i * 3 + 2] = q.b;
      shape[i * 2] = q.kind;
      shape[i * 2 + 1] = q.ph + q.life * (q.kind === 4 ? 4 : 1.8);
    }
    this.points.visible = live > 0;
    for (const a of ['position', 'size', 'alpha', 'tint', 'shape']) this.geo.attributes[a].needsUpdate = true;
    this.points.material.uniforms.uScale.value = viewportHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));

    for (const r of this.rings) {
      if (r.t <= 0) continue;
      r.t -= dt;
      const age = 1.6 - Math.min(r.t, 1.6);
      if (r.t > 1.6) continue; // delayed second ring
      r.m.scale.setScalar(0.3 + age * 1.6);
      r.m.material.opacity = Math.max(0, r.t / 1.6) * 0.7;
      if (r.t <= 0) r.m.visible = false;
    }
  }
}
